import { NextRequest, NextResponse } from 'next/server';
import { premiumService } from '@/lib/premium';
import { PremiumTier } from '@/lib/premium';

// Mock authentication - in production this would validate JWT tokens
async function getCurrentUserId(): Promise<string | null> {
  // For demo purposes, return a mock user ID
  // In production, this would validate the JWT token from cookies/headers
  
  // Example of how to extract user ID from JWT token in production:
  // async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  //   const token = request.cookies.get('auth-token')?.value;
  //   if (!token) return null;
  //   try {
  //     const decoded = jwt.verify(token, process.env.JWT_SECRET);
  //     return decoded.userId;
  //   } catch {
  //     return null;
  //   }
  // }
  
  // For development/demo, return mock user ID
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

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tier, successUrl, cancelUrl } = body;

    // Validate required parameters
    if (!tier || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required parameters: tier, successUrl, and cancelUrl are required' },
        { status: 400 }
      );
    }

    // Validate tier against allowed PremiumTier values
    if (!Object.values(PremiumTier).includes(tier as PremiumTier)) {
      return NextResponse.json(
        {
          error: 'Invalid tier specified',
          allowedTiers: Object.values(PremiumTier)
        },
        { status: 400 }
      );
    }

    // Validate URLs (basic security check)
    try {
      new URL(successUrl);
      new URL(cancelUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format for successUrl or cancelUrl' },
        { status: 400 }
      );
    }

    const checkoutSession = await premiumService.createCheckoutSession(
      userId,
      tier as PremiumTier,
      successUrl,
      cancelUrl
    );

    return NextResponse.json({
      success: true,
      data: checkoutSession
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    // Provide more specific error messages
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}