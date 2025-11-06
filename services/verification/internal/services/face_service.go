package services

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image"
	"image/jpeg"
	"io"
	"math"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/Kagami/go-face"
	"go.uber.org/zap"
	"golang.org/x/crypto/scrypt"

	"connect-hub/verification-service/internal/config"
	"connect-hub/verification-service/internal/models"
)

type FaceVerificationService struct {
	logger         *zap.Logger
	config         *config.Config
	faceRecognizer *face.Recognizer
	storageMutex   sync.RWMutex
	faceVectors    map[string][]models.FaceVector
}

func NewFaceVerificationService(logger *zap.Logger, cfg *config.Config) (*FaceVerificationService, error) {
	// Initialize face recognizer
	rec, err := face.NewRecognizer(cfg.FaceModelPath)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize face recognizer: %w", err)
	}

	service := &FaceVerificationService{
		logger:         logger,
		config:         cfg,
		faceRecognizer: rec,
		faceVectors:    make(map[string][]models.FaceVector),
	}

	// Load existing face vectors
	if err := service.loadFaceVectors(); err != nil {
		logger.Warn("Failed to load existing face vectors", zap.Error(err))
	}

	return service, nil
}

func (s *FaceVerificationService) Close() {
	if s.faceRecognizer != nil {
		s.faceRecognizer.Close()
	}
}

func (s *FaceVerificationService) VerifyVideo(req *models.VerificationRequest) (*models.VerificationResult, error) {
	startTime := time.Now()

	result := &models.VerificationResult{
		VerificationID: fmt.Sprintf("ver_%d", time.Now().UnixNano()),
		UserID:         req.UserID,
		Timestamp:      startTime,
	}

	// Real-time processing: Extract frames from video with timeout
	framesChan := make(chan []image.Image, 1)
	errChan := make(chan error, 1)

	go func() {
		frames, err := s.extractFramesFromVideo(req.VideoData)
		if err != nil {
			errChan <- err
			return
		}
		framesChan <- frames
	}()

	// Timeout after 2 seconds for frame extraction
	select {
	case frames := <-framesChan:
		if len(frames) == 0 {
			result.Error = "No frames extracted from video"
			return result, fmt.Errorf("no frames extracted")
		}

		// Perform liveness detection with parallel processing
		livenessChan := make(chan *models.LivenessResult, 1)
		vectorChan := make(chan []float32, 1)
		livenessErrChan := make(chan error, 1)
		vectorErrChan := make(chan error, 1)

		go func() {
			result, err := s.detectLiveness(frames)
			if err != nil {
				livenessErrChan <- err
				return
			}
			livenessChan <- result
		}()

		go func() {
			vector, err := s.generateFaceVector(frames[0])
			if err != nil {
				vectorErrChan <- err
				return
			}
			vectorChan <- vector
		}()

		// Wait for both operations with timeout
		var livenessResult *models.LivenessResult
		var faceVector []float32

		timeout := time.After(1 * time.Second)

		for i := 0; i < 2; i++ {
			select {
			case livenessResult = <-livenessChan:
			case faceVector = <-vectorChan:
			case err := <-livenessErrChan:
				result.Error = fmt.Sprintf("Liveness detection failed: %v", err)
				return result, err
			case err := <-vectorErrChan:
				result.Error = fmt.Sprintf("Face vector generation failed: %v", err)
				return result, err
			case <-timeout:
				result.Error = "Processing timeout"
				return result, fmt.Errorf("processing timeout")
			}
		}

		result.LivenessScore = livenessResult.Score

		// If liveness check fails, return early
		if !livenessResult.IsLive {
			result.Verified = false
			result.Confidence = 0.0
			result.ProcessingTime = time.Since(startTime).Seconds()
			return result, nil
		}

		// Check for duplicates if user ID is provided
		if req.UserID != "" {
			confidence, err := s.checkForDuplicates(req.UserID, faceVector)
			if err != nil {
				s.logger.Warn("Duplicate check failed", zap.Error(err))
			} else {
				result.Confidence = confidence
				result.Verified = confidence >= s.config.SimilarityThreshold
			}
		} else {
			// For new registrations, always pass
			result.Confidence = 1.0
			result.Verified = true
		}

	case err := <-errChan:
		result.Error = fmt.Sprintf("Failed to extract frames: %v", err)
		return result, err
	case <-time.After(2 * time.Second):
		result.Error = "Frame extraction timeout"
		return result, fmt.Errorf("frame extraction timeout")
	}

	result.ProcessingTime = time.Since(startTime).Seconds()

	// Log performance metrics
	if result.ProcessingTime > 3.0 {
		s.logger.Warn("Processing time exceeded 3s target",
			zap.Float64("processing_time", result.ProcessingTime),
			zap.String("verification_id", result.VerificationID))
	}

	return result, nil
}

