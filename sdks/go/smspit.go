// Package smspit is a client for SMSPit's native REST API
// (docs/api/message-mapping.md): send, list, get, and replay captured
// messages. Built on net/http only -- no third-party dependency.
package smspit

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Message mirrors the REST response shape for a captured message.
type Message struct {
	ID           string  `json:"id"`
	To           string  `json:"to"`
	From         string  `json:"from"`
	Message      string  `json:"message"`
	Status       string  `json:"status"`
	OTP          *string `json:"otp"`
	Category     *string `json:"category"`
	IsSpam       *bool   `json:"is_spam"`
	ReplayedFrom *string `json:"replayed_from"`
	OrgID        *int    `json:"org_id"`
	CreatedAt    string  `json:"created_at"`
}

// MessageList is the envelope GET /api/v1/messages returns.
type MessageList struct {
	Messages []Message `json:"messages"`
	Total    int       `json:"total"`
	Limit    int       `json:"limit"`
	Offset   int       `json:"offset"`
}

// ListParams are the optional query filters GET /api/v1/messages accepts.
type ListParams struct {
	Limit         int
	Offset        int
	To            string
	From          string
	CreatedAfter  string
	CreatedBefore string
}

// errorEnvelope mirrors this project's standard error response shape
// (code/message/details), documented in CLAUDE.md's coding conventions.
type errorEnvelope struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details any    `json:"details"`
}

// APIError is returned when SMSPit responds with a non-2xx status.
type APIError struct {
	Status  int
	Code    string
	Message string
	Details any
}

func (e *APIError) Error() string {
	return fmt.Sprintf("smspit: %s (status %d): %s", e.Code, e.Status, e.Message)
}

// Client talks to SMSPit's REST API. Point BaseURL at the gateway (or
// sms-service directly) and pass the full "{key}.{secret}" API key
// auth-service issued.
type Client struct {
	BaseURL    string
	APIKey     string
	HTTPClient *http.Client
}

// New builds a Client with a sane default timeout. Pass an *http.Client
// via the exported field afterwards to override it (e.g. in tests).
func New(baseURL, apiKey string) *Client {
	return &Client{
		BaseURL:    baseURL,
		APIKey:     apiKey,
		HTTPClient: &http.Client{Timeout: 10 * time.Second},
	}
}

// Send captures a new message (POST /api/v1/messages).
func (c *Client) Send(to, from, message string) (*Message, error) {
	body, err := json.Marshal(map[string]string{"to": to, "from": from, "message": message})
	if err != nil {
		return nil, err
	}

	var result Message
	if err := c.do(http.MethodPost, "/api/v1/messages", bytes.NewReader(body), nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// List returns a page of captured messages (GET /api/v1/messages).
func (c *Client) List(params ListParams) (*MessageList, error) {
	query := url.Values{}
	if params.Limit > 0 {
		query.Set("limit", strconv.Itoa(params.Limit))
	}
	if params.Offset > 0 {
		query.Set("offset", strconv.Itoa(params.Offset))
	}
	if params.To != "" {
		query.Set("to", params.To)
	}
	if params.From != "" {
		query.Set("from", params.From)
	}
	if params.CreatedAfter != "" {
		query.Set("created_after", params.CreatedAfter)
	}
	if params.CreatedBefore != "" {
		query.Set("created_before", params.CreatedBefore)
	}

	var result MessageList
	if err := c.do(http.MethodGet, "/api/v1/messages", nil, query, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// Get fetches a single message by id (GET /api/v1/messages/{id}).
func (c *Client) Get(id string) (*Message, error) {
	var result Message
	if err := c.do(http.MethodGet, "/api/v1/messages/"+url.PathEscape(id), nil, nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// Replay re-sends a message's original payload as a new, linked message
// (POST /api/v1/messages/{id}/replay).
func (c *Client) Replay(id string) (*Message, error) {
	var result Message
	if err := c.do(http.MethodPost, "/api/v1/messages/"+url.PathEscape(id)+"/replay", nil, nil, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *Client) do(method, path string, body io.Reader, query url.Values, out any) error {
	target := strings.TrimRight(c.BaseURL, "/") + path
	if len(query) > 0 {
		target += "?" + query.Encode()
	}

	req, err := http.NewRequest(method, target, body)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.httpClient().Do(req)
	if err != nil {
		return fmt.Errorf("smspit: request to %s failed: %w", target, err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("smspit: reading response from %s failed: %w", target, err)
	}

	if resp.StatusCode >= 400 {
		var envelope errorEnvelope
		_ = json.Unmarshal(raw, &envelope)
		return &APIError{Status: resp.StatusCode, Code: envelope.Code, Message: envelope.Message, Details: envelope.Details}
	}

	if out == nil || len(raw) == 0 {
		return nil
	}
	if err := json.Unmarshal(raw, out); err != nil {
		return fmt.Errorf("smspit: decoding response from %s failed: %w", target, err)
	}
	return nil
}

func (c *Client) httpClient() *http.Client {
	if c.HTTPClient != nil {
		return c.HTTPClient
	}
	return http.DefaultClient
}
