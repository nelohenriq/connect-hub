"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  MessageCircle,
  User,
  Crown,
  Shield,
  Star,
  Users,
  Video,
  Eye,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppNavigation } from "@/components/layout/AppNavigation";

interface UserStats {
  matchesCount: number;
  conversationsCount: number;
  profileViews: number;
  premiumStatus: string | null;
}

interface RecentMatch {
  id: string;
  name: string;
  age: number;
  image: string;
  compatibilityScore: number;
  lastActive: string;
}

export default function HomePage() {
  const router = useRouter();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{
    id: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
    isPremium?: boolean;
  } | null>(null);

  useEffect(() => {
    // Simulate loading user data - replace with actual auth check
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Mock user data - replace with actual user from auth
      const mockUser = {
        id: "1",
        firstName: "Alex",
        lastName: "Johnson",
        profilePicture: "/placeholder-avatar.jpg",
        isPremium: false,
      };
      setUser(mockUser);

      // Mock stats - replace with API call
      const mockStats: UserStats = {
        matchesCount: 24,
        conversationsCount: 12,
        profileViews: 156,
        premiumStatus: null,
      };
      setUserStats(mockStats);

      // Mock recent matches - replace with API call
      const mockMatches: RecentMatch[] = [
        {
          id: "1",
          name: "Sarah Chen",
          age: 28,
          image: "/placeholder-avatar.jpg",
          compatibilityScore: 92,
          lastActive: "2 hours ago",
        },
        {
          id: "2",
          name: "Mike Rodriguez",
          age: 31,
          image: "/placeholder-avatar.jpg",
          compatibilityScore: 87,
          lastActive: "1 day ago",
        },
        {
          id: "3",
          name: "Emma Thompson",
          age: 26,
          image: "/placeholder-avatar.jpg",
          compatibilityScore: 95,
          lastActive: "3 days ago",
        },
      ];
      setRecentMatches(mockMatches);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleLogout = () => {
    // Mock logout - replace with actual logout logic
    setUser(null);
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      {user && <AppNavigation user={user} onLogout={handleLogout} />}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user?.firstName || "there"}!
          </h2>
          <p className="text-muted-foreground">
            Ready to make new connections today?
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {userStats?.matchesCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-green-500" />
                Conversations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {userStats?.conversationsCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">Active chats</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Eye className="h-4 w-4 text-purple-500" />
                Profile Views
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {userStats?.profileViews || 0}
              </div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Compatibility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">94%</div>
              <p className="text-xs text-muted-foreground">Average score</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Jump into your dating journey</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => router.push("/discovery")}
                    className="h-20 flex flex-col items-center justify-center gap-2"
                    variant="outline"
                  >
                    <Heart className="h-6 w-6 text-pink-500" />
                    <span>Discover Matches</span>
                  </Button>

                  <Button
                    onClick={() => router.push("/messages")}
                    className="h-20 flex flex-col items-center justify-center gap-2"
                    variant="outline"
                  >
                    <MessageCircle className="h-6 w-6 text-blue-500" />
                    <span>Messages</span>
                  </Button>

                  <Button
                    onClick={() => router.push("/profile")}
                    className="h-20 flex flex-col items-center justify-center gap-2"
                    variant="outline"
                  >
                    <User className="h-6 w-6 text-green-500" />
                    <span>My Profile</span>
                  </Button>

                  <Button
                    onClick={() => router.push("/verification")}
                    className="h-20 flex flex-col items-center justify-center gap-2"
                    variant="outline"
                  >
                    <Video className="h-6 w-6 text-purple-500" />
                    <span>Verify</span>
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <Button
                    onClick={() => router.push("/premium")}
                    className="w-full bg-linear-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade to Premium
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Matches */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Recent Matches</CardTitle>
                <CardDescription>
                  People you might like to connect with
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                    onClick={() => router.push(`/profile/${match.id}`)}
                  >
                    <Avatar>
                      <AvatarImage src={match.image} />
                      <AvatarFallback>
                        {match.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground truncate">
                          {match.name}, {match.age}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {match.compatibilityScore}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Active {match.lastActive}
                      </p>
                    </div>

                    <Button size="sm" variant="ghost">
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/discovery")}
                >
                  See All Matches
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Safety Banner */}
        <Card className="mt-8 bg-accent/50 border-accent">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-green-500" />
              <div>
                <h3 className="font-semibold text-green-900">
                  Your Safety is Our Priority
                </h3>
                <p className="text-sm text-green-700">
                  All profiles are verified and our AI safety system protects
                  you from inappropriate content.
                </p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto">
                Learn More
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
