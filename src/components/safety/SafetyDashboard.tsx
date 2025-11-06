// Safety Dashboard Component for Moderators
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  AlertTriangle,
  Users,
  TrendingUp,
  Activity,
  Flag,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
} from "lucide-react";

// Types for safety data
interface SafetyMetrics {
  totalUsers: number;
  flaggedContent: number;
  activeReports: number;
  trustScoreDistribution: {
    high: number;
    medium: number;
    low: number;
  };
}

interface ModerationQueue {
  id: string;
  contentType: string;
  severity: string;
  reportedAt: string;
  userId: string;
  description: string;
}

interface SafetyEvent {
  id: string;
  eventType: string;
  severity: string;
  description: string;
  createdAt: string;
  userId?: string;
}

export default function SafetyDashboard() {
  const [metrics, setMetrics] = useState<SafetyMetrics | null>(null);
  const [moderationQueue, setModerationQueue] = useState<ModerationQueue[]>([]);
  const [safetyEvents, setSafetyEvents] = useState<SafetyEvent[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSafetyData = useCallback(async () => {
    try {
      setLoading(true);

      // Load metrics
      const metricsResponse = await fetch("/api/safety?action=metrics");
      const metricsData = await metricsResponse.json();
      setMetrics(metricsData);

      // Load moderation queue
      const queueResponse = await fetch(
        `/api/moderation?action=queue&severity=${selectedSeverity}`
      );
      const queueData = await queueResponse.json();
      setModerationQueue(queueData.queue || []);

      // Load recent safety events
      const eventsResponse = await fetch("/api/safety?action=safety-events");
      const eventsData = await eventsResponse.json();
      setSafetyEvents(eventsData.events || []);

      setError(null);
    } catch (error) {
      console.error("Failed to load safety data:", error);
      setError("Failed to load safety data");
    } finally {
      setLoading(false);
    }
  }, [selectedSeverity]);

  useEffect(() => {
    loadSafetyData();
    // Refresh data every 30 seconds
    const interval = setInterval(loadSafetyData, 30000);
    return () => clearInterval(interval);
  }, [loadSafetyData]);

  const handleModerationAction = async (queueId: string, action: string) => {
    try {
      const response = await fetch("/api/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "moderate",
          queueId,
          moderationAction: action,
        }),
      });

      if (response.ok) {
        await loadSafetyData();
      }
    } catch (error) {
      console.error("Moderation action failed:", error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Safety Dashboard</h1>
            <p className="text-gray-600">Monitor and manage platform safety</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={loadSafetyData} variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Safety Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">+12% from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Flagged Content
            </CardTitle>
            <Flag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {metrics?.flaggedContent || 0}
            </div>
            <p className="text-xs text-muted-foreground">Requires review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Reports
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics?.activeReports || 0}
            </div>
            <p className="text-xs text-muted-foreground">Priority queue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trust Scores</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Badge variant="outline" className="text-xs">
                High: {metrics?.trustScoreDistribution.high || 0}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Medium: {metrics?.trustScoreDistribution.medium || 0}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Low: {metrics?.trustScoreDistribution.low || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Moderation Queue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Moderation Queue</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              {moderationQueue.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No items in moderation queue
                </div>
              ) : (
                <div className="space-y-4">
                  {moderationQueue.map((item) => (
                    <div
                      key={item.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-2 h-2 rounded-full ${getSeverityColor(
                              item.severity
                            )}`}
                          ></div>
                          <span className="font-medium capitalize">
                            {item.contentType}
                          </span>
                          <Badge
                            variant={getSeverityBadgeVariant(item.severity)}
                          >
                            {item.severity}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(item.reportedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700">
                        {item.description}
                      </p>

                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleModerationAction(item.id, "review")
                          }
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Review
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleModerationAction(item.id, "approve")
                          }
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleModerationAction(item.id, "reject")
                          }
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Safety Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Recent Safety Events</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80">
              {safetyEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No recent safety events
                </div>
              ) : (
                <div className="space-y-3">
                  {safetyEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start space-x-3 p-3 border rounded-lg"
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${getSeverityColor(
                          event.severity
                        )}`}
                      ></div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {event.eventType}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(event.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Trust Score Distribution */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Trust Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">High Trust (80-100)</span>
                <span className="text-sm text-gray-600">
                  {metrics.trustScoreDistribution.high}%
                </span>
              </div>
              <Progress
                value={metrics.trustScoreDistribution.high}
                className="h-2"
              />

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  Medium Trust (50-79)
                </span>
                <span className="text-sm text-gray-600">
                  {metrics.trustScoreDistribution.medium}%
                </span>
              </div>
              <Progress
                value={metrics.trustScoreDistribution.medium}
                className="h-2"
              />

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Low Trust (0-49)</span>
                <span className="text-sm text-gray-600">
                  {metrics.trustScoreDistribution.low}%
                </span>
              </div>
              <Progress
                value={metrics.trustScoreDistribution.low}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
