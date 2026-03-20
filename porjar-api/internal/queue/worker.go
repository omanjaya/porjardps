package queue

import (
	"context"
	"fmt"
	"log/slog"
	"math"
	"time"
)

// JobProcessor is implemented by MatchSubmissionService to process dequeued jobs.
type JobProcessor interface {
	ProcessBracketSubmission(ctx context.Context, job SubmissionJob) error
	ProcessBRSubmission(ctx context.Context, job SubmissionJob) error
}

// SubmissionWorker runs a pool of goroutines that consume from SubmissionQueue and
// delegate to a JobProcessor. Concurrency is bounded to workerCount so that the CPU
// cannot spike even under a thundering-herd of submissions.
type SubmissionWorker struct {
	queue       *SubmissionQueue
	workerCount int
	processor   JobProcessor
}

// NewSubmissionWorker creates a SubmissionWorker. workerCount defaults to 10 if <= 0.
func NewSubmissionWorker(queue *SubmissionQueue, processor JobProcessor, workerCount int) *SubmissionWorker {
	if workerCount <= 0 {
		workerCount = 10
	}
	return &SubmissionWorker{
		queue:       queue,
		workerCount: workerCount,
		processor:   processor,
	}
}

// Start launches workerCount goroutines and blocks until ctx is cancelled.
// Each goroutine reads batches from the queue, processes jobs, and ACKs on success
// or retries with exponential back-off before NACKing to the dead-letter stream.
func (w *SubmissionWorker) Start(ctx context.Context) {
	slog.Info("submission worker pool starting", "workers", w.workerCount)

	done := make(chan struct{}, w.workerCount)

	for i := 0; i < w.workerCount; i++ {
		go func(workerID int) {
			defer func() { done <- struct{}{} }()
			consumerName := fmt.Sprintf("worker-%d", workerID)
			w.runWorker(ctx, consumerName)
		}(i)
	}

	// Wait for all goroutines to finish (they exit when ctx is cancelled)
	for i := 0; i < w.workerCount; i++ {
		<-done
	}

	slog.Info("submission worker pool stopped")
}

// runWorker is the main loop for a single worker goroutine.
func (w *SubmissionWorker) runWorker(ctx context.Context, consumerName string) {
	slog.Debug("submission worker started", "consumer", consumerName)

	for {
		select {
		case <-ctx.Done():
			slog.Debug("submission worker stopping", "consumer", consumerName)
			return
		default:
		}

		jobs, err := w.queue.ReadBatch(ctx, consumerName, 10)
		if err != nil {
			// Log and back off briefly before retrying so we don't spin-loop on Redis errors.
			slog.Error("submission worker: read batch failed", "consumer", consumerName, "error", err)
			select {
			case <-ctx.Done():
				return
			case <-time.After(2 * time.Second):
			}
			continue
		}

		for _, job := range jobs {
			w.processWithRetry(ctx, job)
		}
	}
}

// processWithRetry attempts to process a job up to maxRetries times with exponential
// back-off. On final failure the job is sent to the dead-letter queue via Nack.
func (w *SubmissionWorker) processWithRetry(ctx context.Context, job SubmissionJob) {
	const maxRetries = 3

	var lastErr error
	for attempt := 1; attempt <= maxRetries; attempt++ {
		if err := w.dispatch(ctx, job); err != nil {
			lastErr = err
			slog.Warn("submission worker: job failed, will retry",
				"job_id", job.JobID,
				"type", job.Type,
				"match_id", job.MatchID,
				"attempt", attempt,
				"max", maxRetries,
				"error", err,
			)

			if attempt < maxRetries {
				// Exponential back-off: 1s, 2s, 4s …
				backoff := time.Duration(math.Pow(2, float64(attempt-1))) * time.Second
				select {
				case <-ctx.Done():
					// Context cancelled during back-off — give up without NACKing so the
					// message stays pending and is re-delivered after restart.
					return
				case <-time.After(backoff):
				}
			}
			continue
		}

		// Success
		if err := w.queue.Ack(ctx, job.JobID); err != nil {
			slog.Error("submission worker: ack failed",
				"job_id", job.JobID,
				"error", err,
			)
		} else {
			slog.Info("submission worker: job processed",
				"job_id", job.JobID,
				"type", job.Type,
				"match_id", job.MatchID,
			)
		}
		return
	}

	// All retries exhausted — move to dead-letter queue
	slog.Error("submission worker: job exhausted retries, sending to DLQ",
		"job_id", job.JobID,
		"type", job.Type,
		"match_id", job.MatchID,
		"error", lastErr,
	)
	nackCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if nackErr := w.queue.Nack(nackCtx, job, lastErr.Error()); nackErr != nil {
		slog.Error("submission worker: nack failed",
			"job_id", job.JobID,
			"error", nackErr,
		)
	}
}

// dispatch routes a job to the correct processor method based on its Type field.
func (w *SubmissionWorker) dispatch(ctx context.Context, job SubmissionJob) error {
	switch job.Type {
	case "bracket":
		return w.processor.ProcessBracketSubmission(ctx, job)
	case "br_lobby":
		return w.processor.ProcessBRSubmission(ctx, job)
	default:
		return fmt.Errorf("unknown job type: %q", job.Type)
	}
}
