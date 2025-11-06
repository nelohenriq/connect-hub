// Premium Features and Payment Management System
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import Stripe from 'stripe';

const prisma = new PrismaClient();
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err) => console.log('Redis Client Error', err));

// Stripe configuration
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_...', {
  apiVersion: '2025-10-29.clover',
});

// Premium tier definitions
export enum PremiumTier {
  BASIC = 'basic',      // $9.99/month
  PREMIUM = 'premium',  // $19.99/month
  PRO = 'pro'          // $39.99/month
}

// Feature definitions
export interface PremiumFeature {
  id: string;
  name: string;
  description: string;
  tierAccess: PremiumTier[];
  isUnlimited: boolean;
  dailyLimit: number;
  usageCount: number;
}

// Success tracking interface
export interface SuccessMetrics {
  matchSuccessRate: number;      // Percentage of matches that lead to conversations
  conversationRate: number;      // Percentage of conversations that continue
  dateRate: number;             // Percentage that schedule dates
  relationshipRate: number;     // Percentage that form relationships
  timeToSuccess: number;        // Average days to reach each milestone
}

// User premium status
export interface UserPremiumStatus {
  tier: PremiumTier | null;
  isActive: boolean;
  expiresAt: Date | null;
  trialEndsAt: Date | null;
  nextBillingDate: Date | null;
  paymentMethodId: string | null;
  availableFeatures: PremiumFeature[];
  usageStats: Record<string, number>;
  remainingCredits: number;
}

export class PremiumService {
  
  /**
   * Get user premium status with current usage
   */
  async getUserPremiumStatus(userId: string): Promise<UserPremiumStatus> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        analytics: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get premium subscription from database (assuming we'll add this model)
    // For now, simulate premium status
    const isPremium = (user.analytics?.profileViews || 0) > 100; // Simple logic for demo
    
    const availableFeatures = this.getAvailableFeatures(isPremium ? PremiumTier.PREMIUM : null);
    const usageStats = await this.getUserUsageStats();
    const remainingCredits = this.calculateRemainingCredits(isPremium ? PremiumTier.PREMIUM : null, usageStats);

    return {
      tier: isPremium ? PremiumTier.PREMIUM : null,
      isActive: isPremium,
      expiresAt: null, // Will be from subscription
      trialEndsAt: null,
      nextBillingDate: null,
      paymentMethodId: null,
      availableFeatures,
      usageStats,
      remainingCredits
    };
  }

  /**
   * Track user success metrics
   */
  async trackSuccessMilestone(userId: string, milestone: string, data?: Record<string, unknown>): Promise<void> {
    // Update success metrics in database
    await this.updateSuccessMetrics(userId, milestone, data);
    
    // Trigger premium unlock if conditions met
    await this.checkPremiumUnlock(userId);
    
    // Log success event
    await this.logSuccessEvent(userId, milestone, data);
  }

