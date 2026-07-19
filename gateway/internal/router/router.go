package router

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/jmrashed/SMSPit/gateway/config"
	"github.com/jmrashed/SMSPit/gateway/internal/auth"
	gwmiddleware "github.com/jmrashed/SMSPit/gateway/internal/middleware"
	"github.com/jmrashed/SMSPit/gateway/internal/proxy"
)

func New(cfg config.Config) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/healthz", healthCheck)

	authClient := auth.NewClient(cfg.AuthServiceURL)

	// sms-service already serves its API under /api/v1, so the path is
	// forwarded unchanged. Mirrors sms-service's own ApiKeyGuard, which
	// only protects its /messages routes, not health/root.
	r.With(gwmiddleware.RequireAPIKey(authClient)).Handle("/api/v1/*", proxy.New(cfg.SMSServiceURL, "", ""))

	// auth-service's routes/api.php is mounted at /api by Laravel, so
	// gateway's /auth/* is rewritten to /api/* before forwarding. Left
	// unguarded here: it includes key generation (which can't require a
	// key) and the validate endpoint this middleware itself calls.
	r.Handle("/auth/*", proxy.New(cfg.AuthServiceURL, "/auth", "/api"))

	// sms-service's WebSocket gateway (Day 45) lives at /ws, outside the
	// /api/v1 prefix. httputil.ReverseProxy hijacks and passes through
	// Upgrade requests transparently, so the same proxy works unmodified.
	// Left unguarded like sms-service's own WS gateway: browsers can't
	// set an Authorization header on a WS handshake, so auth happens via
	// the ?token= query param at the sms-service layer instead.
	r.Handle("/ws", proxy.New(cfg.SMSServiceURL, "", ""))

	return r
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}
