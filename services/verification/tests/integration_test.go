package tests

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap/zaptest"

	"connect-hub/verification-service/internal/config"
	"connect-hub/verification-service/internal/handlers"
	"connect-hub/verification-service/internal/middleware"
	"connect-hub/verification-service/internal/services"
)

func TestIntegration_FullVerificationFlow(t *testing.T) {
	logger := zaptest.NewLogger(t)
	cfg := &config.Config{
		LivenessThreshold:  0.85,
		SimilarityThreshold: 0.75,
		StoragePath:        "/tmp/integration_test_storage",
		EncryptionKey:      "integration-test-encryption-key",
	}

	// Initialize service
	service, err := services.NewFaceVerificationService(logger, cfg)
	require.NoError(t, err)
	defer service.Close()

	// Setup router with middleware
	gin.SetMode(gin.TestMode)
	router := gin.New()

	// Add middleware
	router.Use(middleware.Logger(logger))
	router.Use(middleware.CORS())
	router.Use(middleware.Recovery(logger))

	// Add handlers
	verificationHandler := handlers.NewVerificationHandler(service, logger)
	v1 := router.Group("/api/v1")
	{
		v1.POST("/verify", verificationHandler.VerifyVideo)
		v1.POST("/register", verificationHandler.RegisterFace)
		v1.GET("/status/:id", verificationHandler.GetVerificationStatus)
	}

	t.Run("complete verification workflow", func(t *testing.T) {
		// Step 1: Register a face
		userID := "integration-test-user"

		// Create registration request
		regBody, regContentType, err := createMultipartForm(map[string]interface{}{
			"video":   createTestVideoFile(),
			"user_id": userID,
		})
		require.NoError(t, err)

		regReq := httptest.NewRequest("POST", "/api/v1/register", regBody)
		regReq.Header.Set("Content-Type", regContentType)

		regW := httptest.NewRecorder()
		router.ServeHTTP(regW, regReq)

		assert.Equal(t, http.StatusOK, regW.Code)

		var regResponse map[string]interface{}
		err = json.Unmarshal(regW.Body.Bytes(), &regResponse)
		require.NoError(t, err)
		assert.True(t, regResponse["success"].(bool))

		// Step 2: Verify the same user
		verifyBody, verifyContentType, err := createMultipartForm(map[string]interface{}{
			"video":   createTestVideoFile(),
			"user_id": userID,
		})
		require.NoError(t, err)

		verifyReq := httptest.NewRequest("POST", "/api/v1/verify", verifyBody)
		verifyReq.Header.Set("Content-Type", verifyContentType)

		verifyW := httptest.NewRecorder()
		router.ServeHTTP(verifyW, verifyReq)

		assert.Equal(t, http.StatusOK, verifyW.Code)

		var verifyResponse map[string]interface{}
		err = json.Unmarshal(verifyW.Body.Bytes(), &verifyResponse)
		require.NoError(t, err)

		assert.True(t, verifyResponse["success"].(bool))

		data := verifyResponse["data"].(map[string]interface{})
		assert.True(t, data["verified"].(bool))
		assert.Greater(t, data["confidence"].(float64), 0.0)
		assert.Less(t, data["processing_time"].(float64), 3.0)

		verificationID := data["verification_id"].(string)

		// Step 3: Check verification status
		statusReq := httptest.NewRequest("GET", "/api/v1/status/"+verificationID, nil)
		statusW := httptest.NewRecorder()
		router.ServeHTTP(statusW, statusReq)

		assert.Equal(t, http.StatusOK, statusW.Code)

		var statusResponse map[string]interface{}
		err = json.Unmarshal(statusW.Body.Bytes(), &statusResponse)
		require.NoError(t, err)

		assert.Equal(t, verificationID, statusResponse["verification_id"])
		assert.Equal(t, "completed", statusResponse["status"])
	})

	t.Run("concurrent requests", func(t *testing.T) {
		numRequests := 5
		results := make(chan bool, numRequests)

		for i := 0; i < numRequests; i++ {
			go func() {
				body, contentType, err := createMultipartForm(map[string]interface{}{
					"video": createTestVideoFile(),
				})
				if err != nil {
					results <- false
					return
				}

				req := httptest.NewRequest("POST", "/api/v1/verify", body)
				req.Header.Set("Content-Type", contentType)

				w := httptest.NewRecorder()
				router.ServeHTTP(w, req)

				results <- w.Code == http.StatusOK
			}()
		}

		// Wait for all requests to complete
		successCount := 0
		for i := 0; i < numRequests; i++ {
			if <-results {
				successCount++
			}
		}

		assert.Equal(t, numRequests, successCount)
	})

	t.Run("performance under load", func(t *testing.T) {
		numRequests := 10
		processingTimes := make([]float64, numRequests)

		for i := 0; i < numRequests; i++ {
			start := time.Now()

			body, contentType, err := createMultipartForm(map[string]interface{}{
				"video": createTestVideoFile(),
			})
			require.NoError(t, err)

			req := httptest.NewRequest("POST", "/api/v1/verify", body)
			req.Header.Set("Content-Type", contentType)

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			elapsed := time.Since(start).Seconds()
			processingTimes[i] = elapsed

			assert.Equal(t, http.StatusOK, w.Code)
		}

		// Calculate average processing time
		total := 0.0
		for _, t := range processingTimes {
			total += t
		}
		average := total / float64(numRequests)

		// Should be well under 3 seconds
		assert.Less(t, average, 2.0, "Average processing time should be under 2 seconds")

		// All individual requests should be under 3 seconds
		for i, t := range processingTimes {
			assert.Less(t, t, 3.0, "Request %d took too long: %.2fs", i, t)
		}
	})

	t.Run("error handling and recovery", func(t *testing.T) {
		// Test with invalid data
		invalidBody := bytes.NewBufferString("invalid multipart data")

		req := httptest.NewRequest("POST", "/api/v1/verify", invalidBody)
		req.Header.Set("Content-Type", "multipart/form-data")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		// Should not crash, should return error
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("health check", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/health", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "healthy", response["status"])
		assert.NotNil(t, response["timestamp"])
	})
}

func TestIntegration_ErrorScenarios(t *testing.T) {
	logger := zaptest.NewLogger(t)
	cfg := &config.Config{}

	service, err := services.NewFaceVerificationService(logger, cfg)
	require.NoError(t, err)
	defer service.Close()

	handler := handlers.NewVerificationHandler(service, logger)

	t.Run("timeout handling", func(t *testing.T) {
		// Create a large file that might cause timeout
		largeData := make([]byte, 10*1024*1024) // 10MB
		for i := range largeData {
			largeData[i] = byte(i % 256)
		}

		body, contentType, err := createMultipartForm(map[string]interface{}{
			"video": &fileData{
				filename:    "large.webm",
				contentType: "video/webm",
				data:        largeData,
			},
		})
		require.NoError(t, err)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("POST", "/api/v1/verify", body)
		c.Request.Header.Set("Content-Type", contentType)

		// This should complete within timeout or return appropriate error
		handler.VerifyVideo(c)

		// Should either succeed or return a proper error (not crash)
		assert.True(t, w.Code == http.StatusOK || w.Code == http.StatusBadRequest ||
				   w.Code == http.StatusInternalServerError)
	})
}

// Import json for unmarshaling
import (
	"encoding/json"
)