  /**
   * Create Stripe checkout session for premium subscription
   */
  async createCheckoutSession(
    userId: string, 
    tier: PremiumTier, 
    successUrl: string, 
    cancelUrl: string
  ): Promise<{ sessionId: string; url: string }> {
    const pricing = this.getPricingForTier(tier);
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `ConnectHub ${tier.charAt(0).toUpperCase() + tier.slice(1)}`,
              description: `Premium features for ${tier} users`,
            },
            unit_amount: Math.round(pricing.monthly * 100), // Convert to cents
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        tier,
      },
    });

    return {
      sessionId: session.id,
      url: session.url || '',
    };
  }

  /**
   * Handle successful payment webhook
   */
  async handlePaymentSuccess(session: Stripe.Checkout.Session): Promise<void> {
    const { userId, tier } = session.metadata || {};
    
    if (!userId || !tier) {
      throw new Error('Missing metadata in Stripe session');
    }

    // Update user's premium status in database
    // This would typically involve updating a subscription model
    await this.activatePremiumSubscription(userId, tier as PremiumTier);
    
    // Log the upgrade event
    await this.logPremiumEvent(userId, 'SUBSCRIPTION_ACTIVATED', { tier });
    
    // Grant welcome credits
    await this.grantWelcomeCredits(userId, tier as PremiumTier);
  }

  /**
   * Check if user qualifies for premium unlocks
   */
  async checkPremiumUnlock(userId: string): Promise<void> {
    const successMetrics = await this.getUserSuccessMetrics(userId);
    
    // Example unlock conditions
    const unlocks = [
      {
        condition: successMetrics.conversationRate > 0.6,
        reward: 'unlimited_swipes',
        tier: PremiumTier.BASIC
      },
      {
        condition: successMetrics.dateRate > 0.3,
        reward: 'priority_showing',
        tier: PremiumTier.PREMIUM
      },
      {
        condition: successMetrics.relationshipRate > 0.1,
        reward: 'relationship_coaching',
        tier: PremiumTier.PRO
      }
    ];

    for (const unlock of unlocks) {
      if (unlock.condition) {
        await this.grantPremiumFeature(userId, unlock.reward, unlock.tier);
      }
    }
  }

  /**
   * Get user's success analytics
   */
  async getUserSuccessAnalytics(userId: string): Promise<{
    metrics: SuccessMetrics;
    timeline: Array<{ date: string; milestone: string; value: number }>;
    trends: {
      improving: boolean;
      rate: number;
    };
  }> {
    const metrics = await this.getUserSuccessMetrics(userId);
    const timeline = await this.getSuccessTimeline();
    const trends = await this.calculateSuccessTrends();

    return { metrics, timeline, trends };
  }

  /**
   * Premium feature validation
   */
  async validatePremiumAccess(
    userId: string, 
    featureId: string, 
    requestedUsage: number = 1
  ): Promise<{
    allowed: boolean;
    remaining: number;
    cost: number;
    upgradeRequired: boolean;
  }> {
    const status = await this.getUserPremiumStatus(userId);
    const feature = status.availableFeatures.find(f => f.id === featureId);
    
    if (!feature) {
      return { allowed: false, remaining: 0, cost: 0, upgradeRequired: true };
    }

    const currentUsage = status.usageStats[featureId] || 0;
    const remaining = feature.isUnlimited ? -1 : feature.dailyLimit - currentUsage;

    if (feature.isUnlimited || remaining >= requestedUsage) {
      return { allowed: true, remaining: Math.max(0, remaining), cost: 0, upgradeRequired: false };
    }

    // Check if user can purchase additional credits
    const additionalCost = this.calculateAdditionalCost(featureId, requestedUsage - remaining);
    
    return { 
      allowed: false, 
      remaining: Math.max(0, remaining), 
      cost: additionalCost, 
      upgradeRequired: remaining <= 0 
    };
  }

  /**
   * Consume premium feature usage
   */
  async consumePremiumFeature(
    userId: string, 
    featureId: string, 
    usage: number = 1
  ): Promise<boolean> {
    const validation = await this.validatePremiumAccess(userId, featureId, usage);
    
    if (!validation.allowed) {
      return false;
    }

    // Update usage in database and cache
    await this.updateFeatureUsage(userId, featureId, usage);
    
    // Log usage event
    await this.logPremiumEvent(userId, 'FEATURE_USED', { featureId, usage });
    
    return true;
  }

  /**
   * Get pricing information for display
   */
  getPricingInfo() {
    return {
      [PremiumTier.BASIC]: {
        monthly: 9.99,
        yearly: 99.99,
        features: [
          'Unlimited likes',
          'Read receipts',
          '5 super likes per day',
          'Basic analytics'
        ]
      },
      [PremiumTier.PREMIUM]: {
        monthly: 19.99,
        yearly: 199.99,
        features: [
          'Unlimited likes and super likes',
          'Rewind feature',
          'Priority in discovery',
          'Detailed analytics',
          'Verified badge',
          'No ads'
        ]
      },
      [PremiumTier.PRO]: {
        monthly: 39.99,
        yearly: 399.99,
        features: [
          'Everything in Premium',
          'Unlimited super likes',
          'Profile boost',
          'Advanced discovery filters',
          'Relationship coaching',
          'Phone verification',
          'Read receipts control'
        ]
      }
    };
  }

  // Private helper methods

  private getAvailableFeatures(tier: PremiumTier | null): PremiumFeature[] {
    const allFeatures: PremiumFeature[] = [
      {
        id: 'unlimited_likes',
        name: 'Unlimited Likes',
        description: 'Like as many profiles as you want',
        tierAccess: [PremiumTier.BASIC, PremiumTier.PREMIUM, PremiumTier.PRO],
        isUnlimited: true,
        dailyLimit: 0,
        usageCount: 0
      },
      {
        id: 'super_likes',
        name: 'Super Likes',
        description: 'Stand out with super likes',
        tierAccess: [PremiumTier.BASIC, PremiumTier.PREMIUM, PremiumTier.PRO],
        isUnlimited: false,
        dailyLimit: 5,
        usageCount: 0
      },
      {
        id: 'rewind_feature',
        name: 'Rewind',
        description: 'Undo your last swipe',
        tierAccess: [PremiumTier.PREMIUM, PremiumTier.PRO],
        isUnlimited: false,
        dailyLimit: 3,
        usageCount: 0
      },
      {
        id: 'profile_boost',
        name: 'Profile Boost',
        description: 'Increase your profile visibility',
        tierAccess: [PremiumTier.PRO],
        isUnlimited: false,
        dailyLimit: 1,
        usageCount: 0
      }
    ];

    if (!tier) {
      return allFeatures.map(f => ({ ...f, dailyLimit: 10, isUnlimited: false })); // Free tier limits
    }

    return allFeatures.map(feature => {
      if (feature.tierAccess.includes(tier)) {
        return { ...feature, usageCount: 0 };
      }
      return { ...feature, dailyLimit: 0, usageCount: 0 };
    });
  }

  private async getUserUsageStats(): Promise<Record<string, number>> {
    // This would fetch from a UserUsage model or similar
    // For now, return mock data
    return {
      'unlimited_likes': 0,
      'super_likes': 2,
      'rewind_feature': 1,
      'profile_boost': 0
    };
  }

  private calculateRemainingCredits(tier: PremiumTier | null, usageStats: Record<string, number>): number {
    if (!tier) return 10; // Free tier has 10 credits
    
    const totalCredits = tier === PremiumTier.BASIC ? 100 :
                        tier === PremiumTier.PREMIUM ? 500 :
                        1000; // PRO
    
    const usedCredits = Object.values(usageStats).reduce((sum, usage) => sum + usage, 0);
    return Math.max(0, totalCredits - usedCredits);
  }

  private async updateSuccessMetrics(userId: string, milestone: string, data?: Record<string, unknown>): Promise<void> {
    // Update analytics in database
    await prisma.userAnalytics.upsert({
      where: { userId },
      update: {
        // Update based on milestone type
        ...(milestone === 'match' && { matchesMade: { increment: 1 } }),
        ...(milestone === 'conversation' && { conversationsStarted: { increment: 1 } }),
        ...(milestone === 'date' && { datesScheduled: { increment: 1 } }),
        ...(milestone === 'relationship' && { relationshipsFormed: { increment: 1 } }),
      },
      create: {
        userId,
        ...(milestone === 'match' && { matchesMade: 1 }),
        ...(milestone === 'conversation' && { conversationsStarted: 1 }),
        ...(milestone === 'date' && { datesScheduled: 1 }),
        ...(milestone === 'relationship' && { relationshipsFormed: 1 }),
      }
    });
    // Log the additional data if provided
    if (data) {
      await this.logPremiumEvent(userId, 'MILESTONE_DATA', data);
    }
  }

  private async getUserSuccessMetrics(userId: string): Promise<SuccessMetrics> {
    const analytics = await prisma.userAnalytics.findUnique({
      where: { userId }
    });

    if (!analytics) {
      return {
        matchSuccessRate: 0,
        conversationRate: 0,
        dateRate: 0,
        relationshipRate: 0,
        timeToSuccess: 0
      };
    }

    return {
      matchSuccessRate: analytics.matchesMade > 0 ? analytics.conversationsStarted / analytics.matchesMade : 0,
      conversationRate: analytics.conversationsStarted > 0 ? analytics.datesScheduled / analytics.conversationsStarted : 0,
      dateRate: analytics.datesScheduled > 0 ? analytics.relationshipsFormed / analytics.datesScheduled : 0,
      relationshipRate: analytics.matchesMade > 0 ? analytics.relationshipsFormed / analytics.matchesMade : 0,
      timeToSuccess: 30 // Mock value
    };
  }

  private async activatePremiumSubscription(userId: string, tier: PremiumTier): Promise<void> {
    // This would update a subscription model in the database
    // For now, just log the activation
    await this.logPremiumEvent(userId, 'SUBSCRIPTION_ACTIVATED', { tier });
  }

  private async grantWelcomeCredits(userId: string, tier: PremiumTier): Promise<void> {
    const credits = tier === PremiumTier.BASIC ? 50 :
                   tier === PremiumTier.PREMIUM ? 100 : 200;
    
    // Grant credits to user
    await this.logPremiumEvent(userId, 'WELCOME_CREDITS_GRANTED', { credits });
  }

  private async grantPremiumFeature(userId: string, featureId: string, tier: PremiumTier): Promise<void> {
    await this.logPremiumEvent(userId, 'PREMIUM_FEATURE_UNLOCKED', { featureId, tier });
  }

  private getPricingForTier(tier: PremiumTier) {
    const pricing = this.getPricingInfo();
    return pricing[tier];
  }

  private calculateAdditionalCost(featureId: string, additionalUsage: number): number {
    // Pricing for additional usage beyond limits
    const costs = {
      'super_likes': 1.99,
      'rewind_feature': 2.99,
      'profile_boost': 4.99
    };
    
    return (costs[featureId as keyof typeof costs] || 0) * additionalUsage;
  }

  private async updateFeatureUsage(userId: string, featureId: string, usage: number): Promise<void> {
    // Update usage in database/cache
    const cacheKey = `usage:${userId}:${featureId}`;
    try {
      await redis.connect();
      const currentUsage = await redis.get(cacheKey) || '0';
      await redis.setEx(cacheKey, 86400, (parseInt(currentUsage) + usage).toString()); // 24h expiry
    } catch (error) {
      console.warn('Failed to update usage cache:', error);
    }
  }

  private async getSuccessTimeline() {
    // Mock timeline data - would come from actual events
    // In production, this would fetch real timeline data for the user
    return [
      { date: '2025-11-01', milestone: 'match', value: 1 },
      { date: '2025-11-03', milestone: 'conversation', value: 1 },
      { date: '2025-11-05', milestone: 'date', value: 1 }
    ];
  }

  private async calculateSuccessTrends() {
    // Mock trend calculation
    // In production, this would analyze user's success patterns over time
    return { improving: true, rate: 0.15 };
  }

  private async logSuccessEvent(userId: string, milestone: string, data?: Record<string, unknown>): Promise<void> {
    await prisma.safetyEvent.create({
      data: {
        eventType: 'SUCCESS_MILESTONE',
        severity: 'info',
        primaryUserId: userId,
        description: `User achieved ${milestone} milestone`,
        metadata: { milestone, ...data }
      }
    });
  }

  private async logPremiumEvent(userId: string, eventType: string, data?: Record<string, unknown>): Promise<void> {
    await prisma.safetyEvent.create({
      data: {
        eventType: 'PREMIUM_EVENT',
        severity: 'info',
        primaryUserId: userId,
        description: `Premium event: ${eventType}`,
        metadata: { eventType, ...data }
      }
    });
  }
}

export const premiumService = new PremiumService();