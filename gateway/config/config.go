package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port               string
	SMSServiceURL      string
	AuthServiceURL     string
	CORSOrigin         string
	OTLPEndpoint       string
	RateLimitPerMinute int
}

func Load() Config {
	return Config{
		Port:           getEnv("GATEWAY_PORT", "8080"),
		SMSServiceURL:  getEnv("SMS_SERVICE_URL", "http://localhost:3000"),
		AuthServiceURL: getEnv("AUTH_SERVICE_URL", "http://localhost:8000"),
		CORSOrigin:     getEnv("CORS_ORIGIN", "*"),
		// Host:port only (no scheme) -- otlptracehttp.WithEndpoint's format.
		OTLPEndpoint: getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", ""),
		// Per-org request quota per minute on /api/v1/*, Day 86.
		RateLimitPerMinute: getEnvInt("RATE_LIMIT_PER_MINUTE", 300),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}
