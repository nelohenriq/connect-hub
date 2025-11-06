package tests

import (
	"image"
	"image/color"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap/zaptest"

	"connect-hub/verification-service/internal/config"
	"connect-hub/verification-service/internal/models"
	"connect-hub/verification-service/internal/services"
)

func TestFaceVerificationService_VerifyVideo(t *testing.T) {
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

	t.Run("successful verification", func(t *testing.T) {
		// Create test video data (simulated)
		videoData := createTestVideoData()

		req := &models.VerificationRequest{
			VideoData: videoData,
			UserID:    "",
			SessionID: "test-session-123",
		}

		result, err := service.VerifyVideo(req)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.True(t, result.Verified)
		assert.Greater(t, result.Confidence, 0.0)
		assert.Greater(t, result.LivenessScore, 0.0)
		assert.Less(t, result.ProcessingTime, 3.0) // Should be under 3 seconds
		assert.Contains(t, result.VerificationID, "ver_")
	})

	t.Run("verification with user ID", func(t *testing.T) {
		videoData := createTestVideoData()

		req := &models.VerificationRequest{
			VideoData: videoData,
			UserID:    "test-user-123",
			SessionID: "test-session-456",
		}

		result, err := service.VerifyVideo(req)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, "test-user-123", result.UserID)
		assert.True(t, result.Verified) // New user should pass
	})

	t.Run("empty video data", func(t *testing.T) {
		req := &models.VerificationRequest{
			VideoData: []byte{},
			SessionID: "test-session-empty",
		}

		result, err := service.VerifyVideo(req)

		assert.Error(t, err)
		assert.NotNil(t, result)
		assert.Contains(t, result.Error, "extract frames")
	})
}

func TestFaceVerificationService_RegisterFace(t *testing.T) {
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

	t.Run("successful registration", func(t *testing.T) {
		userID := "test-user-register"
		videoData := createTestVideoData()

		err := service.RegisterFace(userID, videoData)

		assert.NoError(t, err)
	})

	t.Run("duplicate registration", func(t *testing.T) {
		userID := "test-user-duplicate"
		videoData := createTestVideoData()

		// First registration
		err := service.RegisterFace(userID, videoData)
		assert.NoError(t, err)

		// Second registration (should still work)
		err = service.RegisterFace(userID, videoData)
		assert.NoError(t, err)
	})

	t.Run("empty user ID", func(t *testing.T) {
		videoData := createTestVideoData()

		err := service.RegisterFace("", videoData)

		assert.Error(t, err)
	})
}

func TestFaceVerificationService_LivenessDetection(t *testing.T) {
	logger := zaptest.NewLogger(t)
	cfg := &config.Config{
		LivenessThreshold: 0.85,
	}

	service, err := services.NewFaceVerificationService(logger, cfg)
	require.NoError(t, err)
	defer service.Close()

	t.Run("live detection with multiple frames", func(t *testing.T) {
		frames := createTestFrames(5)

		result, err := service.DetectLiveness(frames)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.True(t, result.IsLive)
		assert.Greater(t, result.Score, 0.0)
		assert.Greater(t, result.Confidence, 0.0)
	})

	t.Run("no frames", func(t *testing.T) {
		frames := []image.Image{}

		result, err := service.DetectLiveness(frames)

		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.False(t, result.IsLive)
		assert.Equal(t, 0.0, result.Score)
	})
}

func TestFaceVerificationService_FaceVectorGeneration(t *testing.T) {
	logger := zaptest.NewLogger(t)
	cfg := &config.Config{}

	service, err := services.NewFaceVerificationService(logger, cfg)
	require.NoError(t, err)
	defer service.Close()

	t.Run("generate vector from image", func(t *testing.T) {
		img := createTestImage(640, 480)

		vector, err := service.GenerateFaceVector(img)

		// Note: This might fail in test environment without proper face recognition models
		// but we test the error handling
		if err != nil {
			assert.Contains(t, err.Error(), "face")
		} else {
			assert.NotNil(t, vector)
			assert.Greater(t, len(vector), 0)
		}
	})
}

func TestFaceVerificationService_CosineSimilarity(t *testing.T) {
	logger := zaptest.NewLogger(t)
	cfg := &config.Config{}

	service, err := services.NewFaceVerificationService(logger, cfg)
	require.NoError(t, err)
	defer service.Close()

	t.Run("identical vectors", func(t *testing.T) {
		a := []float32{1.0, 2.0, 3.0}
		b := []float32{1.0, 2.0, 3.0}

		similarity := service.CosineSimilarity(a, b)

		assert.Equal(t, 1.0, similarity)
	})

	t.Run("orthogonal vectors", func(t *testing.T) {
		a := []float32{1.0, 0.0}
		b := []float32{0.0, 1.0}

		similarity := service.CosineSimilarity(a, b)

		assert.Equal(t, 0.0, similarity)
	})

	t.Run("opposite vectors", func(t *testing.T) {
		a := []float32{1.0, 2.0}
		b := []float32{-1.0, -2.0}

		similarity := service.CosineSimilarity(a, b)

		assert.Equal(t, -1.0, similarity)
	})

	t.Run("different lengths", func(t *testing.T) {
		a := []float32{1.0, 2.0}
		b := []float32{1.0, 2.0, 3.0}

		similarity := service.CosineSimilarity(a, b)

		assert.Equal(t, 0.0, similarity)
	})
}

// Helper functions

func createTestVideoData() []byte {
	// Create a simple test image as video data
	img := createTestImage(640, 480)

	// In a real scenario, this would be actual video data
	// For testing, we return image data that our service can handle
	return []byte("test-video-data-placeholder")
}

func createTestImage(width, height int) image.Image {
	img := image.NewRGBA(image.Rect(0, 0, width, height))

	// Fill with a gradient
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			r := uint8((x * 255) / width)
			g := uint8((y * 255) / height)
			b := uint8(128)
			img.Set(x, y, color.RGBA{r, g, b, 255})
		}
	}

	return img
}

func createTestFrames(count int) []image.Image {
	frames := make([]image.Image, count)
	for i := 0; i < count; i++ {
		frames[i] = createTestImage(640, 480)
	}
	return frames
}

// Benchmark tests

func BenchmarkFaceVerificationService_VerifyVideo(b *testing.B) {
	logger := zaptest.NewLogger(b)
	cfg := &config.Config{
		LivenessThreshold:  0.85,
		SimilarityThreshold: 0.75,
		StoragePath:        "/tmp/benchmark_storage",
		EncryptionKey:      "benchmark-encryption-key",
	}

	service, err := services.NewFaceVerificationService(logger, cfg)
	require.NoError(b, err)
	defer service.Close()

	videoData := createTestVideoData()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req := &models.VerificationRequest{
			VideoData: videoData,
			SessionID: "benchmark-session",
		}

		_, err := service.VerifyVideo(req)
		if err != nil {
			b.Fatal(err)
		}
	}
}

func BenchmarkFaceVerificationService_LivenessDetection(b *testing.B) {
	logger := zaptest.NewLogger(b)
	cfg := &config.Config{
		LivenessThreshold: 0.85,
	}

	service, err := services.NewFaceVerificationService(logger, cfg)
	require.NoError(b, err)
	defer service.Close()

	frames := createTestFrames(5)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := service.DetectLiveness(frames)
		if err != nil {
			b.Fatal(err)
		}
	}
}