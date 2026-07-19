// Package proxy builds reverse proxies to backend services, optionally
// rewriting the request path before forwarding.
package proxy

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
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

	return proxy
}
