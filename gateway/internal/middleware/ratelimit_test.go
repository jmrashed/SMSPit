package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestPerTenantRateLimiterBlocksOverQuota(t *testing.T) {
	rl := NewPerTenantRateLimiter(2, time.Minute)
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := rl.Middleware(next)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/messages", nil)
	req.Header.Set("X-Org-Id", "7")

	for i := 0; i < 2; i++ {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("request %d: expected 200, got %d", i+1, rec.Code)
		}
	}

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429 once over quota, got %d", rec.Code)
	}
	if rec.Header().Get("Retry-After") == "" {
		t.Error("expected Retry-After header on 429 response")
	}
}

func TestPerTenantRateLimiterIsolatesTenants(t *testing.T) {
	rl := NewPerTenantRateLimiter(1, time.Minute)
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := rl.Middleware(next)

	reqOrgA := httptest.NewRequest(http.MethodGet, "/api/v1/messages", nil)
	reqOrgA.Header.Set("X-Org-Id", "1")
	reqOrgB := httptest.NewRequest(http.MethodGet, "/api/v1/messages", nil)
	reqOrgB.Header.Set("X-Org-Id", "2")

	recA := httptest.NewRecorder()
	handler.ServeHTTP(recA, reqOrgA)
	if recA.Code != http.StatusOK {
		t.Fatalf("org 1 first request: expected 200, got %d", recA.Code)
	}

	// Org 1 is now at quota, but org 2 must be unaffected.
	recB := httptest.NewRecorder()
	handler.ServeHTTP(recB, reqOrgB)
	if recB.Code != http.StatusOK {
		t.Fatalf("org 2 first request: expected 200, got %d", recB.Code)
	}

	recAAgain := httptest.NewRecorder()
	handler.ServeHTTP(recAAgain, reqOrgA)
	if recAAgain.Code != http.StatusTooManyRequests {
		t.Fatalf("org 1 second request: expected 429, got %d", recAAgain.Code)
	}
}

func TestPerTenantRateLimiterResetsAfterWindow(t *testing.T) {
	rl := NewPerTenantRateLimiter(1, 50*time.Millisecond)
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := rl.Middleware(next)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/messages", nil)
	req.Header.Set("X-Owner-Id", "9")

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	time.Sleep(60 * time.Millisecond)

	rec = httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected quota to reset after window, got %d", rec.Code)
	}
}
