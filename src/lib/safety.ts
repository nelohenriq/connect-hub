// Enhanced Safety and Trust Scoring System
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

const prisma = new PrismaClient();
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err) => console.log('Redis Client Error', err));

// TypeScript interfaces for better type safety
interface TrustScoreFactors {
  verificationLevel: number;      // Video verification status
  userAge: number;                // Account age in days
  positiveFeedback: number;       // Positive community feedback
  negativeFeedback: number;       // Negative reports/flags
  messageQuality: number;         // Message interaction quality
  profileCompleteness: number;    // Profile information completeness
  consistentBehavior: number;     // Behavioral consistency score
  communityStanding: number;      // Overall community reputation
}

interface ContentModerationResult {
  flagged: boolean;
  confidence: number;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'allow' | 'warn' | 'block' | 'review';
}

interface PatternDetectionResult {
  detectedPatterns: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  recommendations: string[];
}

interface PatternDetectionData {
  detected: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  count: number;
}

// Database entity interfaces based on Prisma schema
interface UserWithRelations {
  id: string;
  isVerified: boolean;
  createdAt: Date;
  bio?: string | null;
  location?: string | null;
  profile?: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    height?: number | null;
    education?: string | null;
    occupation?: string | null;
    religion?: string | null;
    ethnicity?: string | null;
    smoking?: string | null;
    drinking?: string | null;
    exercise?: string | null;
    diet?: string | null;
    interests?: string[] | null;
    musicGenres?: string[] | null;
    favoriteMovies?: string[] | null;
    favoriteBooks?: string[] | null;
    personalityTraits?: string[] | null;
    loveLanguage?: string | null;
    relationshipGoals?: string | null;
    children?: string | null;
    pets?: string | null;
    compatibilityScore: number;
  } | null;
  communityFeedbackReceived?: Array<{
    feedbackType: string;
  }>;
  communityFeedbackGiven?: Array<{
    feedbackType: string;
  }>;
  safetyEventsPrimary?: Array<{
    eventType: string;
    createdAt: Date;
  }>;
  trustScoreHistory?: Array<{
    overallScore?: number;
    score?: number;
    recordedAt?: Date;
  }>;
}

interface SafetyEvent {
  id: string;
  eventType: string;
  createdAt: Date;
  severity: string;
  primaryUserId?: string | null;
  targetUserId?: string | null;
  moderatorId?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
  isResolved: boolean;
  resolvedAt?: Date | null;
  resolution?: string | null;
}

interface TrustScoreHistoryEntry {
  overallScore?: number;
  score?: number;
  recordedAt?: Date;
}

// Note: SafetyEventData interface removed - unused

export class SafetyService {
  
