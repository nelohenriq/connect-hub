"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Lock, Star, Zap } from "lucide-react";

interface PremiumPromptProps {
  featureName: string;
  description: string;
  currentUsage?: number;
  limit?: number;
  upgradeTier?: "basic" | "premium" | "pro";
  onUpgradeClick: (tier: string) => void;
  children?: React.ReactNode;
  variant?: "banner" | "modal" | "inline";
}

export function PremiumPrompt({
  featureName,
  description,
  currentUsage = 0,
  limit,
  upgradeTier = "premium",
  onUpgradeClick,
  children,
  variant = "inline",
}: PremiumPromptProps) {
  const isUnlimited = limit === undefined;
  const usagePercentage =
    !isUnlimited && limit ? (currentUsage / limit) * 100 : 100;
  const isNearLimit = !isUnlimited && limit && usagePercentage >= 80;

  const getUpgradeTierIcon = (tier: string) => {
    switch (tier) {
      case "basic":
        return <Zap className="h-4 w-4" />;
      case "premium":
        return <Star className="h-4 w-4" />;
      case "pro":
        return <Crown className="h-4 w-4" />;
      default:
        return <Star className="h-4 w-4" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "basic":
        return "bg-blue-500 hover:bg-blue-600";
      case "premium":
        return "bg-purple-500 hover:bg-purple-600";
      case "pro":
        return "bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600";
      default:
        return "bg-purple-500 hover:bg-purple-600";
    }
  };

  const getTierName = (tier: string) => {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  if (variant === "banner") {
    return (
      <Card
        className={`border-2 ${
          isNearLimit
            ? "border-orange-200 bg-linear-to-r from-orange-50 to-yellow-50"
            : "border-yellow-200 bg-linear-to-r from-yellow-50 to-orange-50"
        }`}
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown className="h-5 w-5 text-yellow-500" />
            {featureName}
            <span className="text-sm font-normal text-gray-600">(Premium)</span>
            {isNearLimit && (
              <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full">
                Near Limit!
              </span>
            )}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-gray-400" />
              <span
                className={`text-sm ${
                  isNearLimit ? "text-orange-700 font-medium" : "text-gray-600"
                }`}
              >
                {isUnlimited
                  ? "Unlimited with premium"
                  : `Usage: ${currentUsage}/${limit} (${Math.round(
                      usagePercentage
                    )}%)`}
                {isNearLimit && " - Almost at limit!"}
              </span>
            </div>
            <Button
              onClick={() => onUpgradeClick(upgradeTier)}
              className={`${getTierColor(upgradeTier)} text-white`}
            >
              {getUpgradeTierIcon(upgradeTier)}
              Upgrade to {getTierName(upgradeTier)}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "modal") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Premium Feature
            </CardTitle>
            <CardDescription>
              {featureName} requires a premium subscription
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">{description}</p>

            {!isUnlimited && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  You&apos;ve reached your limit of {limit} uses. Upgrade to
                  continue!
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => window.history.back()}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => onUpgradeClick(upgradeTier)}
                className={`${getTierColor(upgradeTier)} text-white flex-1`}
              >
                {getUpgradeTierIcon(upgradeTier)}
                Upgrade
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Inline variant
  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg">
        <Card className="border border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 text-yellow-500" />
              <div>
                <div className="font-medium">{featureName}</div>
                <div className="text-sm text-gray-600">
                  {isUnlimited
                    ? "Unlimited with premium subscription"
                    : `${currentUsage}/${limit} used - Upgrade for unlimited access`}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => onUpgradeClick(upgradeTier)}
                className={`${getTierColor(upgradeTier)} text-white`}
              >
                Upgrade
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Usage tracking component
interface UsageDisplayProps {
  featureId: string;
  limit?: number;
  currentUsage?: number;
  isUnlimited?: boolean;
}

export function UsageDisplay({
  featureId,
  limit,
  currentUsage = 0,
  isUnlimited = false,
}: UsageDisplayProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _featureId = featureId; // Reserved for future use

  const percentage = isUnlimited ? 100 : (currentUsage / (limit || 1)) * 100;
  const isNearLimit = !isUnlimited && limit && percentage >= 80;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {isUnlimited ? (
          <>
            <Crown className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-600">
              Unlimited
            </span>
          </>
        ) : (
          <>
            <Lock className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium">
              {currentUsage}/{limit}
            </span>
            {isNearLimit && (
              <span className="text-xs text-orange-600 font-medium">Low!</span>
            )}
          </>
        )}
      </div>

      {!isUnlimited && (
        <div className="w-16 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              isNearLimit ? "bg-orange-400" : "bg-blue-400"
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Quick upgrade prompt component
interface QuickUpgradePromptProps {
  tier: "basic" | "premium" | "pro";
  onSelectTier: (tier: string) => void;
  features: string[];
  className?: string;
}

export function QuickUpgradePrompt({
  tier,
  onSelectTier,
  features,
  className = "",
}: QuickUpgradePromptProps) {
  const tierInfo = {
    basic: { name: "Basic", price: "$9.99", color: "blue" },
    premium: { name: "Premium", price: "$19.99", color: "purple" },
    pro: { name: "Pro", price: "$39.99", color: "orange" },
  };

  const currentTierInfo = tierInfo[tier];

  return (
    <Card className={`border-l-4 border-l-blue-500 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">
                Upgrade to {currentTierInfo.name}
              </span>
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {currentTierInfo.price}/month
            </div>
          </div>
          <Button
            onClick={() => onSelectTier(tier)}
            className={`${
              currentTierInfo.color === "blue"
                ? "bg-blue-500 hover:bg-blue-600"
                : currentTierInfo.color === "purple"
                ? "bg-purple-500 hover:bg-purple-600"
                : "bg-linear-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"
            } text-white`}
          >
            Upgrade
          </Button>
        </div>
        <div className="mt-3">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Includes:
          </div>
          <ul className="text-sm text-gray-600 space-y-1">
            {features.slice(0, 3).map((feature, index) => (
              <li key={index} className="flex items-center gap-2">
                <div className="h-1 w-1 bg-gray-400 rounded-full" />
                {feature}
              </li>
            ))}
            {features.length > 3 && (
              <li className="text-gray-500">
                +{features.length - 3} more features
              </li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
