// Package proxy builds reverse proxies to backend services, optionally
// rewriting the request path before forwarding.
package proxy

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

// New returns a reverse proxy to target. If stripPrefix is non-empty, it is
// removed from the front of the incoming request path before forwarding; if
// addPrefix is non-empty, it is then added in its place.
func New(target string, stripPrefix string, addPrefix string) http.Handler {
	targetURL, err := url.Parse(target)
	if err != nil {
		log.Fatalf("proxy: invalid target URL %q: %v", target, err)
	}

	proxy := httputil.NewSingleHostReverseProxy(targetURL)
	// Propagates the inbound request's trace context (W3C traceparent
	// header) onto the outgoing proxied request, and records a span for
	// the upstream call -- this is what makes a trace continuous across
	// gateway -> sms-service/auth-service (Day 83).
	proxy.Transport = otelhttp.NewTransport(http.DefaultTransport)

	originalDirector := proxy.Director
	proxy.Director = func(r *http.Request) {
		if stripPrefix != "" {
			r.URL.Path = strings.TrimPrefix(r.URL.Path, stripPrefix)
			if !strings.HasPrefix(r.URL.Path, "/") {
				r.URL.Path = "/" + r.URL.Path
			}
		}
		if addPrefix != "" {
			r.URL.Path = addPrefix + r.URL.Path
		}
		originalDirector(r)
	}

	proxy.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
		log.Printf("proxy error forwarding to %s: %v", target, err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadGateway)
		_, _ = w.Write([]byte(`{"code":"BAD_GATEWAY","message":"upstream service unavailable","details":null}`))
	}

	// Backends (sms-service) set their own CORS headers for when they're
	// reached directly. The gateway's own CORS middleware sets them too --
	// left alone, a proxied response would carry both, and a header
	// repeated across two lines is invalid CORS (browsers require exactly
	// one Access-Control-Allow-Origin value) and gets rejected. The
	// gateway is the single source of truth for CORS once a request comes
	// through it, so strip whatever the backend set before its own
	// middleware adds the real one.
	proxy.ModifyResponse = func(resp *http.Response) error {
		for header := range resp.Header {
			if strings.HasPrefix(strings.ToLower(header), "access-control-") {
				resp.Header.Del(header)
			}
		}
		return nil
	}

	return proxy
}
