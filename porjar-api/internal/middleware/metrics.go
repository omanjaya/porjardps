package middleware

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	// httpRequestsTotal counts all HTTP requests by method, path and status code.
	httpRequestsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total number of HTTP requests processed, partitioned by method, path and status.",
		},
		[]string{"method", "path", "status"},
	)

	// httpRequestDuration tracks request latency as a histogram.
	httpRequestDuration = promauto.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "http_request_duration_seconds",
			Help:    "Duration of HTTP requests in seconds, partitioned by method and path.",
			Buckets: prometheus.DefBuckets, // .005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10
		},
		[]string{"method", "path"},
	)

	// WSConnectionsActive is a gauge that tracks live WebSocket connections.
	// Callers (ws package / main) should call WSConnectionsActive.Set(...) whenever
	// the connection count changes.  The middleware itself cannot observe this directly.
	WSConnectionsActive = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "ws_connections_active",
		Help: "Current number of active WebSocket connections.",
	})

	// SubmissionQueueDepth is a gauge reflecting the Redis Streams backlog length.
	SubmissionQueueDepth = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "submission_queue_depth",
		Help: "Current depth of the submission processing queue.",
	})

	// DBPoolOpenConnections tracks how many pgxpool connections are open.
	DBPoolOpenConnections = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "db_pool_open_connections",
		Help: "Number of open connections in the database connection pool.",
	})
)

// PrometheusMetrics returns a Fiber middleware that records per-request metrics.
// High-cardinality paths (e.g. /uploads/*) are normalised to avoid blowing up
// the label set.  The /metrics endpoint itself is excluded from recording.
func PrometheusMetrics() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Skip recording metrics for the metrics endpoint itself.
		if c.Path() == "/metrics" {
			return c.Next()
		}

		start := time.Now()
		err := c.Next()
		elapsed := time.Since(start).Seconds()

		path := normalisePath(c)
		method := c.Method()
		status := strconv.Itoa(c.Response().StatusCode())

		httpRequestsTotal.WithLabelValues(method, path, status).Inc()
		httpRequestDuration.WithLabelValues(method, path).Observe(elapsed)

		return err
	}
}

// normalisePath collapses high-cardinality path segments (UUIDs, numeric IDs,
// file names) into a stable label value so the Prometheus label set stays bounded.
func normalisePath(c *fiber.Ctx) string {
	// Fiber exposes the matched route template (e.g. /api/v1/teams/:id) on the
	// route object; use that when available so we get clean labels automatically.
	if route := c.Route(); route != nil && route.Path != "" {
		return route.Path
	}
	// Fallback: return the raw path (acceptable for simple / health / metrics).
	return c.Path()
}
