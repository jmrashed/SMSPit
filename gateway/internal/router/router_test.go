package router

import (
	"net/http"
	"net/http/httptest"
	"strings"
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

func TestMetricsEndpointExposesPrometheusFormat(t *testing.T) {
	r := New(config.Config{SMSServiceURL: "http://example.invalid", AuthServiceURL: "http://example.invalid"})

	// Generate at least one request so gateway_http_requests_total has a
	// sample -- an empty registry would still return 200, but wouldn't
	// prove the counter is actually wired up.
	r.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/healthz", nil))

	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "gateway_http_requests_total") {
		t.Fatalf("expected gateway_http_requests_total in /metrics output, got:\n%s", rec.Body.String())
	}
}

// validatingAuthBackend fakes auth-service's GET /api/api-keys/validate: it
// accepts "Bearer valid" and rejects everything else, matching the real
// ValidateApiKey middleware's 401 JSON shape.
func validatingAuthBackend(t *testing.T) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		if req.URL.Path != "/api/api-keys/validate" {
			t.Errorf("expected auth-service call to /api/api-keys/validate, got %s", req.URL.Path)
		}
		if req.Header.Get("Authorization") != "Bearer valid" {
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"code":"UNAUTHORIZED","message":"Invalid or revoked API key","details":null}`))
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"id":1,"name":"test-key","owner_id":42,"scopes":["messages:read"]}`))
	}))
}

func TestSMSServiceRouteRejectsMissingAuthorization(t *testing.T) {
	smsBackendCalled := false
	smsBackend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		smsBackendCalled = true
	}))
	defer smsBackend.Close()

	r := New(config.Config{SMSServiceURL: smsBackend.URL, AuthServiceURL: "http://example.invalid"})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/messages", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", rec.Code)
	}
	if smsBackendCalled {
		t.Error("sms-service should not be reached when Authorization header is missing")
	}
}

func TestSMSServiceRouteRejectsInvalidAPIKey(t *testing.T) {
	authBackend := validatingAuthBackend(t)
	defer authBackend.Close()

	smsBackendCalled := false
	smsBackend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		smsBackendCalled = true
	}))
	defer smsBackend.Close()

	r := New(config.Config{SMSServiceURL: smsBackend.URL, AuthServiceURL: authBackend.URL})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/messages", nil)
	req.Header.Set("Authorization", "Bearer wrong")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", rec.Code)
	}
	if smsBackendCalled {
		t.Error("sms-service should not be reached when the API key is invalid")
	}
}

func TestSMSServiceRouteForwardsValidatedIdentity(t *testing.T) {
	authBackend := validatingAuthBackend(t)
	defer authBackend.Close()

	var gotIdentityHeader, gotOwnerHeader string
	smsBackend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		if req.URL.Path != "/api/v1/messages" {
			t.Errorf("expected path /api/v1/messages forwarded unchanged, got %s", req.URL.Path)
		}
		gotIdentityHeader = req.Header.Get("X-Api-Key-Id")
		gotOwnerHeader = req.Header.Get("X-Owner-Id")
		w.WriteHeader(http.StatusOK)
	}))
	defer smsBackend.Close()

	r := New(config.Config{SMSServiceURL: smsBackend.URL, AuthServiceURL: authBackend.URL})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/messages", nil)
	req.Header.Set("Authorization", "Bearer valid")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	if gotIdentityHeader != "1" {
		t.Errorf("expected X-Api-Key-Id forwarded as 1, got %q", gotIdentityHeader)
	}
	if gotOwnerHeader != "42" {
		t.Errorf("expected X-Owner-Id forwarded as 42, got %q", gotOwnerHeader)
	}
}

