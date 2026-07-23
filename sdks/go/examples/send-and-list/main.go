// Command send-and-list demonstrates the Go SDK's send/replay/list flow
// against a running SMSPit instance.
//
//	SMSPIT_API_KEY=... go run ./examples/send-and-list
package main

import (
	"fmt"
	"log"
	"os"

	smspit "github.com/jmrashed/SMSPit/sdks/go"
)

func main() {
	apiKey := os.Getenv("SMSPIT_API_KEY")
	if apiKey == "" {
		log.Fatal("set SMSPIT_API_KEY")
	}
	baseURL := os.Getenv("SMSPIT_BASE_URL")
	if baseURL == "" {
		baseURL = "http://localhost:8080"
	}

	client := smspit.New(baseURL, apiKey)

	message, err := client.Send("+8801700000000", "SMSPit", "Your OTP is 123456")
	if err != nil {
		log.Fatalf("send: %v", err)
	}
	fmt.Printf("Captured %s (otp: %v)\n", message.ID, message.OTP)

	replay, err := client.Replay(message.ID)
	if err != nil {
		log.Fatalf("replay: %v", err)
	}
	fmt.Printf("Replayed as %s\n", replay.ID)

	page, err := client.List(smspit.ListParams{Limit: 5})
	if err != nil {
		log.Fatalf("list: %v", err)
	}
	fmt.Printf("Inbox has %d message(s) total, showing %d:\n", page.Total, page.Limit)
	for _, m := range page.Messages {
		fmt.Printf("  - %s: %s -> %s: %s\n", m.ID, m.From, m.To, m.Message)
	}
}