  /**
   * Calculate comprehensive trust score for a user
   */
  async calculateTrustScore(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        communityFeedbackReceived: {
          where: { feedbackType: 'positive' }
        },
        communityFeedbackGiven: {
          where: { feedbackType: 'negative' }
        },
        safetyEventsPrimary: true,
        trustScoreHistory: {
          orderBy: { recordedAt: 'desc' },
          take: 10
        }
      }
    });

    if (!user) return 0;

    const factors: TrustScoreFactors = {
      verificationLevel: this.getVerificationScore(user),
      userAge: this.getAccountAgeScore(user.createdAt),
      positiveFeedback: this.getPositiveFeedbackScore(user.communityFeedbackReceived),
      negativeFeedback: this.getNegativeFeedbackScore(user.communityFeedbackGiven),
      messageQuality: await this.getMessageQualityScore(userId),
      profileCompleteness: this.getProfileCompletenessScore(user.profile),
      consistentBehavior: this.getBehavioralConsistencyScore(user.trustScoreHistory),
      communityStanding: this.getCommunityStandingScore(user)
    };

    // Weighted trust score calculation
    const weights = {
      verificationLevel: 0.25,
      userAge: 0.15,
      positiveFeedback: 0.20,
      negativeFeedback: -0.15, // Negative impact
      messageQuality: 0.15,
      profileCompleteness: 0.10,
      consistentBehavior: 0.15,
      communityStanding: 0.15
    };

    const trustScore = Object.entries(factors).reduce((total, [key, value]) => {
      const weight = weights[key as keyof typeof weights];
      return total + (value * weight);
    }, 0);

    // Normalize to 0-100 scale
    const normalizedScore = Math.max(0, Math.min(100, (trustScore + 1) * 50));

    // Save trust score history
    await this.saveTrustScoreHistory(userId, normalizedScore);

    return Math.round(normalizedScore);
  }

  /**
   * AI-powered content moderation
   */
  async moderateContent(content: string, userId: string, contentType: 'message' | 'profile' | 'report'): Promise<ContentModerationResult> {
    // Basic content analysis
    const basicAnalysis = await this.basicContentAnalysis(content);
    
    // Advanced AI analysis (simulated - replace with actual AI service)
    const aiAnalysis = await this.aiContentAnalysis(content, contentType);
    
    // Combine analyses
    const finalResult = this.combineAnalyses(basicAnalysis, aiAnalysis);
    
    // Log moderation event
    await this.logModerationEvent({
      userId,
      content,
      contentType,
      ...finalResult
    });

    return finalResult;
  }

  /**
   * Detect suspicious patterns in user behavior
   */
  async detectPatterns(userId: string): Promise<PatternDetectionResult> {
    const userBehavior = await this.getUserBehaviorData(userId);
    
    const patterns = {
      harassment: await this.detectHarassmentPattern(userBehavior),
      spam: await this.detectSpamPattern(userBehavior),
      botBehavior: await this.detectBotPattern(userBehavior),
      suspiciousTiming: await this.detectTimingPattern(userBehavior),
      networkAbuse: await this.detectNetworkAbusePattern(userBehavior)
    };

    const detectedPatterns = Object.entries(patterns)
      .filter(([, detected]) => detected.detected)
      .map(([patternName]) => patternName);

    const maxRiskLevel = Math.max(
      ...Object.values(patterns).map(p => this.getRiskLevelScore(p.riskLevel))
    );

    const recommendations = this.generatePatternRecommendations(detectedPatterns);

    return {
      detectedPatterns,
      riskLevel: this.getRiskLevelFromScore(maxRiskLevel),
      confidence: this.calculatePatternConfidence(patterns),
      recommendations
    };
  }

  /**
   * Get user's current trust score with cache
   */
  async getUserTrustScore(userId: string): Promise<number> {
    const cacheKey = `trust_score:${userId}`;
    
    try {
      await redis.connect();
      const cached = await redis.get(cacheKey);
      if (cached) {
        return parseInt(String(cached));
      }
    } catch (error) {
      console.warn('Redis cache unavailable:', error);
    }

    const trustScore = await this.calculateTrustScore(userId);
    
    // Cache for 1 hour
    try {
      await redis.setEx(cacheKey, 3600, trustScore.toString());
    } catch (error) {
      console.warn('Failed to cache trust score:', error);
    }

    return trustScore;
  }

  /**
   * Update user trust score based on safety events
   */
  async updateTrustScoreFromEvent(userId: string, eventType: string, severity: string): Promise<number> {
    let scoreChange = 0;
    
    switch (eventType) {
      case 'POSITIVE_REPORT':
        scoreChange = 5;
        break;
      case 'NEGATIVE_REPORT':
        scoreChange = severity === 'high' ? -15 : -5;
        break;
      case 'MESSAGE_FLAG':
        scoreChange = severity === 'high' ? -10 : -3;
        break;
      case 'HARASSMENT_REPORT':
        scoreChange = -20;
        break;
      case 'SPAM_DETECTION':
        scoreChange = -8;
        break;
      case 'GOOD_BEHAVIOR':
        scoreChange = 3;
        break;
    }

    const currentScore = await this.getUserTrustScore(userId);
    const newScore = Math.max(0, Math.min(100, currentScore + scoreChange));

    // Log the trust score update
    await this.logTrustScoreUpdate(userId, currentScore, newScore, eventType);

    // Update cache
    try {
      await redis.setEx(`trust_score:${userId}`, 3600, newScore.toString());
    } catch (error) {
      console.warn('Failed to update trust score cache:', error);
    }

    return newScore;
  }

  // Private helper methods

  private getVerificationScore(user: UserWithRelations): number {
    if (user.isVerified) {
      return 1.0; // Simplified verification check
    }
    return 0.3;
  }

  private getAccountAgeScore(createdAt: Date): number {
    const ageInDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    if (ageInDays >= 365) return 1.0;
    if (ageInDays >= 90) return 0.8;
    if (ageInDays >= 30) return 0.6;
    if (ageInDays >= 7) return 0.4;
    return 0.2;
  }

  private getPositiveFeedbackScore(feedback: Array<{ feedbackType: string }>): number {
    const count = feedback?.length || 0;
    if (count >= 50) return 1.0;
    if (count >= 20) return 0.8;
    if (count >= 10) return 0.6;
    if (count >= 5) return 0.4;
    return 0.2;
  }

  private getNegativeFeedbackScore(feedback: Array<{ feedbackType: string }>): number {
    const count = feedback?.length || 0;
    if (count === 0) return 1.0;
    if (count <= 2) return 0.8;
    if (count <= 5) return 0.4;
    if (count <= 10) return 0.2;
    return 0.0;
  }

  private async getMessageQualityScore(userId: string): Promise<number> {
    // Get message metrics from messages table
    const sentMessages = await prisma.message.findMany({
      where: { senderId: userId },
      include: {
        messageReports: true
      },
      take: 100
    });

    if (sentMessages.length === 0) return 0.5;

    const totalMessages = sentMessages.length;
    const reportedMessages = sentMessages.filter(msg => msg.messageReports.length > 0).length;
    const blockedMessages = sentMessages.filter(msg => msg.isBlocked).length;
    
    // Calculate quality score based on reports and blocks
    const qualityScore = Math.max(0, 1 - ((reportedMessages + blockedMessages * 2) / totalMessages));
    
    return qualityScore;
  }

  private getProfileCompletenessScore(profile: UserWithRelations['profile']): number {
    if (!profile) return 0.0;
    
    const fields = [
      profile?.education,
      profile?.occupation,
      profile?.interests,
      profile?.height,
      profile?.relationshipGoals,
      profile?.pets
    ];
    
    const completedFields = fields.filter(field => {
      if (!field) return false;
      // Check for string fields (non-empty)
      if (typeof field === 'string') return field.trim().length > 0;
      // Check for array fields (non-empty)
      if (Array.isArray(field)) return field.length > 0;
      // Check for number fields (positive)
      if (typeof field === 'number') return field > 0;
      return false;
    }).length;
    
    return completedFields / fields.length;
  }

  private getBehavioralConsistencyScore(history: TrustScoreHistoryEntry[]): number {
    if (history.length < 2) return 0.5;
    
    const scores = history
      .map((h: TrustScoreHistoryEntry) => h.overallScore || h.score)
      .filter((score): score is number => score !== undefined && score !== null);
    
    if (scores.length < 2) return 0.5;
    
    const avgScore = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum: number, score: number) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
    
    // Lower variance indicates more consistent behavior
    const consistency = Math.max(0, 1 - (variance / 100));
    return Math.min(1, consistency);
  }

  private getCommunityStandingScore(user: UserWithRelations): number {
    // Complex calculation based on community metrics
    const verificationBonus = user.isVerified ? 10 : 0;
    const feedbackScore = Math.max(0, (user.communityFeedbackReceived?.length || 0) * 2 - (user.communityFeedbackGiven?.length || 0));
    const activityScore = Math.min(50, user.safetyEventsPrimary?.length || 0);
    
    return Math.min(100, verificationBonus + feedbackScore + activityScore);
  }

  private async basicContentAnalysis(content: string) {
    // Basic keyword detection
    const inappropriateKeywords = [
      'harassment', 'threat', 'violence', 'hate', 'discrimination',
      'spam', 'commercial', 'scam', 'fraud'
    ];
    
    const contentLower = content.toLowerCase();
    const detectedKeywords = inappropriateKeywords.filter(keyword => 
      contentLower.includes(keyword)
    );
    
    return {
      flagged: detectedKeywords.length > 0,
      keywords: detectedKeywords,
      confidence: Math.min(0.8, detectedKeywords.length * 0.2)
    };
  }

  private async aiContentAnalysis(content: string, contentType: string) {
    // Simulated AI analysis - replace with actual AI service
    const riskIndicators: Record<string, string[]> = {
      message: ['inappropriate', 'harassment', 'spam', 'commercial'],
      profile: ['fake', 'inappropriate', 'misleading'],
      report: ['false', 'malicious', 'abuse']
    };
    
    const indicators = riskIndicators[contentType] || [];
    const contentLower = content.toLowerCase();
    const matched = indicators.filter((indicator: string) => contentLower.includes(indicator));
    
    return {
      flagged: matched.length > 0,
      matched,
      confidence: Math.min(0.9, matched.length * 0.3)
    };
  }

  private combineAnalyses(basic: { flagged: boolean; confidence: number }, ai: { flagged: boolean; confidence: number; matched: string[] }): ContentModerationResult {
    const flagged = basic.flagged || ai.flagged;
    const confidence = Math.max(basic.confidence, ai.confidence);
    
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let action: 'allow' | 'warn' | 'block' | 'review' = 'allow';
    
    if (flagged) {
      if (confidence > 0.8) {
        severity = 'critical';
        action = 'block';
      } else if (confidence > 0.6) {
        severity = 'high';
        action = 'block';
      } else if (confidence > 0.4) {
        severity = 'medium';
        action = 'review';
      } else {
        severity = 'low';
        action = 'warn';
      }
    }
    
    return {
      flagged,
      confidence,
      reason: flagged ? `Content analysis detected ${ai.matched?.length || 0} risk indicators` : 'No issues detected',
      severity,
      action
    };
  }

  private async getUserBehaviorData(userId: string): Promise<SafetyEvent[]> {
    // Get user behavior data for pattern analysis
    const events = await prisma.safetyEvent.findMany({
      where: { primaryUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    
    return events.map(event => ({
      ...event,
      primaryUserId: event.primaryUserId || undefined,
      targetUserId: event.targetUserId || undefined,
      moderatorId: event.moderatorId || undefined,
      metadata: event.metadata as Record<string, unknown> | undefined || undefined,
      resolvedAt: event.resolvedAt || undefined,
      resolution: event.resolution || undefined
    }));
  }

  private async detectHarassmentPattern(behavior: SafetyEvent[]): Promise<PatternDetectionData> {
    const harassmentEvents = behavior.filter((e: SafetyEvent) =>
      e.eventType === 'HARASSMENT_REPORT' || e.eventType === 'MESSAGE_FLAG'
    );
    
    return {
      detected: harassmentEvents.length >= 3,
      riskLevel: harassmentEvents.length >= 5 ? 'high' : 'medium',
      count: harassmentEvents.length
    };
  }

  private async detectSpamPattern(behavior: SafetyEvent[]): Promise<PatternDetectionData> {
    const spamEvents = behavior.filter((e: SafetyEvent) => e.eventType === 'SPAM_DETECTION');
    
    return {
      detected: spamEvents.length >= 2,
      riskLevel: spamEvents.length >= 5 ? 'high' : 'medium',
      count: spamEvents.length
    };
  }

  private async detectBotPattern(behavior: SafetyEvent[]): Promise<PatternDetectionData> {
    const botEvents = behavior.filter((e: SafetyEvent) => e.eventType === 'BOT_DETECTION');
    
    return {
      detected: botEvents.length >= 2,
      riskLevel: botEvents.length >= 5 ? 'high' : 'medium',
      count: botEvents.length
    };
  }

  private async detectTimingPattern(behavior: SafetyEvent[]): Promise<PatternDetectionData> {
    const timingEvents = behavior.filter((e: SafetyEvent) => e.eventType === 'TIMING_PATTERN');
    
    return {
      detected: timingEvents.length >= 2,
      riskLevel: timingEvents.length >= 5 ? 'high' : 'medium',
      count: timingEvents.length
    };
  }

  private async detectNetworkAbusePattern(behavior: SafetyEvent[]): Promise<PatternDetectionData> {
    const networkAbuseEvents = behavior.filter((e: SafetyEvent) => e.eventType === 'NETWORK_ABUSE_DETECTION');  
    
    return {
      detected: networkAbuseEvents.length >= 2,
      riskLevel: networkAbuseEvents.length >= 5 ? 'high' : 'medium',
      count: networkAbuseEvents.length
    };
  }

  private getRiskLevelScore(riskLevel: string): number {
    const scores = { low: 1, medium: 2, high: 3, critical: 4 };
    return scores[riskLevel as keyof typeof scores] || 1;
  }

  private getRiskLevelFromScore(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 4) return 'critical';
    if (score >= 3) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  private generatePatternRecommendations(patterns: string[]): string[] {
    const recommendations = [];
    
    if (patterns.includes('harassment')) {
      recommendations.push('Review message content', 'Consider temporary restrictions');
    }
    if (patterns.includes('spam')) {
      recommendations.push('Implement rate limiting', 'Monitor activity closely');
    }
    if (patterns.includes('botBehavior')) {
      recommendations.push('Verify account authenticity', 'Require additional verification');
    }
    
    return recommendations;
  }

  private calculatePatternConfidence(patterns: Record<string, PatternDetectionData>): number {
    // Since we don't have confidence scores, calculate based on detection count and severity
    const patternScores = Object.values(patterns).map((pattern) => {
      if (!pattern.detected) return 0.3; // Low confidence for non-detected patterns
      const severityWeight = pattern.riskLevel === 'high' ? 0.8 : pattern.riskLevel === 'medium' ? 0.6 : 0.4;
      return Math.min(0.9, severityWeight + (pattern.count * 0.1));
    });
    
    return patternScores.reduce((sum, score) => sum + score, 0) / patternScores.length;
  }

  private async saveTrustScoreHistory(userId: string, score: number): Promise<void> {
    await prisma.trustScoreHistory.create({
      data: {
        userId,
        overallScore: score,
        behaviorScore: score,
        communityScore: score,
        verificationScore: score,
        changeReason: 'Automatic calculation',
        changeType: 'automatic'
      }
    });
  }

  private async logModerationEvent(data: { userId: string; contentType: string; content: string; flagged: boolean; confidence: number; reason: string; severity: string; action: string }) {
    await prisma.contentModeration.create({
      data: {
        contentType: data.contentType,
        contentId: `temp-${Date.now()}`, // Placeholder since we don't have actual content ID
        userId: data.userId,
        isFlagged: data.flagged,
        flagReason: data.reason,
        confidence: data.confidence,
        severity: data.severity.toUpperCase()
      }
    });
  }

  private async logTrustScoreUpdate(userId: string, oldScore: number, newScore: number, reason: string) {
    await prisma.safetyEvent.create({
      data: {
        eventType: 'TRUST_SCORE_UPDATE',
        severity: Math.abs(newScore - oldScore) > 10 ? 'error' : 'warning',
        primaryUserId: userId,
        description: `Trust score updated from ${oldScore} to ${newScore}: ${reason}`,
        metadata: { oldScore, newScore, reason }
      }
    });
  }
}

export const safetyService = new SafetyService();