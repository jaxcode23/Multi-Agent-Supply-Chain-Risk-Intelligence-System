package utils

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

func EnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func EnvFloat64(key string, fallback float64) float64 {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.ParseFloat(v, 64); err == nil {
			return n
		}
	}
	return fallback
}

func EnvDurationSec(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return time.Duration(n) * time.Second
		}
	}
	return fallback
}

// ValidateRequired checks that all named env vars are non-empty.
// Returns an error listing every missing variable.
func ValidateRequired(keys ...string) error {
	var missing []string
	for _, k := range keys {
		if os.Getenv(k) == "" {
			missing = append(missing, k)
		}
	}
	if len(missing) > 0 {
		return fmt.Errorf("missing required env vars: %v", missing)
	}
	return nil
}

// ValidatePositiveInt checks that an env var, if set, parses to a positive integer.
func ValidatePositiveInt(key string) error {
	v := os.Getenv(key)
	if v == "" {
		return nil // optional — only validate if set
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fmt.Errorf("%s must be a valid integer, got %q", key, v)
	}
	if n <= 0 {
		return fmt.Errorf("%s must be > 0, got %d", key, n)
	}
	return nil
}

// ValidatePositiveFloat checks that an env var, if set, parses to a positive float.
func ValidatePositiveFloat(key string) error {
	v := os.Getenv(key)
	if v == "" {
		return nil
	}
	n, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return fmt.Errorf("%s must be a valid number, got %q", key, v)
	}
	if n <= 0 {
		return fmt.Errorf("%s must be > 0, got %f", key, n)
	}
	return nil
}
