package aiclient

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestClassifyReturnsTheCategoryOnSuccess(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/classify" {
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(ClassifyResponse{Category: "marketing"})
	}))
	defer server.Close()

	client := New(server.URL)
	result, err := client.Classify(context.Background(), "Huge sale, 50% off!")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Category != "marketing" {
		t.Fatalf("expected category 'marketing', got %q", result.Category)
	}
}

func TestClassifyReturnsAnErrorOnNonOKStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	client := New(server.URL)
	_, err := client.Classify(context.Background(), "hi")

	if err == nil {
		t.Fatal("expected an error for a non-200 response, got nil")
	}
}

func TestClassifyReturnsAnErrorWhenTheServerIsUnreachable(t *testing.T) {
	client := New("http://127.0.0.1:1")
	_, err := client.Classify(context.Background(), "hi")

	if err == nil {
		t.Fatal("expected an error for an unreachable server, got nil")
	}
}
