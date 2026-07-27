package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	DBHost     string
	DBPort     string
	DBName     string
	DBUser     string
	DBPassword string
	DBSSLMode  string

	JWTSecret         string
	JWTExpiryMinutes  int
	RefreshSecret     string
	RefreshExpiryDays int

	Port           string
	Env            string
	AllowedOrigins string

	RateLimitUnauth int
	RateLimitAuth   int

	UploadDir   string
	MaxUploadMB int64
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file, reading from environment")
	}

	return &Config{
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBName:     getEnv("DB_NAME", "sdic"),
		DBUser:     getEnv("DB_USER", "sdic_agent"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),

		JWTSecret:         mustEnv("JWT_SECRET"),
		JWTExpiryMinutes:  getEnvInt("JWT_EXPIRY_MINUTES", 15),
		RefreshSecret:     mustEnv("REFRESH_SECRET"),
		RefreshExpiryDays: getEnvInt("REFRESH_EXPIRY_DAYS", 7),

		Port:           getEnv("PORT", "8080"),
		Env:            getEnv("ENV", "development"),
		AllowedOrigins: getEnv("ALLOWED_ORIGINS", "http://localhost:5173"),

		RateLimitUnauth: getEnvInt("RATE_LIMIT_UNAUTH", 20),
		RateLimitAuth:   getEnvInt("RATE_LIMIT_AUTH", 100),

		UploadDir:   getEnv("UPLOAD_DIR", "./uploads"),
		MaxUploadMB: int64(getEnvInt("MAX_UPLOAD_MB", 50)),
	}
}

func (c *Config) DSN() string {
	return "host=" + c.DBHost +
		" port=" + c.DBPort +
		" dbname=" + c.DBName +
		" user=" + c.DBUser +
		" password=" + c.DBPassword +
		" sslmode=" + c.DBSSLMode
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("Required environment variable %s is not set", key)
	}
	return v
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
