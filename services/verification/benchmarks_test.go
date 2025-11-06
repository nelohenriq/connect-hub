package main

import (
	"image"
	"testing"
	"time"

	"go.uber.org/zap/zaptest"

	"connect-hub/verification-service/internal/config"
	"connect-hub/verification-service/internal/models"
	"connect-hub/verification-service/internal/services"
)

// BenchmarkFaceVerificationService_VerifyVideo benchmarks the video verification process
func BenchmarkFaceVerificationService_VerifyVideo(b *testing.B) {
	logger := zaptest.NewLogger(b)
	cfg := &config.Config{
		LivenessThreshold:  0.85,
		SimilarityThreshold: 0.75,
		StoragePath:        "/tmp/benchmark_storage",
		EncryptionKey:      "benchmark-encryption-key",
	}

	service, err := services.NewFaceVerificationService(logger, cfg)
	if err != nil {
		b.Fatal(err)
	}
	defer service.Close()

	// Create test video data
	videoData := createBenchmarkVideoData()

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		req := &models.VerificationRequest{
			VideoData: videoData,
			SessionID: "benchmark-session",
		}

		result, err := service.VerifyVideo(req)
		if err != nil {
			b.Fatal(err)
		}

		// Verify the result meets performance criteria
		if result.ProcessingTime > 3.0 {
			b.Errorf("Processing time exceeded 3s target: %.2fs", result.ProcessingTime)
		}
	}
}

// BenchmarkFaceVerificationService_LivenessDetection benchmarks liveness detection
func BenchmarkFaceVerificationService_LivenessDetection(b *testing.B) {
	logger := zaptest.NewLogger(b)
	cfg := &config.Config{
		LivenessThreshold: 0.85,
	}

	service, err := services.NewFaceVerificationService(logger, cfg)
	if err != nil {
		b.Fatal(err)
	}
	defer service.Close()

	frames := createBenchmarkFrames(5)

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		_, err := service.DetectLiveness(frames)
		if err != nil {
			b.Fatal(err)
		}
	}
}

// BenchmarkFaceVerificationService_FaceVectorGeneration benchmarks face vector generation
func BenchmarkFaceVerificationService_FaceVectorGeneration(b *testing.B) {
	logger := zaptest.NewLogger(b)
	cfg := &config.Config{}

	service, err := services.NewFaceVerificationService(logger, cfg)
	if err != nil {
		b.Fatal(err)
	}
	defer service.Close()

	img := createBenchmarkImage(640, 480)

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		_, err := service.GenerateFaceVector(img)
		// Note: May fail without proper models, but we test the performance of the attempt
		_ = err // Ignore errors for benchmarking
	}
}

// BenchmarkFaceVerificationService_CosineSimilarity benchmarks similarity calculation
func BenchmarkFaceVerificationService_CosineSimilarity(b *testing.B) {
	logger := zaptest.NewLogger(b)
	cfg := &config.Config{}

	service, err := services.NewFaceVerificationService(logger, cfg)
	if err != nil {
		b.Fatal(err)
	}
	defer service.Close()

	vector1 := createBenchmarkVector(128)
	vector2 := createBenchmarkVector(128)

	b.ResetTimer()
	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		_ = service.CosineSimilarity(vector1, vector2)
	}
}

// Benchmark concurrent processing
func BenchmarkFaceVerificationService_ConcurrentProcessing(b *testing.B) {
	logger := zaptest.NewLogger(b)
	cfg := &config.Config{
		LivenessThreshold:  0.85,
		SimilarityThreshold: 0.75,
		StoragePath:        "/tmp/concurrent_benchmark_storage",
		EncryptionKey:      "concurrent-benchmark-encryption-key",
	}

	service, err := services.NewFaceVerificationService(logger, cfg)
	if err != nil {
		b.Fatal(err)
	}
	defer service.Close()

	videoData := createBenchmarkVideoData()
	numWorkers := 10

	b.ResetTimer()
	b.ReportAllocs()

	b.RunParallel(func(pb *testing.PB) {
		localService, _ := services.NewFaceVerificationService(logger, cfg)
		defer localService.Close()

		for pb.Next() {
			req := &models.VerificationRequest{
				VideoData: videoData,
				SessionID: "concurrent-session",
			}

			_, err := localService.VerifyVideo(req)
			if err != nil {
				b.Fatal(err)
			}
		}
	})
}

// Performance test with different video sizes
func BenchmarkFaceVerificationService_VideoSizeImpact(b *testing.B) {
	logger := zaptest.NewLogger(b)
	cfg := &config.Config{
		LivenessThreshold:  0.85,
		SimilarityThreshold: 0.75,
	}

	service, err := services.NewFaceVerificationService(logger, cfg)
	if err != nil {
		b.Fatal(err)
	}
	defer service.Close()

	sizes := []int{1024, 5120, 10240, 25600} // 1KB, 5KB, 10KB, 25KB

	for _, size := range sizes {
		b.Run(fmt.Sprintf("VideoSize_%dKB", size/1024), func(b *testing.B) {
			videoData := make([]byte, size*1024)
			for i := range videoData {
				videoData[i] = byte(i % 256)
			}

			b.ResetTimer()

			for i := 0; i < b.N; i++ {
				req := &models.VerificationRequest{
					VideoData: videoData,
					SessionID: "size-test-session",
				}

				start := time.Now()
				_, err := service.VerifyVideo(req)
				duration := time.Since(start)

				if err != nil {
					b.Fatal(err)
				}

				// Log performance for analysis
				if duration > 3*time.Second {
					b.Logf("Slow processing for %dKB video: %v", size/1024, duration)
				}
			}
		})
	}
}

// Memory usage benchmark
func BenchmarkFaceVerificationService_MemoryUsage(b *testing.B) {
	logger := zaptest.NewLogger(b)
	cfg := &config.Config{
		LivenessThreshold:  0.85,
		SimilarityThreshold: 0.75,
	}

	b.ReportAllocs()

	for i := 0; i < b.N; i++ {
		service, err := services.NewFaceVerificationService(logger, cfg)
		if err != nil {
			b.Fatal(err)
		}

		videoData := createBenchmarkVideoData()
		req := &models.VerificationRequest{
			VideoData: videoData,
			SessionID: "memory-test-session",
		}

		_, err = service.VerifyVideo(req)
		if err != nil {
			b.Fatal(err)
		}

		service.Close()
	}
}

// Helper functions for benchmarks

func createBenchmarkVideoData() []byte {
	// Create a realistic test video data size (around 100KB)
	data := make([]byte, 100*1024)
	for i := range data {
		data[i] = byte(i % 256)
	}
	return data
}

func createBenchmarkFrames(count int) []image.Image {
	frames := make([]image.Image, count)
	for i := 0; i < count; i++ {
		frames[i] = createBenchmarkImage(640, 480)
	}
	return frames
}

func createBenchmarkImage(width, height int) image.Image {
	img := image.NewRGBA(image.Rect(0, 0, width, height))

	// Fill with a more realistic pattern
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

func createBenchmarkVector(size int) []float32 {
	vector := make([]float32, size)
	for i := 0; i < size; i++ {
		vector[i] = float32(i) / float32(size)
	}
	return vector
}

// Import required packages
import (
	"fmt"
	"image/color"
)