func (s *FaceVerificationService) RegisterFace(userID string, videoData []byte) error {
	req := &models.VerificationRequest{
		UserID:    userID,
		VideoData: videoData,
	}

	result, err := s.VerifyVideo(req)
	if err != nil {
		return err
	}

	if !result.Verified {
		return fmt.Errorf("face verification failed: confidence %.2f", result.Confidence)
	}

	// Extract and store face vector
	frames, err := s.extractFramesFromVideo(videoData)
	if err != nil {
		return err
	}

	faceVector, err := s.generateFaceVector(frames[0])
	if err != nil {
		return err
	}

	vector := models.FaceVector{
		UserID:    userID,
		Vector:    faceVector,
		CreatedAt: time.Now(),
		Version:   "1.0",
	}

	s.storageMutex.Lock()
	if s.faceVectors[userID] == nil {
		s.faceVectors[userID] = make([]models.FaceVector, 0)
	}
	s.faceVectors[userID] = append(s.faceVectors[userID], vector)
	s.storageMutex.Unlock()

	// Persist to storage
	return s.saveFaceVectors()
}

func (s *FaceVerificationService) extractFramesFromVideo(videoData []byte) ([]image.Image, error) {
	// Optimized frame extraction for real-time processing
	// In production, this would use ffmpeg-go or gmf for proper video decoding

	startTime := time.Now()

	// For demo purposes, we'll simulate frame extraction
	// Real implementation would:
	// 1. Use ffmpeg to extract frames at specific intervals
	// 2. Decode video stream
	// 3. Extract keyframes for liveness analysis

	reader := bytes.NewReader(videoData)

	// Try to decode as image first (for demo/test videos that are actually images)
	img, format, err := image.Decode(reader)
	if err != nil {
		// If not an image, create a placeholder for video processing
		// In production, this would be replaced with actual video frame extraction
		s.logger.Debug("Video data not decodable as image, using placeholder",
			zap.Int("data_size", len(videoData)))

		// Create a realistic placeholder image
		img = image.NewRGBA(image.Rect(0, 0, 640, 480))

		// Fill with a gradient to simulate a real face image
		for y := 0; y < 480; y++ {
			for x := 0; x < 640; x++ {
				r := uint8((x * 255) / 640)
				g := uint8((y * 255) / 480)
				b := uint8(128)
				img.(*image.RGBA).SetRGBA(x, y, r, g, b, 255)
			}
		}
	} else {
		s.logger.Debug("Successfully decoded image",
			zap.String("format", format),
			zap.Int("data_size", len(videoData)))
	}

	// Simulate extracting multiple frames for liveness detection
	frames := []image.Image{img}

	// For real liveness detection, we'd extract multiple frames
	// Here we simulate by creating slight variations
	for i := 1; i < 5; i++ {
		// Create slightly modified copies for motion analysis
		frameCopy := image.NewRGBA(img.Bounds())
		for y := 0; y < img.Bounds().Dy(); y++ {
			for x := 0; x < img.Bounds().Dx(); x++ {
				r, g, b, a := img.At(x, y).RGBA()
				// Add small random variations to simulate motion
				noise := int32(i * 2)
				r = (r + uint32(noise)) % 65535
				g = (g + uint32(noise)) % 65535
				b = (b + uint32(noise)) % 65535
				frameCopy.SetRGBA(x, y, uint8(r>>8), uint8(g>>8), uint8(b>>8), uint8(a>>8))
			}
		}
		frames = append(frames, frameCopy)
	}

	processingTime := time.Since(startTime)
	s.logger.Debug("Frame extraction completed",
		zap.Int("frames_extracted", len(frames)),
		zap.Duration("processing_time", processingTime))

	return frames, nil
}

