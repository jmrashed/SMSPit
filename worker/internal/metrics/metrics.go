// Package metrics exposes Prometheus counters/histograms (Day 84) at
// GET /metrics on a small dedicated HTTP server -- worker otherwise has
// no HTTP surface (it's a background Redis Streams consumer, Day 78).
package metrics

import (
	"context"
	"log"
	"net/http"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	MessagesProcessedTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "worker_messages_processed_total",
		Help: "Total messages consumed from the queue, by outcome.",
	}, []string{"outcome"}) // outcome: "success" | "error"

	ProcessingDuration = promauto.NewHistogram(prometheus.HistogramOpts{
		Name:    "worker_message_processing_duration_seconds",
		Help:    "Time spent processing a single queue entry, including the ai-service call.",
		Buckets: prometheus.DefBuckets,
	})
)

// Serve starts the /metrics HTTP server and blocks until ctx is
// cancelled. Run it in its own goroutine.
func Serve(ctx context.Context, addr string) {
	mux := http.NewServeMux()
	mux.Handle("/metrics", promhttp.Handler())
	server := &http.Server{Addr: addr, Handler: mux}

	go func() {
		<-ctx.Done()
		_ = server.Close()
	}()

	log.Printf("worker: /metrics listening on %s", addr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Printf("worker: metrics server error: %v", err)
	}
}
