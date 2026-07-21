package main

import (
	"context"
	"log"
	"os/signal"
	"syscall"

	"github.com/jmrashed/SMSPit/worker/config"
	"github.com/jmrashed/SMSPit/worker/internal/consumer"
	"github.com/jmrashed/SMSPit/worker/internal/metrics"
	"github.com/jmrashed/SMSPit/worker/internal/telemetry"
)

func main() {
	cfg := config.Load()

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	shutdown, err := telemetry.Init(context.Background(), "worker", cfg.OTLPEndpoint)
	if err != nil {
		log.Fatalf("telemetry init: %v", err)
	}
	defer func() {
		if err := shutdown(context.Background()); err != nil {
			log.Printf("telemetry shutdown: %v", err)
		}
	}()

	go metrics.Serve(ctx, cfg.MetricsAddr)

	log.Printf("worker starting (ai-service=%s)", cfg.AIServiceURL)

	consumer.New(cfg).Run(ctx)

	log.Println("worker stopped")
}
