package handlers

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"

	"connect-hub/verification-service/internal/models"
	"connect-hub/verification-service/internal/services"
)

type VerificationHandler struct {
	faceService *services.FaceVerificationService
	logger      *zap.Logger
}

func NewVerificationHandler(faceService *services.FaceVerificationService, logger *zap.Logger) *VerificationHandler {
	return &VerificationHandler{
		faceService: faceService,
		logger:      logger,
	}
}

func (h *VerificationHandler) VerifyVideo(c *gin.Context) {
	// Parse multipart form with validation
	form, err := c.MultipartForm()
	if err != nil {
		h.logger.Error("Failed to parse multipart form", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid form data",
			"code": "INVALID_FORM_DATA",
		})
		return
	}

	files := form.File["video"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Video file is required",
			"code": "MISSING_VIDEO_FILE",
		})
		return
	}

	file := files[0]

	// Comprehensive file validation
	if err := h.validateVideoFile(file); err != nil {
		h.logger.Warn("File validation failed", zap.Error(err), zap.String("filename", file.Filename))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
			"code": "INVALID_VIDEO_FILE",
		})
		return
	}

	// Read file data with error handling
	videoData, err := h.readVideoFile(file)
	if err != nil {
		h.logger.Error("Failed to read video file", zap.Error(err), zap.String("filename", file.Filename))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to process video file",
			"code": "FILE_READ_ERROR",
		})
		return
	}

	// Validate input parameters
	userID := c.PostForm("user_id")
	sessionID := c.PostForm("session_id")
	if sessionID == "" {
		sessionID = uuid.New().String()
	}

	// Sanitize and validate user ID
	if userID != "" && !h.isValidUserID(userID) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID format",
			"code": "INVALID_USER_ID",
		})
		return
	}

	// Create verification request
	req := &models.VerificationRequest{
		VideoData: videoData,
		UserID:    userID,
		SessionID: sessionID,
	}

	// Process verification with timeout protection
	resultChan := make(chan *models.VerificationResult, 1)
	errChan := make(chan error, 1)

	go func() {
		result, err := h.faceService.VerifyVideo(req)
		if err != nil {
			errChan <- err
			return
		}
		resultChan <- result
	}()

	// Wait for result with timeout
	select {
	case result := <-resultChan:
		h.logger.Info("Video verification completed",
			zap.String("verification_id", result.VerificationID),
			zap.String("session_id", sessionID),
			zap.Bool("verified", result.Verified),
			zap.Float64("confidence", result.Confidence),
			zap.Float64("liveness_score", result.LivenessScore),
			zap.Float64("processing_time", result.ProcessingTime))

		// Check for performance issues
		if result.ProcessingTime > 3.0 {
			h.logger.Warn("Processing time exceeded target",
				zap.Float64("processing_time", result.ProcessingTime),
				zap.String("verification_id", result.VerificationID))
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    result,
		})

	case err := <-errChan:
		h.logger.Error("Video verification failed",
			zap.Error(err),
			zap.String("session_id", sessionID))

		// Return structured error response
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Verification processing failed",
			"code": "VERIFICATION_FAILED",
			"details": err.Error(),
		})

	case <-time.After(30 * time.Second):
		h.logger.Error("Verification timeout", zap.String("session_id", sessionID))
		c.JSON(http.StatusRequestTimeout, gin.H{
			"error": "Verification processing timeout",
			"code": "VERIFICATION_TIMEOUT",
		})
	}
}

