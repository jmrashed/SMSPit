package router

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/jmrashed/SMSPit/gateway/config"
)

func TestHealthCheck(t *testing.T) {
	r := New(config.Config{SMSServiceURL: "http://example.invalid", AuthServiceURL: "http://example.invalid"})

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
}

func TestRoutesToSMSService(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		if req.URL.Path != "/api/v1/messages" {
			t.Errorf("expected path /api/v1/messages forwarded unchanged, got %s", req.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	r := New(config.Config{SMSServiceURL: backend.URL, AuthServiceURL: "http://example.invalid"})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/messages", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
}

func TestRoutesToAuthServiceWithPathRewrite(t *testing.T) {
	backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		if req.URL.Path != "/api/api-keys" {
			t.Errorf("expected path /auth/api-keys rewritten to /api/api-keys, got %s", req.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer backend.Close()

	r := New(config.Config{SMSServiceURL: "http://example.invalid", AuthServiceURL: backend.URL})

	req := httptest.NewRequest(http.MethodPost, "/auth/api-keys", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
}
