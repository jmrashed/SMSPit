package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"
)

// PerTenantRateLimiter enforces a fixed-window request quota per tenant
// (organization, falling back to the API key owner when a key isn't
// attached to an org). It must run after RequireAPIKey, which is what
// populates X-Org-Id / X-Owner-Id.
type PerTenantRateLimiter struct {
	Limit  int
	Window time.Duration

	mu      sync.Mutex
	buckets map[string]*window
}

type window struct {
	count   int
	resetAt time.Time
}

// NewPerTenantRateLimiter builds a limiter allowing up to limit requests
// per window for each tenant key.
func NewPerTenantRateLimiter(limit int, windowDuration time.Duration) *PerTenantRateLimiter {
	return &PerTenantRateLimiter{
		Limit:   limit,
		Window:  windowDuration,
		buckets: make(map[string]*window),
	}
}

// Middleware rejects requests over the tenant's quota with 429, and adds
// Retry-After. Tenants with no resolved identity (shouldn't happen once
// RequireAPIKey has run) share a single "anonymous" bucket.
func (rl *PerTenantRateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		key := tenantKey(r)

		allowed, retryAfter := rl.allow(key)
		if !allowed {
			w.Header().Set("Retry-After", strconv.Itoa(int(retryAfter.Seconds())+1))
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			_, _ = w.Write([]byte(`{"code":"RATE_LIMITED","message":"Too many requests for this organization","details":null}`))
			return
		}

		next.ServeHTTP(w, r)
	})
}

func tenantKey(r *http.Request) string {
	if orgID := r.Header.Get("X-Org-Id"); orgID != "" {
		return "org:" + orgID
	}
	if ownerID := r.Header.Get("X-Owner-Id"); ownerID != "" {
		return "owner:" + ownerID
	}
	return "anonymous"
}

func (rl *PerTenantRateLimiter) allow(key string) (bool, time.Duration) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	b, ok := rl.buckets[key]
	if !ok || now.After(b.resetAt) {
		b = &window{count: 0, resetAt: now.Add(rl.Window)}
		rl.buckets[key] = b
	}

	if b.count >= rl.Limit {
		return false, time.Until(b.resetAt)
	}

	b.count++
	return true, 0
}
