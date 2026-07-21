// Package metrics exposes Prometheus counters/histograms (Day 84) at
// GET /metrics, in addition to the OpenTelemetry tracing added Day 83 --
// separate systems (metrics vs. traces), both useful, neither replacing
// the other.
package metrics

import (
	"bufio"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	RequestsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "gateway_http_requests_total",
		Help: "Total HTTP requests handled by the gateway.",
	}, []string{"method", "route", "status"})

	RequestDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "gateway_http_request_duration_seconds",
		Help:    "HTTP request duration in seconds.",
		Buckets: prometheus.DefBuckets,
	}, []string{"method", "route"})
)

// Handler returns the /metrics endpoint's handler.
func Handler() http.Handler {
	return promhttp.Handler()
}

// Middleware records RequestsTotal/RequestDuration for every request.
// Must be registered via chi's r.Use() (not wrapped around the whole
// router) -- it reads the matched route pattern from chi's RouteContext
// after next.ServeHTTP returns, which is only populated by the time a
// chi middleware's "after" phase runs, not for a handler wrapping chi
// from the outside.
func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &statusRecorder{ResponseWriter: w, status: http.StatusOK}

		next.ServeHTTP(rw, r)

		route := routePattern(r)
		duration := time.Since(start).Seconds()
		RequestsTotal.WithLabelValues(r.Method, route, strconv.Itoa(rw.status)).Inc()
		RequestDuration.WithLabelValues(r.Method, route).Observe(duration)
	})
}

func routePattern(r *http.Request) string {
	if rctx := chi.RouteContext(r.Context()); rctx != nil {
		if pattern := rctx.RoutePattern(); pattern != "" {
			return pattern
		}
	}
	return "unmatched"
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

// Hijack delegates to the underlying ResponseWriter's Hijacker -- without
// this, the WebSocket proxy route (/ws) breaks: httputil.ReverseProxy
// hijacks the connection to pass through the Upgrade handshake, and a
// wrapping ResponseWriter that doesn't forward Hijacker fails that with
// "can't switch protocols using non-Hijacker ResponseWriter type".
func (r *statusRecorder) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	hijacker, ok := r.ResponseWriter.(http.Hijacker)
	if !ok {
		return nil, nil, fmt.Errorf("underlying ResponseWriter does not support hijacking")
	}
	return hijacker.Hijack()
}

// Flush delegates to the underlying ResponseWriter's Flusher, so
// streamed responses (e.g. the export endpoint proxied through here)
// still flush incrementally instead of buffering behind this wrapper.
func (r *statusRecorder) Flush() {
	if flusher, ok := r.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}