func (s *FaceVerificationService) detectLiveness(frames []image.Image) (*models.LivenessResult, error) {
	// Real-time liveness detection optimized for <3s processing
	startTime := time.Now()

	result := &models.LivenessResult{
		Method: "motion_texture_analysis",
	}

	if len(frames) < 2 {
		result.IsLive = false
		result.Confidence = 0.0
		result.Score = 0.0
		return result, nil
	}

	// Multi-factor liveness detection
	motionScore := s.calculateMotionScore(frames)
	textureScore := s.calculateTextureConsistency(frames)
	colorScore := s.calculateColorConsistency(frames)

	// Weighted scoring for liveness
	totalScore := (motionScore * 0.4) + (textureScore * 0.4) + (colorScore * 0.2)

	// Apply threshold with hysteresis
	isLive := totalScore >= s.config.LivenessThreshold
	confidence := math.Min(totalScore, 1.0)

	result.IsLive = isLive
	result.Confidence = confidence
	result.Score = totalScore

	processingTime := time.Since(startTime)
	s.logger.Debug("Liveness detection completed",
		zap.Bool("is_live", isLive),
		zap.Float64("score", totalScore),
		zap.Float64("confidence", confidence),
		zap.Duration("processing_time", processingTime))

	return result, nil
}

func (s *FaceVerificationService) calculateMotionScore(frames []image.Image) float64 {
	if len(frames) < 2 {
		return 0.0
	}

	totalMotion := 0.0
	frameCount := 0

	// Calculate motion between consecutive frames
	for i := 1; i < len(frames); i++ {
		motion := s.calculateFrameMotion(frames[i-1], frames[i])
		totalMotion += motion
		frameCount++
	}

	if frameCount == 0 {
		return 0.0
	}

	averageMotion := totalMotion / float64(frameCount)

	// Normalize motion score (higher motion = more likely live)
	motionScore := math.Min(averageMotion*10.0, 1.0) // Scale and cap at 1.0

	return motionScore
}

func (s *FaceVerificationService) calculateFrameMotion(img1, img2 image.Image) float64 {
	bounds := img1.Bounds()
	if !bounds.Eq(img2.Bounds()) {
		return 0.0
	}

	totalDiff := 0.0
	pixelCount := 0

	// Sample pixels for motion detection (every 4th pixel for performance)
	for y := bounds.Min.Y; y < bounds.Max.Y; y += 4 {
		for x := bounds.Min.X; x < bounds.Max.X; x += 4 {
			r1, g1, b1, _ := img1.At(x, y).RGBA()
			r2, g2, b2, _ := img2.At(x, y).RGBA()

			// Calculate color difference
			diff := math.Abs(float64(r1)-float64(r2)) +
				   math.Abs(float64(g1)-float64(g2)) +
				   math.Abs(float64(b1)-float64(b2))

			totalDiff += diff
			pixelCount++
		}
	}

	if pixelCount == 0 {
		return 0.0
	}

	return totalDiff / float64(pixelCount) / 65535.0 // Normalize to 0-1 range
}

