package consumer

import (
	"context"
	"errors"
	"log"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/jmrashed/SMSPit/worker/config"
	"github.com/jmrashed/SMSPit/worker/internal/aiclient"
	"github.com/jmrashed/SMSPit/worker/internal/queue"
)

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
			c.process(entry)
			c.redis.XAck(ctx, c.cfg.StreamKey, c.cfg.ConsumerGroup, entry.ID)
		}
	}
}

func (c *Consumer) process(entry redis.XMessage) {
	id, _ := entry.Values["id"].(string)
	message, _ := entry.Values["message"].(string)

	category, err := c.aiClient.Classify(message)
	if err != nil {
		log.Printf("worker: failed to classify message %s: %v", id, err)
		return
	}

	log.Printf("worker: processed message %s (category=%s)", id, category.Category)
}
