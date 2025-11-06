"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, SlidersHorizontal, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MatchCard } from "@/components/discovery/MatchCard";
import { AppNavigation } from "@/components/layout/AppNavigation";
import { useAuth } from "@/lib/auth-context";

interface MatchData {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  bio: string;
  profilePicture: string;
  location: string;
  score: number;
  factors: {
    compatibility: number;
    location: number;
    interests: number;
    personality: number;
  };
  weights: {
    compatibilityWeight: number;
    locationWeight: number;
    interestWeight: number;
    personalityWeight: number;
  };
  reasoning: string;
  profile: {
    occupation?: string;
    education?: string;
    interests?: string[];
    personalityTraits?: string[];
  };
}

export default function DiscoveryPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 35]);
  const [distance, setDistance] = useState(50);
  const [compatibilityMin, setCompatibilityMin] = useState(70);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    if (isAuthenticated && user?.id) {
      loadMatches();
    }
  }, [isAuthenticated, isLoading, user?.id, router]);
  const loadMatches = async () => {
    try {
      if (!user?.id) {
        throw new Error("No authenticated user");
      }

      // Call the API to get matches
      const response = await fetch(
        `/api/matches?userId=${user.id}&limit=20&offset=0`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch matches");
      }
      const data = await response.json();
      setMatches(data.matches || []);
    } catch (error) {
      console.error("Error loading matches:", error);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredMatches = matches.filter((match) => {
    const fullName = `${match.firstName} ${match.lastName}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      match.bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (match.profile.interests &&
        match.profile.interests.some((interest: string) =>
          interest.toLowerCase().includes(searchQuery.toLowerCase())
        ));
    const matchesAge = match.age >= ageRange[0] && match.age <= ageRange[1];
    const matchesCompatibility = match.score * 100 >= compatibilityMin;

    return matchesSearch && matchesAge && matchesCompatibility;
  });

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleLogout = () => {
    // Mock logout - replace with actual logout logic
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      {user && <AppNavigation user={user} onLogout={handleLogout} />}

      {/* Header */}
      <div className="bg-background border-b border-border px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Discover Matches
              </h1>
              <p className="text-muted-foreground mt-1">
                Find your perfect connection from {matches.length} potential
                matches
              </p>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by name, interests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filter Matches</SheetTitle>
                    <SheetDescription>
                      Customize your search preferences
                    </SheetDescription>
                  </SheetHeader>

                  <div className="space-y-6 mt-6">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Age Range
                      </label>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={ageRange[0]}
                          onChange={(e) =>
                            setAgeRange([parseInt(e.target.value), ageRange[1]])
                          }
                          className="w-20"
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                          type="number"
                          value={ageRange[1]}
                          onChange={(e) =>
                            setAgeRange([ageRange[0], parseInt(e.target.value)])
                          }
                          className="w-20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Minimum Compatibility
                      </label>
                      <Select
                        value={compatibilityMin.toString()}
                        onValueChange={(value) =>
                          setCompatibilityMin(parseInt(value))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="50">50%+</SelectItem>
                          <SelectItem value="70">70%+</SelectItem>
                          <SelectItem value="80">80%+</SelectItem>
                          <SelectItem value="90">90%+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Distance (miles)
                      </label>
                      <Select
                        value={distance.toString()}
                        onValueChange={(value) => setDistance(parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">Within 10 miles</SelectItem>
                          <SelectItem value="25">Within 25 miles</SelectItem>
                          <SelectItem value="50">Within 50 miles</SelectItem>
                          <SelectItem value="100">Within 100 miles</SelectItem>
                          <SelectItem value="500">Any distance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Filter Summary */}
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>Showing {filteredMatches.length} matches</span>
            <Badge variant="secondary">
              Ages {ageRange[0]}-{ageRange[1]}
            </Badge>
            <Badge variant="secondary">
              {compatibilityMin}%+ compatibility
            </Badge>
            <Badge variant="secondary">Within {distance} miles</Badge>
          </div>
        </div>
      </div>

      {/* Matches Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {filteredMatches.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No matches found
            </h3>
            <p className="text-muted-foreground">
              Try adjusting your filters or search criteria
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onAction={async (userId: string, action: "like" | "pass") => {
                  console.log(`${action}d`, userId);
                  // Here you would typically call an API to record the action
                }}
                loading={false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
