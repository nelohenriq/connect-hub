package tests

import (
	"bytes"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap/zaptest"

	"connect-hub/verification-service/internal/config"
	"connect-hub/verification-service/internal/handlers"
	"connect-hub/verification-service/internal/services"
)

func TestVerificationHandler_VerifyVideo(t *testing.T) {
	logger := zaptest.NewLogger(t)
	cfg := &config.Config{
		LivenessThreshold:  0.85,
		SimilarityThreshold: 0.75,
		StoragePath:        "/tmp/test_storage",
		EncryptionKey:      "test-encryption-key-for-testing-only",
	}

	service, err := services.NewFaceVerificationService(logger, cfg)
	require.NoError(t, err)
	defer service.Close()

	handler := handlers.NewVerificationHandler(service, logger)

	t.Run("successful verification", func(t *testing.T) {
		// Create multipart form data
		body, contentType, err := createMultipartForm(map[string]interface{}{
			"video": createTestVideoFile(),
		})
		require.NoError(t, err)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("POST", "/api/v1/verify", body)
		c.Request.Header.Set("Content-Type", contentType)

		handler.VerifyVideo(c)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.True(t, response["success"].(bool))
		assert.NotNil(t, response["data"])
	})

	t.Run("missing video file", func(t *testing.T) {
		body, contentType, err := createMultipartForm(map[string]interface{}{})
		require.NoError(t, err)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("POST", "/api/v1/verify", body)
		c.Request.Header.Set("Content-Type", contentType)

		handler.VerifyVideo(c)

		assert.Equal(t, http.StatusBadRequest, w.Code)

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Contains(t, response["error"], "Video file is required")
		assert.Equal(t, "MISSING_VIDEO_FILE", response["code"])
	})

	t.Run("invalid file type", func(t *testing.T) {
		// Create a file with invalid content type
		body, contentType, err := createMultipartForm(map[string]interface{}{
			"video": createInvalidFile(),
		})
		require.NoError(t, err)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("POST", "/api/v1/verify", body)
		c.Request.Header.Set("Content-Type", contentType)

		handler.VerifyVideo(c)

		assert.Equal(t, http.StatusBadRequest, w.Code)

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Contains(t, response["error"], "invalid file type")
		assert.Equal(t, "INVALID_VIDEO_FILE", response["code"])
	})

	t.Run("file too large", func(t *testing.T) {
		// Create a large file
		largeData := make([]byte, 60*1024*1024) // 60MB
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

		handler.VerifyVideo(c)

		assert.Equal(t, http.StatusBadRequest, w.Code)

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Contains(t, response["error"], "too large")
		assert.Equal(t, "INVALID_VIDEO_FILE", response["code"])
	})
}

func TestVerificationHandler_RegisterFace(t *testing.T) {
	logger := zaptest.NewLogger(t)
	cfg := &config.Config{
		LivenessThreshold:  0.85,
		SimilarityThreshold: 0.75,
		StoragePath:        "/tmp/test_storage",
		EncryptionKey:      "test-encryption-key-for-testing-only",
	}

	service, err := services.NewFaceVerificationService(logger, cfg)
	require.NoError(t, err)
	defer service.Close()

	handler := handlers.NewVerificationHandler(service, logger)

	t.Run("successful registration", func(t *testing.T) {
		body, contentType, err := createMultipartForm(map[string]interface{}{
			"video":   createTestVideoFile(),
			"user_id": "test-user-123",
		})
		require.NoError(t, err)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("POST", "/api/v1/register", body)
		c.Request.Header.Set("Content-Type", contentType)

		handler.RegisterFace(c)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.True(t, response["success"].(bool))
		assert.Equal(t, "test-user-123", response["user_id"])
	})

	t.Run("missing user ID", func(t *testing.T) {
		body, contentType, err := createMultipartForm(map[string]interface{}{
			"video": createTestVideoFile(),
		})
		require.NoError(t, err)

		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Request = httptest.NewRequest("POST", "/api/v1/register", body)
		c.Request.Header.Set("Content-Type", contentType)

		handler.RegisterFace(c)

		assert.Equal(t, http.StatusBadRequest, w.Code)

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Contains(t, response["error"], "User ID is required")
		assert.Equal(t, "MISSING_USER_ID", response["code"])
	})
}

func TestVerificationHandler_GetVerificationStatus(t *testing.T) {
	logger := zaptest.NewLogger(t)
	cfg := &config.Config{}

	service, err := services.NewFaceVerificationService(logger, cfg)
	require.NoError(t, err)
	defer service.Close()

	handler := handlers.NewVerificationHandler(service, logger)

	t.Run("valid verification ID", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{{Key: "id", Value: "ver_1234567890"}}

		handler.GetVerificationStatus(c)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "ver_1234567890", response["verification_id"])
		assert.Equal(t, "completed", response["status"])
	})

	t.Run("missing verification ID", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)

		handler.GetVerificationStatus(c)

		assert.Equal(t, http.StatusBadRequest, w.Code)

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Contains(t, response["error"], "Verification ID is required")
		assert.Equal(t, "MISSING_VERIFICATION_ID", response["code"])
	})

	t.Run("invalid verification ID", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		c.Params = gin.Params{{Key: "id", Value: "invalid-id"}}

		handler.GetVerificationStatus(c)

		assert.Equal(t, http.StatusBadRequest, w.Code)

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Contains(t, response["error"], "Invalid verification ID format")
		assert.Equal(t, "INVALID_VERIFICATION_ID", response["code"])
	})
}

// Helper types and functions

type fileData struct {
	filename    string
	contentType string
	data        []byte
}

func createMultipartForm(fields map[string]interface{}) (*bytes.Buffer, string, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	for key, value := range fields {
		switch v := value.(type) {
		case *fileData:
			part, err := writer.CreateFormFile(key, v.filename)
			if err != nil {
				return nil, "", err
			}
			part.Write(v.data)
		case string:
			writer.WriteField(key, v)
		}
	}

	writer.Close()
	return body, writer.FormDataContentType(), nil
}

func createTestVideoFile() *fileData {
	// Create a small test video file (actually just test data)
	data := make([]byte, 1024)
	for i := range data {
		data[i] = byte(i % 256)
	}

	return &fileData{
		filename:    "test.webm",
		contentType: "video/webm",
		data:        data,
	}
}

func createInvalidFile() *fileData {
	return &fileData{
		filename:    "test.txt",
		contentType: "text/plain",
		data:        []byte("invalid file content"),
	}
}

// Import json for unmarshaling
import (
	"encoding/json"
)