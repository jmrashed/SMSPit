package main

import (
	"context"
	"log"
	"os/signal"
	"syscall"

	"github.com/jmrashed/SMSPit/worker/config"
	"github.com/jmrashed/SMSPit/worker/internal/consumer"
)

func main() {
	cfg := config.Load()

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	log.Printf("worker starting (ai-service=%s)", cfg.AIServiceURL)

	consumer.New(cfg).Run(ctx)

	log.Println("worker stopped")
}
