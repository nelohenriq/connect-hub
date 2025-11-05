"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface VideoVerificationProps {
  onVerificationComplete: (result: VerificationResult) => void;
  onError: (error: string) => void;
}

interface VerificationResult {
  verified: boolean;
  confidence: number;
  verificationId: string;
  timestamp: string;
}

export default function VideoVerification({
  onVerificationComplete,
  onError,
}: VideoVerificationProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        setRecordedVideo(blob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      // Auto-stop after 10 seconds
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          stopRecording();
        }
      }, 10000);
    } catch (err) {
      setError("Failed to access camera. Please check permissions.");
      onError("Camera access denied");
    }
  }, [onError]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  }, []);

  const submitVerification = useCallback(async () => {
    if (!recordedVideo) return;

    setIsProcessing(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("video", recordedVideo, "verification.webm");

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch("/api/verification", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        throw new Error("Verification failed");
      }

      const result = await response.json();

      if (result.success) {
        onVerificationComplete(result.data);
      } else {
        throw new Error(result.error || "Verification failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      onError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsProcessing(false);
    }
  }, [recordedVideo, onVerificationComplete, onError]);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Video Verification
        </CardTitle>
        <CardDescription>
          Record a 10-second video to verify your identity. Follow the on-screen
          instructions.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />

          {isRecording && (
            <div className="absolute top-2 right-2 flex items-center gap-2 bg-red-500 text-white px-2 py-1 rounded text-sm">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Recording
            </div>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing verification...
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        <div className="flex gap-2">
          {!isRecording && !recordedVideo && !isProcessing && (
            <Button onClick={startRecording} className="flex-1">
              <Camera className="w-4 h-4 mr-2" />
              Start Recording
            </Button>
          )}

          {isRecording && (
            <Button
              onClick={stopRecording}
              variant="destructive"
              className="flex-1"
            >
              Stop Recording
            </Button>
          )}

          {recordedVideo && !isProcessing && (
            <Button onClick={submitVerification} className="flex-1">
              <CheckCircle className="w-4 h-4 mr-2" />
              Submit for Verification
            </Button>
          )}
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Look directly at the camera</p>
          <p>• Move your head slowly in a circle</p>
          <p>• Say your name clearly</p>
          <p>• Keep good lighting and remove glasses</p>
        </div>
      </CardContent>
    </Card>
  );
}