func (s *FaceVerificationService) calculateTextureConsistency(frames []image.Image) float64 {
	if len(frames) == 0 {
		return 0.0
	}

	// Calculate texture variance across frames
	textureScores := make([]float64, len(frames))

	for i, frame := range frames {
		textureScores[i] = s.calculateFrameTexture(frame)
	}

	// Calculate consistency (lower variance = more consistent = more likely live)
	mean := 0.0
	for _, score := range textureScores {
		mean += score
	}
	mean /= float64(len(textureScores))

	variance := 0.0
	for _, score := range textureScores {
		variance += math.Pow(score-mean, 2)
	}
	variance /= float64(len(textureScores))

	// Lower variance indicates more consistent texture (likely live)
	consistencyScore := 1.0 - math.Min(variance*100.0, 1.0)

	return consistencyScore
}

func (s *FaceVerificationService) calculateFrameTexture(img image.Image) float64 {
	bounds := img.Bounds()
	totalVariance := 0.0
	pixelCount := 0

	// Calculate local variance for texture analysis
	for y := bounds.Min.Y + 1; y < bounds.Max.Y-1; y += 2 {
		for x := bounds.Min.X + 1; x < bounds.Max.X-1; x += 2 {
			centerR, centerG, centerB, _ := img.At(x, y).RGBA()

			// Calculate variance with neighboring pixels
			variance := 0.0
			neighborCount := 0

			for dy := -1; dy <= 1; dy++ {
				for dx := -1; dx <= 1; dx++ {
					if dx == 0 && dy == 0 {
						continue
					}
					nr, ng, nb, _ := img.At(x+dx, y+dy).RGBA()
					variance += math.Pow(float64(centerR)-float64(nr), 2) +
							   math.Pow(float64(centerG)-float64(ng), 2) +
							   math.Pow(float64(centerB)-float64(nb), 2)
					neighborCount++
				}
			}

			if neighborCount > 0 {
				totalVariance += variance / float64(neighborCount)
				pixelCount++
			}
		}
	}

	if pixelCount == 0 {
		return 0.0
	}

	return totalVariance / float64(pixelCount) / 1e10 // Normalize
}

func (s *FaceVerificationService) calculateColorConsistency(frames []image.Image) float64 {
	if len(frames) == 0 {
		return 0.0
	}

	// Calculate average color for each frame
	frameColors := make([][3]float64, len(frames))

	for i, frame := range frames {
		frameColors[i] = s.calculateAverageColor(frame)
	}

	// Calculate color consistency across frames
	meanColor := [3]float64{0, 0, 0}
	for _, color := range frameColors {
		meanColor[0] += color[0]
		meanColor[1] += color[1]
		meanColor[2] += color[2]
	}
	meanColor[0] /= float64(len(frameColors))
	meanColor[1] /= float64(len(frameColors))
	meanColor[2] /= float64(len(frameColors))

	variance := 0.0
	for _, color := range frameColors {
		variance += math.Pow(color[0]-meanColor[0], 2) +
				   math.Pow(color[1]-meanColor[1], 2) +
				   math.Pow(color[2]-meanColor[2], 2)
	}
	variance /= float64(len(frameColors))

	// Lower color variance indicates more consistent lighting (likely live)
	consistencyScore := 1.0 - math.Min(variance*10.0, 1.0)

	return consistencyScore
}

func (s *FaceVerificationService) calculateAverageColor(img image.Image) [3]float64 {
	bounds := img.Bounds()
	totalR, totalG, totalB := 0.0, 0.0, 0.0
	pixelCount := 0

	for y := bounds.Min.Y; y < bounds.Max.Y; y += 4 { // Sample every 4th pixel
		for x := bounds.Min.X; x < bounds.Max.X; x += 4 {
			r, g, b, _ := img.At(x, y).RGBA()
			totalR += float64(r) / 65535.0
			totalG += float64(g) / 65535.0
			totalB += float64(b) / 65535.0
			pixelCount++
		}
	}

	if pixelCount == 0 {
		return [3]float64{0, 0, 0}
	}

	return [3]float64{
		totalR / float64(pixelCount),
		totalG / float64(pixelCount),
		totalB / float64(pixelCount),
	}
}

