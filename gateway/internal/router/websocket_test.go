package router

import (
	"bufio"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/jmrashed/SMSPit/gateway/config"
)

// wsUpgradeBackend fakes sms-service's raw `ws` WebSocket gateway: it
// performs a bare-minimum handshake (no real WS framing) so the test can
// confirm the gateway's reverse proxy hijacks and passes the Upgrade
// request/response through, then echoes one line back over the raw
// connection.
func wsUpgradeBackend(t *testing.T) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/ws" {
			t.Errorf("expected path /ws forwarded unchanged, got %s", r.URL.Path)
		}
		if r.URL.Query().Get("token") != "sms_live_test.secret" {
			t.Errorf("expected token query param forwarded, got %q", r.URL.RawQuery)
		}

		hijacker, ok := w.(http.Hijacker)
		if !ok {
			t.Fatal("backend ResponseWriter does not support hijacking")
		}
		conn, buf, err := hijacker.Hijack()
		if err != nil {
			t.Fatalf("hijack failed: %v", err)
		}
		defer conn.Close()

		fmt.Fprint(buf, "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n")
		buf.Flush()

		line, _ := buf.ReadString('\n')
		fmt.Fprintf(buf, "echo:%s", line)
		buf.Flush()
	}))
}

func TestWebSocketRoutePassesThroughUpgrade(t *testing.T) {
	backend := wsUpgradeBackend(t)
	defer backend.Close()

	r := New(config.Config{SMSServiceURL: backend.URL, AuthServiceURL: "http://example.invalid"})
	gateway := httptest.NewServer(r)
	defer gateway.Close()

	gatewayAddr := strings.TrimPrefix(gateway.URL, "http://")
	conn, err := net.Dial("tcp", gatewayAddr)
	if err != nil {
		t.Fatalf("dial gateway: %v", err)
	}
	defer conn.Close()

	req := "GET /ws?token=sms_live_test.secret HTTP/1.1\r\n" +
		"Host: " + gatewayAddr + "\r\n" +
		"Connection: Upgrade\r\n" +
		"Upgrade: websocket\r\n" +
		"Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n" +
		"Sec-WebSocket-Version: 13\r\n\r\n"
	if _, err := conn.Write([]byte(req)); err != nil {
		t.Fatalf("write upgrade request: %v", err)
	}

	buf := bufio.NewReader(conn)
	statusLine, err := buf.ReadString('\n')
	if err != nil {
		t.Fatalf("read status line: %v", err)
	}
	if !strings.Contains(statusLine, "101") {
		t.Fatalf("expected 101 Switching Protocols forwarded, got %q", statusLine)
	}

	// Drain headers.
	for {
		line, err := buf.ReadString('\n')
		if err != nil {
			t.Fatalf("read headers: %v", err)
		}
		if line == "\r\n" {
			break
		}
	}

	if _, err := conn.Write([]byte("hello\n")); err != nil {
		t.Fatalf("write over upgraded connection: %v", err)
	}

	echoed, err := buf.ReadString('\n')
	if err != nil {
		t.Fatalf("read echo: %v", err)
	}
	if echoed != "echo:hello\n" {
		t.Fatalf("expected echo of data written after upgrade, got %q", echoed)
	}
}
