package main

import (
	"context"
	"log"
	"net/http"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"

	"github.com/jmrashed/SMSPit/gateway/config"
	"github.com/jmrashed/SMSPit/gateway/internal/router"
	"github.com/jmrashed/SMSPit/gateway/internal/telemetry"
)

func main() {
	cfg := config.Load()

	ctx := context.Background()
	shutdown, err := telemetry.Init(ctx, "gateway", cfg.OTLPEndpoint)
	if err != nil {
		log.Fatalf("telemetry init: %v", err)
	}
	defer func() {
		if err := shutdown(ctx); err != nil {
			log.Printf("telemetry shutdown: %v", err)
		}
	}()

	handler := otelhttp.NewHandler(router.New(cfg), "gateway")

	log.Printf("gateway listening on :%s (sms-service=%s, auth-service=%s)", cfg.Port, cfg.SMSServiceURL, cfg.AuthServiceURL)
	if err := http.ListenAndServe(":"+cfg.Port, handler); err != nil {
		log.Fatal(err)
	}
}
