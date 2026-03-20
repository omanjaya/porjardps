package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// StreamKey is the Redis Stream key for submission jobs.
const (
	StreamKey         = "porjar:submission_stream"
	ConsumerGroupName = "submission_workers"
	DeadLetterKey     = "porjar:submission_dlq"
)

// SubmissionJob represents a single submission task enqueued to the Redis Stream.
// JobID is populated by Redis (stream message ID) on read; it is also used as an
// idempotency key so duplicate deliveries of the same message are safe to discard.
type SubmissionJob struct {
	JobID         string    `json:"job_id"`          // Redis stream message ID (set after read)
	Type          string    `json:"type"`            // "bracket" or "br_lobby"
	MatchID       string    `json:"match_id"`        // bracket_match_id or br_lobby_id
	TeamID        string    `json:"team_id"`
	SubmittedByID string    `json:"submitted_by_id"`
	Payload       string    `json:"payload"`         // JSON-encoded submission fields
	EnqueuedAt    time.Time `json:"enqueued_at"`
}

// SubmissionQueue wraps Redis Streams to provide an async submission processing queue.
// Producer: Enqueue
// Consumer: worker pool reads with XREADGROUP, processes, ACKs
type SubmissionQueue struct {
	rdb *redis.Client
}

// NewSubmissionQueue creates a new SubmissionQueue backed by the given Redis client.
func NewSubmissionQueue(rdb *redis.Client) *SubmissionQueue {
	return &SubmissionQueue{rdb: rdb}
}

// EnsureConsumerGroup creates the consumer group if it does not yet exist (idempotent).
// It also creates the stream itself via MKSTREAM so that XREADGROUP can work even
// before any messages have been produced.
func (q *SubmissionQueue) EnsureConsumerGroup(ctx context.Context) error {
	err := q.rdb.XGroupCreateMkStream(ctx, StreamKey, ConsumerGroupName, "0").Err()
	if err != nil && err.Error() != "BUSYGROUP Consumer Group name already exists" {
		return fmt.Errorf("ensure consumer group: %w", err)
	}
	return nil
}

// Enqueue adds a SubmissionJob to the stream. It returns the Redis stream message ID
// which serves as the job's unique identifier.
func (q *SubmissionQueue) Enqueue(ctx context.Context, job SubmissionJob) (string, error) {
	job.EnqueuedAt = time.Now()

	payloadBytes, err := json.Marshal(job)
	if err != nil {
		return "", fmt.Errorf("enqueue: marshal job: %w", err)
	}

	msgID, err := q.rdb.XAdd(ctx, &redis.XAddArgs{
		Stream: StreamKey,
		MaxLen: 100000, // cap stream length to avoid unbounded growth
		Approx: true,
		Values: map[string]interface{}{
			"data": string(payloadBytes),
		},
	}).Result()
	if err != nil {
		return "", fmt.Errorf("enqueue: xadd: %w", err)
	}

	return msgID, nil
}

// ReadBatch reads up to batchSize new (undelivered) messages from the stream for
// the given consumer. It blocks for up to 2 000 ms waiting for messages.
// Returns an empty slice (not an error) when no messages arrive within the block window.
func (q *SubmissionQueue) ReadBatch(ctx context.Context, consumerName string, batchSize int) ([]SubmissionJob, error) {
	streams, err := q.rdb.XReadGroup(ctx, &redis.XReadGroupArgs{
		Group:    ConsumerGroupName,
		Consumer: consumerName,
		Streams:  []string{StreamKey, ">"},
		Count:    int64(batchSize),
		Block:    2000 * time.Millisecond,
		NoAck:    false,
	}).Result()
	if err != nil {
		// redis.Nil is returned when the block timeout expires with no messages — not an error.
		if err == redis.Nil {
			return nil, nil
		}
		return nil, fmt.Errorf("read batch: xreadgroup: %w", err)
	}

	var jobs []SubmissionJob
	for _, stream := range streams {
		for _, msg := range stream.Messages {
			raw, ok := msg.Values["data"].(string)
			if !ok {
				continue
			}
			var job SubmissionJob
			if err := json.Unmarshal([]byte(raw), &job); err != nil {
				continue
			}
			job.JobID = msg.ID // populate the stream message ID as the job ID
			jobs = append(jobs, job)
		}
	}

	return jobs, nil
}

// Ack acknowledges a successfully processed message, removing it from the pending list.
func (q *SubmissionQueue) Ack(ctx context.Context, jobID string) error {
	if err := q.rdb.XAck(ctx, StreamKey, ConsumerGroupName, jobID).Err(); err != nil {
		return fmt.Errorf("ack: xack %s: %w", jobID, err)
	}
	return nil
}

// Nack moves a failed message to the dead-letter stream (DeadLetterKey) after too many
// retries, and acknowledges it on the main stream so it is no longer re-delivered.
func (q *SubmissionQueue) Nack(ctx context.Context, job SubmissionJob, reason string) error {
	type dlqEntry struct {
		OriginalJobID string    `json:"original_job_id"`
		Job           SubmissionJob `json:"job"`
		Reason        string    `json:"reason"`
		FailedAt      time.Time `json:"failed_at"`
	}

	entry := dlqEntry{
		OriginalJobID: job.JobID,
		Job:           job,
		Reason:        reason,
		FailedAt:      time.Now(),
	}

	entryBytes, err := json.Marshal(entry)
	if err != nil {
		return fmt.Errorf("nack: marshal dlq entry: %w", err)
	}

	// Write to dead-letter stream
	if err := q.rdb.XAdd(ctx, &redis.XAddArgs{
		Stream: DeadLetterKey,
		MaxLen: 10000,
		Approx: true,
		Values: map[string]interface{}{
			"data": string(entryBytes),
		},
	}).Err(); err != nil {
		return fmt.Errorf("nack: xadd dlq: %w", err)
	}

	// Acknowledge on the main stream so it is no longer pending
	if err := q.Ack(ctx, job.JobID); err != nil {
		return fmt.Errorf("nack: ack original: %w", err)
	}

	return nil
}

// Depth returns the current number of messages in the stream (approximate).
func (q *SubmissionQueue) Depth(ctx context.Context) (int64, error) {
	n, err := q.rdb.XLen(ctx, StreamKey).Result()
	if err != nil {
		return 0, fmt.Errorf("depth: xlen: %w", err)
	}
	return n, nil
}
