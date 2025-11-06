import { NextRequest, NextResponse } from 'next/server';
import { premiumService } from '@/lib/premium';

// Mock authentication - in production this would validate JWT tokens
async function getCurrentUserId(): Promise<string | null> {
  // For demo purposes, return a mock user ID
  // In production, this would validate the JWT token from cookies/headers
  return 'demo-user-id';
}

// Production-ready authentication pattern (commented for demo):
/*
async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId;
  } catch {
    return null;
  }
}
*/

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const premiumStatus = await premiumService.getUserPremiumStatus(userId);
    const successAnalytics = await premiumService.getUserSuccessAnalytics(userId);

    return NextResponse.json({
      success: true,
      data: {
        status: premiumStatus,
        analytics: successAnalytics
      }
    });
  } catch (error) {
    console.error('Error fetching premium status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch premium status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, milestone, data } = body;

    switch (action) {
      case 'track_milestone':
        await premiumService.trackSuccessMilestone(userId, milestone, data);
        break;
      
      case 'validate_feature':
        const validation = await premiumService.validatePremiumAccess(
          userId,
          data.featureId,
          data.usage
        );
        return NextResponse.json({
          success: true,
          data: validation
        });
      
      case 'consume_feature':
        const success = await premiumService.consumePremiumFeature(
          userId,
          data.featureId,
          data.usage
        );
        return NextResponse.json({
          success,
          message: success ? 'Feature consumed' : 'Feature access denied'
        });
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in premium POST:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}