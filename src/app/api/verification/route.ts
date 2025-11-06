import { NextRequest, NextResponse } from 'next/server';

// Go service configuration
const GO_SERVICE_URL = process.env.GO_VERIFICATION_SERVICE_URL || 'http://localhost:8080';

// Video verification endpoint
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;

    if (!videoFile) {
      return NextResponse.json(
        { error: 'Video file is required' },
        { status: 400 }
      );
    }

    // Validate file type and size
    if (!videoFile.type.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only video files are allowed.' },
        { status: 400 }
      );
    }

    if (videoFile.size > 50 * 1024 * 1024) { // 50MB limit
      return NextResponse.json(
        { error: 'Video file too large. Maximum size is 50MB.' },
        { status: 400 }
      );
    }

    // Forward to Go verification service
    const goFormData = new FormData();
    goFormData.append('video', videoFile);

    // Add optional user_id if provided
    const userId = formData.get('user_id') as string;
    if (userId) {
      goFormData.append('user_id', userId);
    }

    const response = await fetch(`${GO_SERVICE_URL}/api/v1/verify`, {
      method: 'POST',
      body: goFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Verification service error' }));
      return NextResponse.json(
        { error: errorData.error || 'Verification service unavailable' },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Video verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error during verification' },
      { status: 500 }
    );
  }
}

// Get verification status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const verificationId = searchParams.get('id');

  if (!verificationId) {
    return NextResponse.json(
      { error: 'Verification ID is required' },
      { status: 400 }
    );
  }

  // TODO: Check verification status from database/cache

  // Mock response
  return NextResponse.json({
    verificationId,
    status: 'completed',
    verified: true,
    timestamp: new Date().toISOString()
  });
}