func (h *VerificationHandler) RegisterFace(c *gin.Context) {
	// Parse multipart form with validation
	form, err := c.MultipartForm()
	if err != nil {
		h.logger.Error("Failed to parse multipart form", zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid form data",
			"code": "INVALID_FORM_DATA",
		})
		return
	}

	files := form.File["video"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Video file is required",
			"code": "MISSING_VIDEO_FILE",
		})
		return
	}

	userID := c.PostForm("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "User ID is required for registration",
			"code": "MISSING_USER_ID",
		})
		return
	}

	// Validate user ID format
	if !h.isValidUserID(userID) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID format",
			"code": "INVALID_USER_ID",
		})
		return
	}

	file := files[0]

	// Comprehensive file validation
	if err := h.validateVideoFile(file); err != nil {
		h.logger.Warn("File validation failed", zap.Error(err), zap.String("filename", file.Filename))
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
			"code": "INVALID_VIDEO_FILE",
		})
		return
	}

	// Read file data with error handling
	videoData, err := h.readVideoFile(file)
	if err != nil {
		h.logger.Error("Failed to read video file", zap.Error(err), zap.String("filename", file.Filename))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to process video file",
			"code": "FILE_READ_ERROR",
		})
		return
	}

	// Register face with timeout protection
	errChan := make(chan error, 1)

	go func() {
		errChan <- h.faceService.RegisterFace(userID, videoData)
	}()

	// Wait for registration with timeout
	select {
	case err := <-errChan:
		if err != nil {
			h.logger.Error("Face registration failed",
				zap.Error(err),
				zap.String("user_id", userID),
				zap.String("filename", file.Filename))

			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Face registration failed",
				"code": "REGISTRATION_FAILED",
				"details": err.Error(),
			})
			return
		}

		h.logger.Info("Face registration completed",
			zap.String("user_id", userID),
			zap.String("filename", file.Filename))

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Face registered successfully",
			"user_id": userID,
			"timestamp": time.Now().UTC(),
		})

	case <-time.After(30 * time.Second):
		h.logger.Error("Face registration timeout", zap.String("user_id", userID))
		c.JSON(http.StatusRequestTimeout, gin.H{
			"error": "Face registration timeout",
			"code": "REGISTRATION_TIMEOUT",
		})
	}
}

func (h *VerificationHandler) GetVerificationStatus(c *gin.Context) {
	verificationID := c.Param("id")
	if verificationID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Verification ID is required",
			"code": "MISSING_VERIFICATION_ID",
		})
		return
	}

	// Validate verification ID format
	if !h.isValidVerificationID(verificationID) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid verification ID format",
			"code": "INVALID_VERIFICATION_ID",
		})
		return
	}

	// For now, return a mock response
	// In a real implementation, you'd check a database/cache
	h.logger.Info("Verification status requested", zap.String("verification_id", verificationID))

	c.JSON(http.StatusOK, gin.H{
		"verification_id": verificationID,
		"status": "completed",
		"verified": true,
		"timestamp": time.Now().UTC(),
	})
}

// Helper functions for validation

func (h *VerificationHandler) validateVideoFile(file *multipart.FileHeader) error {
	// Size validation
	if file.Size > 50*1024*1024 {
		return fmt.Errorf("video file too large. Maximum size is 50MB, got %d bytes", file.Size)
	}

	if file.Size < 1024 {
		return fmt.Errorf("video file too small. Minimum size is 1KB, got %d bytes", file.Size)
	}

	// Content type validation
	contentType := file.Header.Get("Content-Type")
	validTypes := []string{
		"video/webm",
		"video/mp4",
		"video/avi",
		"video/mov",
		"video/quicktime",
		"image/jpeg",  // Allow images for testing
		"image/png",
	}

	for _, validType := range validTypes {
		if contentType == validType {
			return nil
		}
	}

	return fmt.Errorf("invalid file type: %s. Supported types: video/webm, video/mp4, video/avi, video/mov", contentType)
}

func (h *VerificationHandler) readVideoFile(file *multipart.FileHeader) ([]byte, error) {
	src, err := file.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer src.Close()

	// Read with size limit to prevent memory exhaustion
	data := make([]byte, file.Size)
	_, err = io.ReadFull(src, data)
	if err != nil {
		return nil, fmt.Errorf("failed to read file data: %w", err)
	}

	return data, nil
}

func (h *VerificationHandler) isValidUserID(userID string) bool {
	// Basic validation: alphanumeric, hyphens, underscores, 1-64 chars
	if len(userID) < 1 || len(userID) > 64 {
		return false
	}

	for _, char := range userID {
		if !((char >= 'a' && char <= 'z') ||
			 (char >= 'A' && char <= 'Z') ||
			 (char >= '0' && char <= '9') ||
			 char == '-' || char == '_') {
			return false
		}
	}

	return true
}

func (h *VerificationHandler) isValidVerificationID(verificationID string) bool {
	// Verification IDs should be prefixed with "ver_"
	if len(verificationID) < 4 || !strings.HasPrefix(verificationID, "ver_") {
		return false
	}

	// Check remaining characters are valid
	suffix := verificationID[4:]
	if len(suffix) < 10 || len(suffix) > 30 {
		return false
	}

	for _, char := range suffix {
		if !((char >= 'a' && char <= 'z') ||
			 (char >= 'A' && char <= 'Z') ||
			 (char >= '0' && char <= '9')) {
			return false
		}
	}

	return true
}