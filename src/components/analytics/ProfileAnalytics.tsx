"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  MessageCircle,
  Eye,
  TrendingUp,
  Calendar,
  Users,
  Target,
  Clock,
} from "lucide-react";

interface AnalyticsData {
  profileViews: number;
  likesReceived: number;
  matchesMade: number;
  messagesSent: number;
  messagesReceived: number;
  appOpens: number;
  timeSpent: number;
  lastActive: Date;
  conversationsStarted: number;
  datesScheduled: number;
  relationshipsFormed: number;
  derivedMetrics: {
    matchRate: number;
    avgSessionTime: number;
    totalInteractions: number;
    engagementScore: number;
  };
}

interface ProfileAnalyticsProps {
  analytics: AnalyticsData;
}

export function ProfileAnalytics({ analytics }: ProfileAnalyticsProps) {
  const getEngagementLevel = (score: number) => {
    if (score >= 80) return { label: "Highly Engaged", color: "bg-green-500" };
    if (score >= 60)
      return { label: "Moderately Engaged", color: "bg-yellow-500" };
    if (score >= 40) return { label: "Low Engagement", color: "bg-orange-500" };
    return { label: "Needs Attention", color: "bg-red-500" };
  };

  const engagement = getEngagementLevel(
    analytics.derivedMetrics.engagementScore
  );

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Profile Views
                </p>
                <p className="text-2xl font-bold">{analytics.profileViews}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-pink-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Likes Received
                </p>
                <p className="text-2xl font-bold">{analytics.likesReceived}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Matches Made
                </p>
                <p className="text-2xl font-bold">{analytics.matchesMade}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Messages Sent
                </p>
                <p className="text-2xl font-bold">{analytics.messagesSent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Engagement Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Engagement</span>
              <Badge variant="outline" className={engagement.color}>
                {engagement.label}
              </Badge>
            </div>
            <Progress
              value={analytics.derivedMetrics.engagementScore}
              className="h-3"
            />
            <p className="text-sm text-gray-600">
              {analytics.derivedMetrics.engagementScore}% based on app opens,
              matches, and messages
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Match Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Match Rate</span>
              <span className="font-semibold">
                {analytics.derivedMetrics.matchRate}%
              </span>
            </div>
            <Progress
              value={analytics.derivedMetrics.matchRate}
              className="h-2"
            />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Total Interactions</p>
                <p className="font-semibold">
                  {analytics.derivedMetrics.totalInteractions}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Conversations Started</p>
                <p className="font-semibold">
                  {analytics.conversationsStarted}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Activity Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">App Opens</p>
                <p className="font-semibold">{analytics.appOpens}</p>
              </div>
              <div>
                <p className="text-gray-600">Avg Session Time</p>
                <p className="font-semibold">
                  {analytics.derivedMetrics.avgSessionTime} min
                </p>
              </div>
              <div>
                <p className="text-gray-600">Total Time Spent</p>
                <p className="font-semibold">{analytics.timeSpent} min</p>
              </div>
              <div>
                <p className="text-gray-600">Last Active</p>
                <p className="font-semibold text-xs">
                  {new Date(analytics.lastActive).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Relationship Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {analytics.datesScheduled}
              </p>
              <p className="text-sm text-gray-600">Dates Scheduled</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {analytics.relationshipsFormed}
              </p>
              <p className="text-sm text-gray-600">Relationships Formed</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {analytics.relationshipsFormed > 0
                  ? Math.round(
                      (analytics.relationshipsFormed / analytics.matchesMade) *
                        100
                    )
                  : 0}
                %
              </p>
              <p className="text-sm text-gray-600">Conversion Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Optimization Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.profileViews < 10 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                <Eye className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">
                    Increase Profile Visibility
                  </p>
                  <p className="text-sm text-yellow-700">
                    Your profile has low views. Try adding more photos or
                    updating your bio to attract more attention.
                  </p>
                </div>
              </div>
            )}

            {analytics.derivedMetrics.matchRate < 20 &&
              analytics.likesReceived > 0 && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Heart className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">
                      Improve Match Conversion
                    </p>
                    <p className="text-sm text-blue-700">
                      You receive likes but have a low match rate. Consider
                      being more selective or updating your preferences.
                    </p>
                  </div>
                </div>
              )}

            {analytics.messagesSent < analytics.matchesMade * 0.5 && (
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <MessageCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">
                    Start More Conversations
                  </p>
                  <p className="text-sm text-green-700">
                    You have matches but aren&apos;t messaging much. Try sending
                    personalized messages to improve your response rate.
                  </p>
                </div>
              </div>
            )}

            {analytics.derivedMetrics.engagementScore < 50 && (
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-medium text-orange-800">
                    Boost Your Activity
                  </p>
                  <p className="text-sm text-orange-700">
                    Your engagement score is low. Try opening the app more often
                    and interacting with potential matches.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
