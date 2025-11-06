// Safety and Trust Scoring API Routes
import { NextRequest, NextResponse } from 'next/server';
import { safetyService } from '@/lib/safety';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to extract user ID from JWT token
function extractUserId(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// Get user trust score
export async function GET(request: NextRequest) {
  try {
    const userId = extractUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'trust-score':
        const trustScore = await safetyService.getUserTrustScore(userId);
        return NextResponse.json({ trustScore });

      case 'patterns':
        const patternAnalysis = await safetyService.detectPatterns(userId);
        return NextResponse.json(patternAnalysis);

      case 'safety-events':
        const events = await prisma.safetyEvent.findMany({
          where: { primaryUserId: userId },
          orderBy: { createdAt: 'desc' },
          take: 50
        });
        return NextResponse.json({ events });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Safety API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Moderate content
export async function POST(request: NextRequest) {
  try {
    const userId = extractUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, content, contentType } = body;

    switch (action) {
      case 'moderate':
        if (!content || !contentType) {
          return NextResponse.json({ error: 'Content and contentType required' }, { status: 400 });
        }

        const moderationResult = await safetyService.moderateContent(
          content,
          userId,
          contentType as 'message' | 'profile' | 'report'
        );

        return NextResponse.json(moderationResult);

      case 'report-content':
        if (!content) {
          return NextResponse.json({ error: 'Content required for reporting' }, { status: 400 });
        }

        // Log report for safety event
        await prisma.safetyEvent.create({
          data: {
            eventType: 'CONTENT_REPORT',
            severity: 'info',
            primaryUserId: userId,
            description: `Content reported by user: ${content.substring(0, 100)}...`,
            metadata: { reportedContent: content }
          }
        });

        return NextResponse.json({ message: 'Report submitted successfully' });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Safety POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}