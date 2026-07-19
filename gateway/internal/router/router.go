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

	return r
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"ok"}`))
}