func TestCORSPreflightSucceedsWithoutAuthorization(t *testing.T) {
	smsBackendCalled := false
	smsBackend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		smsBackendCalled = true
	}))
	defer smsBackend.Close()

	r := New(config.Config{SMSServiceURL: smsBackend.URL, AuthServiceURL: "http://example.invalid", CORSOrigin: "*"})

	req := httptest.NewRequest(http.MethodOptions, "/api/v1/messages", nil)
	req.Header.Set("Origin", "http://localhost:5173")
	req.Header.Set("Access-Control-Request-Method", "GET")
	req.Header.Set("Access-Control-Request-Headers", "authorization")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	// A preflight OPTIONS request never carries Authorization (browsers
	// omit custom headers on preflight) -- RequireAPIKey must not see it
	// before CORS has a chance to respond, or every cross-origin request
	// through the gateway breaks.
	if rec.Code != http.StatusOK && rec.Code != http.StatusNoContent {
		t.Fatalf("expected preflight to succeed, got %d", rec.Code)
	}
	if rec.Header().Get("Access-Control-Allow-Origin") == "" {
		t.Error("expected Access-Control-Allow-Origin on the preflight response")
	}
	if smsBackendCalled {
		t.Error("preflight should be answered by the gateway, not forwarded to sms-service")
	}
}

func TestCORSHeaderNotDuplicatedWhenBackendAlsoSetsIt(t *testing.T) {
	authBackend := validatingAuthBackend(t)
	defer authBackend.Close()

	smsBackend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		// Simulates sms-service's own app.enableCors() also setting the
		// header on direct responses.
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.WriteHeader(http.StatusOK)
	}))
	defer smsBackend.Close()

	r := New(config.Config{SMSServiceURL: smsBackend.URL, AuthServiceURL: authBackend.URL, CORSOrigin: "*"})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/messages", nil)
	req.Header.Set("Authorization", "Bearer valid")
	req.Header.Set("Origin", "http://localhost:5173")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	// A header repeated across two lines is invalid CORS -- browsers
	// require exactly one Access-Control-Allow-Origin value and reject
	// the response outright if there are two, even if both say "*".
	values := rec.Header().Values("Access-Control-Allow-Origin")
	if len(values) != 1 {
		t.Fatalf("expected exactly one Access-Control-Allow-Origin header, got %d: %v", len(values), values)
	}
}

func TestCORSExposesContentDispositionForDownloads(t *testing.T) {
	authBackend := validatingAuthBackend(t)
	defer authBackend.Close()

	smsBackend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		w.Header().Set("Content-Disposition", `attachment; filename="messages-export.csv"`)
		w.WriteHeader(http.StatusOK)
	}))
	defer smsBackend.Close()

	r := New(config.Config{SMSServiceURL: smsBackend.URL, AuthServiceURL: authBackend.URL, CORSOrigin: "*"})

	req := httptest.NewRequest(http.MethodGet, "/api/v1/messages/export", nil)
	req.Header.Set("Authorization", "Bearer valid")
	req.Header.Set("Origin", "http://localhost:5173")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	// Without Access-Control-Expose-Headers, a cross-origin fetch()
	// can't read Content-Disposition at all (only a fixed "simple
	// headers" allowlist is readable by default) -- the export UI's
	// filename would silently fall back to a generic one.
	exposed := rec.Header().Get("Access-Control-Expose-Headers")
	if !strings.Contains(exposed, "Content-Disposition") {
		t.Fatalf("expected Content-Disposition in Access-Control-Expose-Headers, got %q", exposed)
	}
	if got := rec.Header().Get("Content-Disposition"); got != `attachment; filename="messages-export.csv"` {
		t.Fatalf("expected Content-Disposition to pass through unchanged, got %q", got)
	}
}

func TestRateLimitAppliesPerOrgAfterAuth(t *testing.T) {
	authBackend := validatingAuthBackend(t)
	defer authBackend.Close()

	smsBackend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer smsBackend.Close()

	r := New(config.Config{SMSServiceURL: smsBackend.URL, AuthServiceURL: authBackend.URL, RateLimitPerMinute: 1})

	makeRequest := func() int {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/messages", nil)
		req.Header.Set("Authorization", "Bearer valid")
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)
		return rec.Code
	}

	if code := makeRequest(); code != http.StatusOK {
		t.Fatalf("first request: expected 200, got %d", code)
	}

	// validatingAuthBackend always resolves to the same owner_id, so the
	// second request within the window must be throttled by the gateway
	// before ever reaching sms-service.
	if code := makeRequest(); code != http.StatusTooManyRequests {
		t.Fatalf("second request: expected 429 once over the per-org quota, got %d", code)
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
