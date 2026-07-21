// Package aiclient is a minimal HTTP client for ai-service, used by the
// consumer to demonstrate the async processing path (Day 78). It's
// intentionally thin -- sms-service already does the synchronous,
// non-blocking OTP/classification/spam calls on capture (Days 68/71/73)
// that populate the message record the dashboard reads; this client
// exists for the worker's own async workloads (e.g. reprocessing,
// batch jobs) built on top of the same queue.
package aiclient

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

type Client struct {
	baseURL string
	http    *http.Client
}

func New(baseURL string) *Client {
	return &Client{
		baseURL: baseURL,
		// otelhttp.NewTransport propagates the caller's trace context
		// (W3C traceparent header) onto this request and records a span
		// for it -- what makes a trace continuous from worker's consumer
		// loop into ai-service (Day 83).
		http: &http.Client{Timeout: 5 * time.Second, Transport: otelhttp.NewTransport(http.DefaultTransport)},
	}
}

type ClassifyResponse struct {
	Category string `json:"category"`
}

func (c *Client) Classify(ctx context.Context, message string) (*ClassifyResponse, error) {
	body, err := json.Marshal(map[string]string{"message": message})
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/classify", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ai-service returned %d for /classify", resp.StatusCode)
	}

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var parsed ClassifyResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return nil, err
	}

	return &parsed, nil
}
