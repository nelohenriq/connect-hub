package config

import (
	"github.com/spf13/viper"
)

type Config struct {
	Port        int    `mapstructure:"PORT"`
	Environment string `mapstructure:"ENVIRONMENT"`
	DatabaseURL string `mapstructure:"DATABASE_URL"`

	// Face recognition settings
	FaceModelPath     string  `mapstructure:"FACE_MODEL_PATH"`
	LivenessThreshold float64 `mapstructure:"LIVENESS_THRESHOLD"`
	SimilarityThreshold float64 `mapstructure:"SIMILARITY_THRESHOLD"`

	// Storage settings
	StorageType      string `mapstructure:"STORAGE_TYPE"`
	EncryptionKey    string `mapstructure:"ENCRYPTION_KEY"`
	StoragePath      string `mapstructure:"STORAGE_PATH"`

	// Performance settings
	MaxConcurrentRequests int `mapstructure:"MAX_CONCURRENT_REQUESTS"`
	ProcessingTimeout     int `mapstructure:"PROCESSING_TIMEOUT"`
}

func Load() (*Config, error) {
	viper.SetDefault("PORT", 8080)
	viper.SetDefault("ENVIRONMENT", "development")
	viper.SetDefault("FACE_MODEL_PATH", "./models")
	viper.SetDefault("LIVENESS_THRESHOLD", 0.85)
	viper.SetDefault("SIMILARITY_THRESHOLD", 0.75)
	viper.SetDefault("STORAGE_TYPE", "encrypted_file")
	viper.SetDefault("STORAGE_PATH", "./storage")
	viper.SetDefault("MAX_CONCURRENT_REQUESTS", 10)
	viper.SetDefault("PROCESSING_TIMEOUT", 30)

	viper.AutomaticEnv()

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, err
	}

	return &config, nil
}