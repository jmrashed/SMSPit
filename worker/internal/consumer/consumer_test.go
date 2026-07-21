package consumer

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/jmrashed/SMSPit/worker/config"
	"github.com/jmrashed/SMSPit/worker/internal/aiclient"
	"github.com/jmrashed/SMSPit/worker/internal/queue"
)

func TestRunStopsWhenContextIsCancelled(t *testing.T) {
	cfg := config.Config{PollInterval: 10 * time.Millisecond}
	c := New(cfg)

	ctx, cancel := context.WithCancel(context.Background())

	done := make(chan struct{})
	go func() {
		c.Run(ctx)
		close(done)
	}()

	// Let it poll at least once before asking it to stop.
	time.Sleep(25 * time.Millisecond)
	cancel()

	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("Run did not return within 1s of context cancellation")
	}
}

func TestRunReturnsImmediatelyWithAnAlreadyCancelledContext(t *testing.T) {
	cfg := config.Config{PollInterval: time.Hour}
	c := New(cfg)

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	done := make(chan struct{})
	go func() {
		c.Run(ctx)
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("Run did not return immediately for an already-cancelled context")
	}
}

// TestReadAndProcessAcksAConsumedMessage exercises the real path against
// a local Redis (the same instance sms-service publishes to in dev) --
// requires REDIS_HOST/REDIS_PORT to point at a reachable Redis, which
// they do by default (127.0.0.1:6379).
func TestReadAndProcessAcksAConsumedMessage(t *testing.T) {
	aiServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"category": "marketing"})
	}))
	defer aiServer.Close()

	cfg := config.Config{
		AIServiceURL:  aiServer.URL,
		RedisHost:     "127.0.0.1",
		RedisPort:     "6379",
		PollInterval:  500 * time.Millisecond,
		StreamKey:     "test.worker.consumer",
		ConsumerGroup: "test-group",
		ConsumerName:  "test-consumer",
	}

	redisClient := queue.NewClient(cfg)
	defer redisClient.Close()

	ctx := context.Background()
	redisClient.Del(ctx, cfg.StreamKey)
	if err := queue.EnsureGroup(ctx, redisClient, cfg.StreamKey, cfg.ConsumerGroup); err != nil {
		t.Fatalf("failed to create consumer group: %v", err)
	}
	defer redisClient.Del(ctx, cfg.StreamKey)

	id, err := redisClient.XAdd(ctx, &redis.XAddArgs{
		Stream: cfg.StreamKey,
		Values: map[string]any{"id": "sms_test123", "message": "Huge sale, 50% off!"},
	}).Result()
	if err != nil {
		t.Fatalf("failed to seed the stream: %v", err)
	}

	c := &Consumer{cfg: cfg, redis: redisClient, aiClient: aiclient.New(aiServer.URL)}
	c.readAndProcess(ctx)

	pending, err := redisClient.XPending(ctx, cfg.StreamKey, cfg.ConsumerGroup).Result()
	if err != nil {
		t.Fatalf("failed to check pending entries: %v", err)
	}
	if pending.Count != 0 {
		t.Fatalf("expected the consumed entry %s to be acked (0 pending), got %d pending", id, pending.Count)
	}
}
