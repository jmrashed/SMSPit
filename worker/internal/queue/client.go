// Package queue wraps the Redis Streams client the consumer reads
// sms-service's capture events from (see docs/redis.md).
package queue

import (
	"context"
	"strings"

	"github.com/redis/go-redis/v9"

	"github.com/jmrashed/SMSPit/worker/config"
)

func NewClient(cfg config.Config) *redis.Client {
	return redis.NewClient(&redis.Options{
		Addr: cfg.RedisHost + ":" + cfg.RedisPort,
	})
}

// EnsureGroup creates the consumer group (and the stream, via MKSTREAM,
// if it doesn't exist yet) -- idempotent, since XGROUP CREATE errors
// with BUSYGROUP when the group is already there.
func EnsureGroup(ctx context.Context, client *redis.Client, stream, group string) error {
	err := client.XGroupCreateMkStream(ctx, stream, group, "$").Err()
	if err != nil && !strings.Contains(err.Error(), "BUSYGROUP") {
		return err
	}
	return nil
}
