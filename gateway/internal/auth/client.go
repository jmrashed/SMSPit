// Package auth validates API keys against auth-service, mirroring
// sms-service's own AuthClient (src/auth/auth-client.ts). Kept as a
// separate gateway-level check per Day 39 -- sms-service's own guard
// (Day 35) stays in place too, so this is defense in depth, not a
// replacement.
package auth

import (
	"encoding/json"
	"net/http"
)

type ValidatedKey struct {
	ID      int      `json:"id"`
	Name    string   `json:"name"`
	OwnerID int      `json:"owner_id"`
	Scopes  []string `json:"scopes"`
}

type Client struct {
	AuthServiceURL string
	HTTPClient     *http.Client
}

func NewClient(authServiceURL string) *Client {
	return &Client{AuthServiceURL: authServiceURL, HTTPClient: http.DefaultClient}
}

// Validate returns the resolved key on success, or nil if auth-service
// rejected the token (invalid, revoked, or missing) or is unreachable.
func (c *Client) Validate(authorizationHeader string) *ValidatedKey {
	req, err := http.NewRequest(http.MethodGet, c.AuthServiceURL+"/api/api-keys/validate", nil)
	if err != nil {
		return nil
	}
	req.Header.Set("Authorization", authorizationHeader)

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil
	}

	var key ValidatedKey
	if err := json.NewDecoder(resp.Body).Decode(&key); err != nil {
		return nil
	}

	return &key
}
