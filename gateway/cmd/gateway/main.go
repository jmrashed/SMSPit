package main

import (
	"log"
	"net/http"

	"github.com/jmrashed/SMSPit/gateway/config"
	"github.com/jmrashed/SMSPit/gateway/internal/router"
)

func main() {
	cfg := config.Load()
	handler := router.New(cfg)

	log.Printf("gateway listening on :%s (sms-service=%s, auth-service=%s)", cfg.Port, cfg.SMSServiceURL, cfg.AuthServiceURL)
	if err := http.ListenAndServe(":"+cfg.Port, handler); err != nil {
		log.Fatal(err)
	}
}
