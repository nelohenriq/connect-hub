"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Heart, X, Info, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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

interface MatchCardProps {
  match: MatchData;
  onAction: (userId: string, action: "like" | "pass") => Promise<void>;
  loading?: boolean;
}

export function MatchCard({ match, onAction, loading }: MatchCardProps) {
  const [showTransparency, setShowTransparency] = useState(false);

  const handleAction = async (action: "like" | "pass") => {
    await onAction(match.id, action);
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-600";
    if (score >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.8) return "Excellent Match";
    if (score >= 0.6) return "Good Match";
    return "Potential Match";
  };

  return (
    <Card className="w-full max-w-sm mx-auto overflow-hidden">
      <div className="relative">
        {match.profilePicture ? (
          <img
            src={match.profilePicture}
            alt={`${match.firstName} ${match.lastName}`}
            className="w-full h-64 object-cover"
          />
        ) : (
          <div className="w-full h-64 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500">No photo</span>
          </div>
        )}

        {/* Match Score Badge */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
          <span
            className={`text-sm font-semibold ${getScoreColor(match.score)}`}
          >
            {Math.round(match.score * 100)}%
          </span>
        </div>

        {/* Transparency Button */}
        <Dialog open={showTransparency} onOpenChange={setShowTransparency}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm hover:bg-white/95"
            >
              <Info className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Match Transparency</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">
                  Match Score: {Math.round(match.score * 100)}%
                </h4>
                <p className="text-sm text-gray-600">{match.reasoning}</p>
              </div>

              <div className="space-y-2">
                <h5 className="font-medium">Compatibility Factors:</h5>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Lifestyle Compatibility</span>
                    <span>
                      {Math.round(match.factors.compatibility * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={match.factors.compatibility * 100}
                    className="h-2"
                  />

                  <div className="flex justify-between text-sm">
                    <span>Location Proximity</span>
                    <span>{Math.round(match.factors.location * 100)}%</span>
                  </div>
                  <Progress
                    value={match.factors.location * 100}
                    className="h-2"
                  />

                  <div className="flex justify-between text-sm">
                    <span>Shared Interests</span>
                    <span>{Math.round(match.factors.interests * 100)}%</span>
                  </div>
                  <Progress
                    value={match.factors.interests * 100}
                    className="h-2"
                  />

                  <div className="flex justify-between text-sm">
                    <span>Personality Match</span>
                    <span>{Math.round(match.factors.personality * 100)}%</span>
                  </div>
                  <Progress
                    value={match.factors.personality * 100}
                    className="h-2"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="font-medium">Your Preferences:</h5>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Compatibility</span>
                    <span>
                      {Math.round(match.weights.compatibilityWeight * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Location</span>
                    <span>
                      {Math.round(match.weights.locationWeight * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Interests</span>
                    <span>
                      {Math.round(match.weights.interestWeight * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Personality</span>
                    <span>
                      {Math.round(match.weights.personalityWeight * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Name and Age */}
          <div>
            <h3 className="text-xl font-semibold">
              {match.firstName} {match.lastName}, {match.age}
            </h3>
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {match.location}
            </p>
          </div>

          {/* Occupation and Education */}
          {(match.profile.occupation || match.profile.education) && (
            <div className="text-sm text-gray-700">
              {match.profile.occupation && <p>{match.profile.occupation}</p>}
              {match.profile.education && <p>{match.profile.education}</p>}
            </div>
          )}

          {/* Bio */}
          {match.bio && (
            <p className="text-sm text-gray-700 line-clamp-2">{match.bio}</p>
          )}

          {/* Interests */}
          {match.profile.interests && match.profile.interests.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {match.profile.interests.slice(0, 3).map((interest) => (
                <Badge key={interest} variant="secondary" className="text-xs">
                  {interest}
                </Badge>
              ))}
              {match.profile.interests.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{match.profile.interests.length - 3} more
                </Badge>
              )}
            </div>
          )}

          {/* Personality Traits */}
          {match.profile.personalityTraits &&
            match.profile.personalityTraits.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {match.profile.personalityTraits.slice(0, 2).map((trait) => (
                  <Badge key={trait} variant="outline" className="text-xs">
                    {trait}
                  </Badge>
                ))}
              </div>
            )}

          {/* Match Score Label */}
          <div className="text-center">
            <Badge variant="outline" className={getScoreColor(match.score)}>
              {getScoreLabel(match.score)}
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => handleAction("pass")}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-1" />
              Pass
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-pink-500 hover:bg-pink-600 text-white"
              onClick={() => handleAction("like")}
              disabled={loading}
            >
              <Heart className="h-4 w-4 mr-1" />
              Like
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
