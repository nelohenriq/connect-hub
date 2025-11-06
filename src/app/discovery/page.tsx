"use client";

import { useState, useEffect } from "react";
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
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 35]);
  const [distance, setDistance] = useState(50);
  const [compatibilityMin, setCompatibilityMin] = useState(70);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      // Mock data - replace with API call
      const mockMatches: MatchData[] = [
        {
          id: "1",
          firstName: "Sarah",
          lastName: "Chen",
          age: 28,
          location: "San Francisco, CA",
          bio: "Coffee enthusiast, weekend hiker, and amateur photographer. Looking for someone to explore the city with!",
          profilePicture: "/placeholder-avatar.jpg",
          score: 0.92,
          factors: {
            compatibility: 0.95,
            location: 0.85,
            interests: 0.9,
            personality: 0.88,
          },
          weights: {
            compatibilityWeight: 0.4,
            locationWeight: 0.2,
            interestWeight: 0.3,
            personalityWeight: 0.1,
          },
          reasoning:
            "Excellent match based on shared outdoor interests and lifestyle compatibility.",
          profile: {
            occupation: "UX Designer",
            education: "Stanford University",
            interests: ["Photography", "Hiking", "Coffee", "Travel"],
            personalityTraits: ["Adventurous", "Creative", "Outgoing"],
          },
        },
        {
          id: "2",
          firstName: "Mike",
          lastName: "Rodriguez",
          age: 31,
          location: "Los Angeles, CA",
          bio: "Software engineer by day, musician by night. Love playing guitar and discovering new restaurants.",
          profilePicture: "/placeholder-avatar.jpg",
          score: 0.87,
          factors: {
            compatibility: 0.88,
            location: 0.9,
            interests: 0.85,
            personality: 0.82,
          },
          weights: {
            compatibilityWeight: 0.4,
            locationWeight: 0.2,
            interestWeight: 0.3,
            personalityWeight: 0.1,
          },
          reasoning:
            "Strong match with complementary creative and technical interests.",
          profile: {
            occupation: "Software Engineer",
            education: "UCLA",
            interests: ["Music", "Technology", "Food", "Guitar"],
            personalityTraits: ["Analytical", "Creative", "Sociable"],
          },
        },
        {
          id: "3",
          firstName: "Emma",
          lastName: "Thompson",
          age: 26,
          location: "New York, NY",
          bio: "Art gallery curator with a passion for contemporary art and vintage vinyl records.",
          profilePicture: "/placeholder-avatar.jpg",
          score: 0.95,
          factors: {
            compatibility: 0.98,
            location: 0.8,
            interests: 0.95,
            personality: 0.92,
          },
          weights: {
            compatibilityWeight: 0.4,
            locationWeight: 0.2,
            interestWeight: 0.3,
            personalityWeight: 0.1,
          },
          reasoning:
            "Outstanding cultural compatibility and shared artistic interests.",
          profile: {
            occupation: "Art Curator",
            education: "Pratt Institute",
            interests: ["Art", "Music", "Museums", "Vinyl"],
            personalityTraits: ["Artistic", "Intellectual", "Reflective"],
          },
        },
        {
          id: "4",
          firstName: "David",
          lastName: "Kim",
          age: 29,
          location: "Seattle, WA",
          bio: "Book lover, yoga practitioner, and food blogger. Always up for trying new cuisines!",
          profilePicture: "/placeholder-avatar.jpg",
          score: 0.83,
          factors: {
            compatibility: 0.85,
            location: 0.75,
            interests: 0.8,
            personality: 0.78,
          },
          weights: {
            compatibilityWeight: 0.4,
            locationWeight: 0.2,
            interestWeight: 0.3,
            personalityWeight: 0.1,
          },
          reasoning:
            "Good wellness and culinary compatibility with balanced lifestyle match.",
          profile: {
            occupation: "Content Creator",
            education: "University of Washington",
            interests: ["Books", "Yoga", "Food", "Writing"],
            personalityTraits: ["Mindful", "Curious", "Health-conscious"],
          },
        },
        {
          id: "5",
          firstName: "Lisa",
          lastName: "Wang",
          age: 27,
          location: "Austin, TX",
          bio: "Live music lover and craft beer enthusiast. Weekend warrior at local festivals.",
          profilePicture: "/placeholder-avatar.jpg",
          score: 0.89,
          factors: {
            compatibility: 0.9,
            location: 0.85,
            interests: 0.88,
            personality: 0.85,
          },
          weights: {
            compatibilityWeight: 0.4,
            locationWeight: 0.2,
            interestWeight: 0.3,
            personalityWeight: 0.1,
          },
          reasoning: "Excellent match for social and entertainment activities.",
          profile: {
            occupation: "Event Coordinator",
            education: "UT Austin",
            interests: ["Music", "Beer", "Festivals", "Live Events"],
            personalityTraits: ["Energetic", "Social", "Adventurous"],
          },
        },
        {
          id: "6",
          firstName: "James",
          lastName: "Wilson",
          age: 33,
          location: "Chicago, IL",
          bio: "Architect who loves modern design, jazz music, and long walks in the park.",
          profilePicture: "/placeholder-avatar.jpg",
          score: 0.78,
          factors: {
            compatibility: 0.8,
            location: 0.7,
            interests: 0.75,
            personality: 0.72,
          },
          weights: {
            compatibilityWeight: 0.4,
            locationWeight: 0.2,
            interestWeight: 0.3,
            personalityWeight: 0.1,
          },
          reasoning:
            "Decent match with some shared creative and cultural interests.",
          profile: {
            occupation: "Architect",
            education: "Illinois Institute of Technology",
            interests: ["Architecture", "Jazz", "Design", "Nature"],
            personalityTraits: ["Creative", "Thoughtful", "Reflective"],
          },
        },
      ];
      setMatches(mockMatches);
    } catch (error) {
      console.error("Error loading matches:", error);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
