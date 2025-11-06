package models

import (
	"time"
)

type VerificationRequest struct {
	VideoData []byte `json:"video_data"`
	UserID    string `json:"user_id,omitempty"`
	SessionID string `json:"session_id"`
}

type VerificationResult struct {
	VerificationID string    `json:"verification_id"`
	UserID         string    `json:"user_id,omitempty"`
	Verified       bool      `json:"verified"`
	Confidence     float64   `json:"confidence"`
	LivenessScore  float64   `json:"liveness_score"`
	ProcessingTime float64   `json:"processing_time"`
	Timestamp      time.Time `json:"timestamp"`
	Error          string    `json:"error,omitempty"`
}

type FaceVector struct {
	UserID    string    `json:"user_id"`
	Vector    []float32 `json:"vector"`
	CreatedAt time.Time `json:"created_at"`
	Version   string    `json:"version"`
}

type LivenessResult struct {
	IsLive      bool    `json:"is_live"`
	Confidence  float64 `json:"confidence"`
	Method      string  `json:"method"`
	Score       float64 `json:"score"`
}

type VerificationStatus string

const (
	StatusPending    VerificationStatus = "pending"
	StatusProcessing VerificationStatus = "processing"
	StatusCompleted  VerificationStatus = "completed"
	StatusFailed     VerificationStatus = "failed"
)

type VerificationRecord struct {
	ID             string             `json:"id"`
	UserID         string             `json:"user_id,omitempty"`
	SessionID      string             `json:"session_id"`
	Status         VerificationStatus `json:"status"`
	Result         *VerificationResult `json:"result,omitempty"`
	CreatedAt      time.Time          `json:"created_at"`
	UpdatedAt      time.Time          `json:"updated_at"`
	ErrorMessage   string             `json:"error_message,omitempty"`
}