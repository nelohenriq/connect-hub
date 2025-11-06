"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, RefreshCw } from "lucide-react";

interface ConversationStarterProps {
  userId: string;
  targetUserId: string;
  onStarterUsed?: (starterId: string) => void;
}

interface ConversationStarter {
  id: string;
  prompt: string;
  sharedInterests: string[];
}

export default function ConversationStarterComponent({
  userId,
  targetUserId,
  onStarterUsed,
}: ConversationStarterProps) {
  const [starters, setStarters] = useState<ConversationStarter[]>([]);
  const [sharedInterests, setSharedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [usedStarters, setUsedStarters] = useState<Set<string>>(new Set());

  const loadConversationStarters = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/conversation-starters?userId=${userId}&targetUserId=${targetUserId}`
      );

      if (response.ok) {
        const data = await response.json();
        setStarters(data.starters);
        setSharedInterests(data.sharedInterests);
      }
    } catch (error) {
      console.error("Error loading conversation starters:", error);
    } finally {
      setLoading(false);
    }
  }, [userId, targetUserId]);

  useEffect(() => {
    loadConversationStarters();
  }, [loadConversationStarters, userId, targetUserId]);

  const markStarterAsUsed = async (starterId: string) => {
    try {
      await fetch("/api/conversation-starters/mark-used", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starterId }),
      });

      setUsedStarters((prev) => new Set(prev).add(starterId));
      onStarterUsed?.(starterId);
    } catch (error) {
      console.error("Error marking starter as used:", error);
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Generating conversation starters...</span>
        </div>
      </Card>
    );
  }

  if (starters.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-center">
          <Sparkles className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-600">
            No conversation starters available yet.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={loadConversationStarters}
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Generate Starters
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center mb-4">
        <Sparkles className="h-5 w-5 mr-2 text-blue-500" />
        <h3 className="font-semibold">AI Conversation Starters</h3>
      </div>

      {sharedInterests.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Based on shared interests:
          </p>
          <div className="flex flex-wrap gap-1">
            {sharedInterests.map((interest) => (
              <span
                key={interest}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {starters.map((starter) => (
          <div
            key={starter.id}
            className={`p-3 border rounded-lg ${
              usedStarters.has(starter.id)
                ? "bg-gray-50 border-gray-200"
                : "bg-white border-gray-300 hover:border-blue-300"
            }`}
          >
            <p className="text-sm mb-2">{starter.prompt}</p>
            <div className="flex justify-between items-center">
              <div className="flex flex-wrap gap-1">
                {starter.sharedInterests.slice(0, 2).map((interest) => (
                  <span
                    key={interest}
                    className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                  >
                    {interest}
                  </span>
                ))}
                {starter.sharedInterests.length > 2 && (
                  <span className="text-xs text-gray-500">
                    +{starter.sharedInterests.length - 2} more
                  </span>
                )}
              </div>

              {!usedStarters.has(starter.id) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markStarterAsUsed(starter.id)}
                  className="text-xs"
                >
                  Use This
                </Button>
              )}

              {usedStarters.has(starter.id) && (
                <span className="text-xs text-green-600 font-medium">
                  Used ✓
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={loadConversationStarters}
          className="w-full"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Generate New Starters
        </Button>
      </div>
    </Card>
  );
}
