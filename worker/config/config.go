package config

import (
	"os"
	"time"
)

type Config struct {
	AIServiceURL string
	RedisHost    string
	RedisPort    string
	// How often the consumer loop retries XREADGROUP after an empty
	// read or a Redis error.
	PollInterval  time.Duration
	StreamKey     string
	ConsumerGroup string
	ConsumerName  string
	// Host:port only (no scheme) -- otlptracehttp.WithEndpoint's format.
	OTLPEndpoint string
	MetricsAddr  string
}

func Load() Config {
	return Config{
		AIServiceURL: getEnv("AI_SERVICE_URL", "http://localhost:8001"),
		RedisHost:    getEnv("REDIS_HOST", "127.0.0.1"),
		RedisPort:    getEnv("REDIS_PORT", "6379"),
		PollInterval: getEnvDuration("WORKER_POLL_INTERVAL", 5*time.Second),
		// Matches docs/redis.md's channel naming convention.
		StreamKey:     getEnv("WORKER_STREAM_KEY", "sms.messages.created"),
		ConsumerGroup: getEnv("WORKER_CONSUMER_GROUP", "worker"),
		ConsumerName:  getEnv("WORKER_CONSUMER_NAME", "worker-1"),
		OTLPEndpoint:  getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", ""),
		MetricsAddr:   getEnv("WORKER_METRICS_ADDR", ":9100"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if parsed, err := time.ParseDuration(v); err == nil {
			return parsed
		}
	}
	return fallback
}
