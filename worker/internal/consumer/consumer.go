package consumer

import (
	"context"
	"errors"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"

	"github.com/jmrashed/SMSPit/worker/config"
	"github.com/jmrashed/SMSPit/worker/internal/aiclient"
	"github.com/jmrashed/SMSPit/worker/internal/queue"
)

var tracer = otel.Tracer("worker/consumer")

// Consumer reads sms-service's capture events off the Redis Stream
// (see docs/redis.md) via a consumer group, and calls ai-service for
// each one -- the async processing path alongside sms-service's own
// synchronous, non-blocking enrichment on capture (Days 68/71/73).
type Consumer struct {
	cfg      config.Config
	redis    *redis.Client
	aiClient *aiclient.Client
}

func New(cfg config.Config) *Consumer {
	return &Consumer{
		cfg:      cfg,
		redis:    queue.NewClient(cfg),
		aiClient: aiclient.New(cfg.AIServiceURL),
	}
}

// Run blocks until ctx is cancelled, then returns once the current
// XREADGROUP call unblocks -- callers use this to wait out in-flight
// work before the process exits.
func (c *Consumer) Run(ctx context.Context) {
	if err := queue.EnsureGroup(ctx, c.redis, c.cfg.StreamKey, c.cfg.ConsumerGroup); err != nil {
		log.Printf("worker: failed to create consumer group, will keep retrying: %v", err)
	}

	log.Printf("worker: consumer loop started (stream=%s group=%s)", c.cfg.StreamKey, c.cfg.ConsumerGroup)

	for {
		select {
		case <-ctx.Done():
			log.Println("worker: consumer loop stopping")
			_ = c.redis.Close()
			return
		default:
			c.readAndProcess(ctx)
		}
	}
}

func (c *Consumer) readAndProcess(ctx context.Context) {
	streams, err := c.redis.XReadGroup(ctx, &redis.XReadGroupArgs{
		Group:    c.cfg.ConsumerGroup,
		Consumer: c.cfg.ConsumerName,
		Streams:  []string{c.cfg.StreamKey, ">"},
		Count:    10,
		Block:    c.cfg.PollInterval,
	}).Result()

	if err != nil {
		if !errors.Is(err, redis.Nil) && ctx.Err() == nil {
			log.Printf("worker: XREADGROUP error, retrying: %v", err)
			time.Sleep(time.Second)
		}
		return
	}

	for _, stream := range streams {
		for _, entry := range stream.Messages {
			c.process(ctx, entry)
			c.redis.XAck(ctx, c.cfg.StreamKey, c.cfg.ConsumerGroup, entry.ID)
		}
	}
}

// process starts its own trace rather than continuing sms-service's
// capture-request trace -- the Redis Stream entry (Day 78) doesn't carry
// a traceparent, so there's nothing to extract. It's still a real,
// exported span showing worker's ai-service call (Day 83).
func (c *Consumer) process(ctx context.Context, entry redis.XMessage) {
	id, _ := entry.Values["id"].(string)
	message, _ := entry.Values["message"].(string)

	spanCtx, span := tracer.Start(ctx, "worker.process_message")
	defer span.End()
	span.SetAttributes(attribute.String("message.id", id))

	category, err := c.aiClient.Classify(spanCtx, message)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		log.Printf("worker: failed to classify message %s: %v", id, err)
		return
	}

	span.SetAttributes(attribute.String("message.category", category.Category))
	log.Printf("worker: processed message %s (category=%s)", id, category.Category)
}
