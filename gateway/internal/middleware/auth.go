// Package middleware holds chi-compatible HTTP middleware for the gateway.
package middleware

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/jmrashed/SMSPit/gateway/internal/auth"
)

// RequireAPIKey validates the Authorization header against auth-service
// before letting a request through, and forwards the resolved identity
// downstream via X-Api-Key-Id / X-Owner-Id / X-Api-Key-Scopes headers.
func RequireAPIKey(client *auth.Client) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authorization := r.Header.Get("Authorization")

			if authorization == "" {
				writeUnauthorized(w, "Missing Authorization header")
				return
			}

			key := client.Validate(authorization)
			if key == nil {
				writeUnauthorized(w, "Invalid or revoked API key")
				return
			}

			r.Header.Set("X-Api-Key-Id", strconv.Itoa(key.ID))
			r.Header.Set("X-Owner-Id", strconv.Itoa(key.OwnerID))
			r.Header.Set("X-Api-Key-Scopes", strings.Join(key.Scopes, ","))

			next.ServeHTTP(w, r)
		})
	}
}

func writeUnauthorized(w http.ResponseWriter, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_, _ = w.Write([]byte(`{"code":"UNAUTHORIZED","message":"` + message + `","details":null}`))
}
