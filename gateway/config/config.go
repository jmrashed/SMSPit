package config

import "os"

type Config struct {
	Port           string
	SMSServiceURL  string
	AuthServiceURL string
}

func Load() Config {
	return Config{
		Port:           getEnv("GATEWAY_PORT", "8080"),
		SMSServiceURL:  getEnv("SMS_SERVICE_URL", "http://localhost:3000"),
		AuthServiceURL: getEnv("AUTH_SERVICE_URL", "http://localhost:8000"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
