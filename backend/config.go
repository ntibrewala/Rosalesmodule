package main

import (
	"fmt"
	"log"
	"net/url"
	"os"

	"github.com/joho/godotenv"
)

// Config holds all runtime configuration loaded from .env
type Config struct {
	HanaDSN   string
	JWTSecret string
	Port      string
}

var AppConfig Config

func LoadConfig() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, reading from environment directly")
	}

	host := getEnv("HANA_HOST", "10.10.0.113")
	port := getEnv("HANA_PORT", "30015")
	user := getEnv("HANA_USER", "HANA_RO")
	pass := getEnv("HANA_PASS", "")

	// Build DSN: hdb://USER:PASS@HOST:PORT?defaultSchema=RAGHAV_LIVE
	AppConfig.HanaDSN = fmt.Sprintf("hdb://%s:%s@%s:%s?defaultSchema=RAGHAV_LIVE",
		url.QueryEscape(user),
		url.QueryEscape(pass),
		host,
		port,
	)
	AppConfig.JWTSecret = getEnv("JWT_SECRET", "tec_sales_jwt_secret_2025")
	AppConfig.Port = getEnv("PORT", "5002")
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