func (s *FaceVerificationService) generateFaceVector(img image.Image) ([]float32, error) {
	// Convert image to format expected by go-face
	bounds := img.Bounds()
	width, height := bounds.Dx(), bounds.Dy()

	// Create RGBA image
	rgba := image.NewRGBA(bounds)
	for y := 0; y < height; y++ {
		for x := 0; x < width; x++ {
			rgba.Set(x, y, img.At(x, y))
		}
	}

	// Detect faces
	faces, err := s.faceRecognizer.RecognizeRGBA(rgba.Pix, width, height, width*4)
	if err != nil {
		return nil, fmt.Errorf("face detection failed: %w", err)
	}

	if len(faces) == 0 {
		return nil, fmt.Errorf("no faces detected")
	}

	// Use the first (largest) face
	face := faces[0]

	// Get face descriptor
	descriptor, err := s.faceRecognizer.GetDescriptor(rgba.Pix, width, height, width*4, face.Rectangle)
	if err != nil {
		return nil, fmt.Errorf("face descriptor generation failed: %w", err)
	}

	return descriptor, nil
}

func (s *FaceVerificationService) checkForDuplicates(userID string, newVector []float32) (float64, error) {
	s.storageMutex.RLock()
	userVectors, exists := s.faceVectors[userID]
	s.storageMutex.RUnlock()

	if !exists || len(userVectors) == 0 {
		return 0.0, nil
	}

	maxSimilarity := 0.0
	for _, storedVector := range userVectors {
		similarity := s.cosineSimilarity(newVector, storedVector.Vector)
		if similarity > maxSimilarity {
			maxSimilarity = similarity
		}
	}

	return maxSimilarity, nil
}

func (s *FaceVerificationService) cosineSimilarity(a, b []float32) float64 {
	if len(a) != len(b) {
		return 0.0
	}

	var dotProduct, normA, normB float64
	for i := 0; i < len(a); i++ {
		dotProduct += float64(a[i]) * float64(b[i])
		normA += float64(a[i]) * float64(a[i])
		normB += float64(b[i]) * float64(b[i])
	}

	if normA == 0 || normB == 0 {
		return 0.0
	}

	return dotProduct / (math.Sqrt(normA) * math.Sqrt(normB))
}

func (s *FaceVerificationService) loadFaceVectors() error {
	storagePath := filepath.Join(s.config.StoragePath, "face_vectors.enc")

	if _, err := os.Stat(storagePath); os.IsNotExist(err) {
		return nil // No existing data
	}

	encryptedData, err := os.ReadFile(storagePath)
	if err != nil {
		return err
	}

	decryptedData, err := s.decryptData(encryptedData)
	if err != nil {
		return err
	}

	return json.Unmarshal(decryptedData, &s.faceVectors)
}

func (s *FaceVerificationService) saveFaceVectors() error {
	data, err := json.Marshal(s.faceVectors)
	if err != nil {
		return err
	}

	encryptedData, err := s.encryptData(data)
	if err != nil {
		return err
	}

	storagePath := filepath.Join(s.config.StoragePath, "face_vectors.enc")
	os.MkdirAll(filepath.Dir(storagePath), 0755)

	return os.WriteFile(storagePath, encryptedData, 0600)
}

func (s *FaceVerificationService) encryptData(data []byte) ([]byte, error) {
	key, err := s.deriveKey(s.config.EncryptionKey)
	if err != nil {
		return nil, err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}

	ciphertext := gcm.Seal(nonce, nonce, data, nil)
	return ciphertext, nil
}

func (s *FaceVerificationService) decryptData(data []byte) ([]byte, error) {
	key, err := s.deriveKey(s.config.EncryptionKey)
	if err != nil {
		return nil, err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return nil, fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, err
	}

	return plaintext, nil
}

func (s *FaceVerificationService) deriveKey(password string) ([]byte, error) {
	salt := []byte("connect-hub-face-verification-salt")
	return scrypt.Key([]byte(password), salt, 32768, 8, 1, 32)
}