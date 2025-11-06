"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Crown,
  Star,
  TrendingUp,
  Calendar,
  Users,
  Heart,
  CheckCircle,
  Lock,
} from "lucide-react";

interface PremiumStatus {
  tier: string | null;
  isActive: boolean;
  expiresAt: Date | null;
  trialEndsAt: Date | null;
  nextBillingDate: Date | null;
  availableFeatures: PremiumFeature[];
  usageStats: Record<string, number>;
  remainingCredits: number;
}

interface PremiumFeature {
  id: string;
  name: string;
  description: string;
  tierAccess: string[];
  isUnlimited: boolean;
  dailyLimit: number;
  usageCount: number;
}

interface SuccessMetrics {
  matchSuccessRate: number;
  conversationRate: number;
  dateRate: number;
  relationshipRate: number;
  timeToSuccess: number;
}

interface SuccessAnalytics {
  metrics: SuccessMetrics;
  timeline: Array<{ date: string; milestone: string; value: number }>;
  trends: {
    improving: boolean;
    rate: number;
  };
}

export function PremiumDashboard() {
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(
    null
  );
  const [successAnalytics, setSuccessAnalytics] =
    useState<SuccessAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    loadPremiumData();
  }, []);

  const loadPremiumData = async () => {
    try {
      const response = await fetch("/api/premium");
      const data = await response.json();

      if (data.success) {
        setPremiumStatus(data.data.status);
        setSuccessAnalytics(data.data.analytics);
      }
    } catch (error) {
      console.error("Error loading premium data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: string) => {
    setUpgrading(true);
    try {
      const response = await fetch("/api/premium/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tier,
          successUrl: `${window.location.origin}/premium/success`,
          cancelUrl: `${window.location.origin}/premium/cancel`,
        }),
      });

      const data = await response.json();

      if (data.success && data.data.url) {
        window.location.href = data.data.url;
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
    } finally {
      setUpgrading(false);
    }
  };

  const getSuccessMetricColor = (rate: number) => {
    if (rate >= 0.8) return "text-green-600";
    if (rate >= 0.6) return "text-yellow-600";
    if (rate >= 0.4) return "text-orange-600";
    return "text-red-600";
  };

  const getSuccessMetricIcon = (milestone: string) => {
    switch (milestone) {
      case "match":
        return <Users className="h-4 w-4" />;
      case "conversation":
        return <Heart className="h-4 w-4" />;
      case "date":
        return <Calendar className="h-4 w-4" />;
      case "relationship":
        return <Star className="h-4 w-4" />;
      default:
        return <TrendingUp className="h-4 w-4" />;
    }
  };

  const renderFeatureUsage = (feature: PremiumFeature) => {
    const usage = premiumStatus?.usageStats[feature.id] || 0;
    const percentage = feature.isUnlimited
      ? 100
      : (usage / feature.dailyLimit) * 100;

    return (
      <div key={feature.id} className="p-4 border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{feature.name}</h4>
            {!premiumStatus?.tier && !feature.tierAccess.includes("free") && (
              <Lock className="h-4 w-4 text-gray-400" />
            )}
          </div>
          <Badge variant={feature.isUnlimited ? "default" : "secondary"}>
            {feature.isUnlimited
              ? "Unlimited"
              : `${usage}/${feature.dailyLimit}`}
          </Badge>
        </div>
        <p className="text-sm text-gray-600 mb-2">{feature.description}</p>
        {!feature.isUnlimited && (
          <Progress value={percentage} className="h-2" />
        )}
        {!premiumStatus?.tier && feature.tierAccess.includes("premium") && (
          <Button
            size="sm"
            className="mt-2"
            onClick={() => handleUpgrade("premium")}
            disabled={upgrading}
          >
            Upgrade to Unlock
          </Button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="h-8 w-8 text-yellow-500" />
            Premium Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your premium features and track your success
          </p>
        </div>
        {premiumStatus?.tier && (
          <Badge variant="default" className="text-lg px-4 py-2">
            {premiumStatus.tier.toUpperCase()}
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getSuccessMetricColor(
                successAnalytics?.metrics.matchSuccessRate || 0
              )}`}
            >
              {Math.round(
                (successAnalytics?.metrics.matchSuccessRate || 0) * 100
              )}
              %
            </div>
            <p className="text-xs text-gray-600">Matches to conversations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Conversation Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getSuccessMetricColor(
                successAnalytics?.metrics.conversationRate || 0
              )}`}
            >
              {Math.round(
                (successAnalytics?.metrics.conversationRate || 0) * 100
              )}
              %
            </div>
            <p className="text-xs text-gray-600">Conversations to dates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Relationship Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getSuccessMetricColor(
                successAnalytics?.metrics.relationshipRate || 0
              )}`}
            >
              {Math.round(
                (successAnalytics?.metrics.relationshipRate || 0) * 100
              )}
              %
            </div>
            <p className="text-xs text-gray-600">Dates to relationships</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Time to Success
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {successAnalytics?.metrics.timeToSuccess || 0}
            </div>
            <p className="text-xs text-gray-600">Average days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Success Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Success Timeline
            </CardTitle>
            <CardDescription>
              Your journey milestones and progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {successAnalytics?.timeline?.slice(-7).map((event, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  {getSuccessMetricIcon(event.milestone)}
                  <div className="flex-1">
                    <div className="font-medium capitalize">
                      {event.milestone}
                    </div>
                    <div className="text-sm text-gray-600">{event.date}</div>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              ))}
              {(!successAnalytics?.timeline ||
                successAnalytics.timeline.length === 0) && (
                <p className="text-gray-500 text-center py-4">
                  No milestones yet. Start matching to see your progress!
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Premium Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Premium Features
            </CardTitle>
            <CardDescription>Your available features and usage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {premiumStatus?.availableFeatures?.map(renderFeatureUsage)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade Section */}
      {!premiumStatus?.tier && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade to Premium</CardTitle>
            <CardDescription>
              Unlock unlimited features and boost your dating success
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Basic Tier */}
              <div className="p-6 border rounded-lg">
                <h3 className="text-xl font-bold mb-2">Basic</h3>
                <div className="text-3xl font-bold mb-4">
                  $9.99<span className="text-sm font-normal">/month</span>
                </div>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Unlimited likes
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Read receipts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />5 super
                    likes per day
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Basic analytics
                  </li>
                </ul>
                <Button
                  className="w-full"
                  onClick={() => handleUpgrade("basic")}
                  disabled={upgrading}
                >
                  {upgrading ? "Processing..." : "Choose Basic"}
                </Button>
              </div>

              {/* Premium Tier */}
              <div className="p-6 border-2 border-blue-500 rounded-lg relative">
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  Most Popular
                </Badge>
                <h3 className="text-xl font-bold mb-2">Premium</h3>
                <div className="text-3xl font-bold mb-4">
                  $19.99<span className="text-sm font-normal">/month</span>
                </div>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Unlimited likes and super likes
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Rewind feature
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Priority in discovery
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Detailed analytics
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Verified badge
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    No ads
                  </li>
                </ul>
                <Button
                  className="w-full"
                  onClick={() => handleUpgrade("premium")}
                  disabled={upgrading}
                >
                  {upgrading ? "Processing..." : "Choose Premium"}
                </Button>
              </div>

              {/* Pro Tier */}
              <div className="p-6 border rounded-lg">
                <h3 className="text-xl font-bold mb-2">Pro</h3>
                <div className="text-3xl font-bold mb-4">
                  $39.99<span className="text-sm font-normal">/month</span>
                </div>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Everything in Premium
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Unlimited super likes
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Profile boost
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Advanced discovery filters
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Relationship coaching
                  </li>
                </ul>
                <Button
                  className="w-full"
                  onClick={() => handleUpgrade("pro")}
                  disabled={upgrading}
                >
                  {upgrading ? "Processing..." : "Choose Pro"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Trends */}
      {successAnalytics?.trends && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Success Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {successAnalytics.trends.improving
                    ? "↗️ Improving"
                    : "↘️ Declining"}
                </div>
                <p className="text-gray-600">
                  Your success rate is{" "}
                  {successAnalytics.trends.improving
                    ? "increasing"
                    : "decreasing"}{" "}
                  by {Math.round(successAnalytics.trends.rate * 100)}%
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">
                  {Math.round(successAnalytics.trends.rate * 100)}%
                </div>
                <p className="text-sm text-gray-600">Change rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
