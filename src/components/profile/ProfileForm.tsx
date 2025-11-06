"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface ProfileData {
  height?: number;
  education?: string;
  occupation?: string;
  religion?: string;
  ethnicity?: string;
  smoking?: string;
  drinking?: string;
  exercise?: string;
  diet?: string;
  interests?: string[];
  musicGenres?: string[];
  favoriteMovies?: string[];
  favoriteBooks?: string[];
  personalityTraits?: string[];
  loveLanguage?: string;
  relationshipGoals?: string;
  children?: string;
  pets?: string;
}

interface ProfileFormProps {
  initialData?: ProfileData;
  onSubmit: (data: ProfileData) => Promise<void>;
  loading?: boolean;
}

const interestOptions = [
  "Travel",
  "Cooking",
  "Reading",
  "Music",
  "Sports",
  "Art",
  "Photography",
  "Hiking",
  "Yoga",
  "Gaming",
  "Movies",
  "Theater",
  "Dancing",
  "Writing",
  "Volunteering",
  "Fitness",
  "Meditation",
  "Gardening",
  "Pets",
  "Technology",
];

const personalityTraits = [
  "Introverted",
  "Extroverted",
  "Creative",
  "Analytical",
  "Adventurous",
  "Homebody",
  "Optimistic",
  "Realistic",
  "Spontaneous",
  "Organized",
  "Empathetic",
  "Ambitious",
  "Easygoing",
  "Detail-oriented",
];

export function ProfileForm({
  initialData,
  onSubmit,
  loading,
}: ProfileFormProps) {
  const [formData, setFormData] = useState<ProfileData>(initialData || {});
  const [newInterest, setNewInterest] = useState("");
  const [newTrait, setNewTrait] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const addInterest = (interest: string) => {
    if (interest && !formData.interests?.includes(interest)) {
      setFormData((prev) => ({
        ...prev,
        interests: [...(prev.interests || []), interest],
      }));
    }
    setNewInterest("");
  };

  const removeInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests?.filter((i) => i !== interest) || [],
    }));
  };

  const addTrait = (trait: string) => {
    if (trait && !formData.personalityTraits?.includes(trait)) {
      setFormData((prev) => ({
        ...prev,
        personalityTraits: [...(prev.personalityTraits || []), trait],
      }));
    }
    setNewTrait("");
  };

  const removeTrait = (trait: string) => {
    setFormData((prev) => ({
      ...prev,
      personalityTraits:
        prev.personalityTraits?.filter((t) => t !== trait) || [],
    }));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Complete Your Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                value={formData.height || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    height: parseInt(e.target.value) || undefined,
                  }))
                }
                placeholder="170"
              />
            </div>
            <div>
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                value={formData.occupation || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    occupation: e.target.value,
                  }))
                }
                placeholder="Software Engineer"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="education">Education</Label>
              <Select
                value={formData.education || ""}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, education: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select education" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high_school">High School</SelectItem>
                  <SelectItem value="associates">Associates Degree</SelectItem>
                  <SelectItem value="bachelors">
                    Bachelor&lsquo;s Degree
                  </SelectItem>
                  <SelectItem value="masters">Master&lsquo;s Degree</SelectItem>
                  <SelectItem value="phd">PhD</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="religion">Religion</Label>
              <Select
                value={formData.religion || ""}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, religion: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select religion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="christian">Christian</SelectItem>
                  <SelectItem value="muslim">Muslim</SelectItem>
                  <SelectItem value="hindu">Hindu</SelectItem>
                  <SelectItem value="buddhist">Buddhist</SelectItem>
                  <SelectItem value="jewish">Jewish</SelectItem>
                  <SelectItem value="atheist">Atheist</SelectItem>
                  <SelectItem value="agnostic">Agnostic</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_say">
                    Prefer not to say
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lifestyle */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Lifestyle</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="smoking">Smoking</Label>
                <Select
                  value={formData.smoking || ""}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, smoking: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="occasionally">Occasionally</SelectItem>
                    <SelectItem value="regularly">Regularly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="drinking">Drinking</Label>
                <Select
                  value={formData.drinking || ""}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, drinking: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="occasionally">Occasionally</SelectItem>
                    <SelectItem value="regularly">Regularly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="exercise">Exercise</Label>
                <Select
                  value={formData.exercise || ""}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, exercise: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="sometimes">Sometimes</SelectItem>
                    <SelectItem value="regularly">Regularly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Interests */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Interests</h3>
            <div className="flex flex-wrap gap-2">
              {formData.interests?.map((interest) => (
                <Badge
                  key={interest}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {interest}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeInterest(interest)}
                  />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Select value={newInterest} onValueChange={addInterest}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add interest" />
                </SelectTrigger>
                <SelectContent>
                  {interestOptions
                    .filter((option) => !formData.interests?.includes(option))
                    .map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Personality Traits */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Personality Traits</h3>
            <div className="flex flex-wrap gap-2">
              {formData.personalityTraits?.map((trait) => (
                <Badge
                  key={trait}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {trait}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removeTrait(trait)}
                  />
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Select value={newTrait} onValueChange={addTrait}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Add trait" />
                </SelectTrigger>
                <SelectContent>
                  {personalityTraits
                    .filter(
                      (trait) => !formData.personalityTraits?.includes(trait)
                    )
                    .map((trait) => (
                      <SelectItem key={trait} value={trait}>
                        {trait}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="relationshipGoals">Relationship Goals</Label>
                <Select
                  value={formData.relationshipGoals || ""}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      relationshipGoals: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select goals" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">Casual dating</SelectItem>
                    <SelectItem value="serious">
                      Serious relationship
                    </SelectItem>
                    <SelectItem value="marriage">Marriage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="children">Children</Label>
                <Select
                  value={formData.children || ""}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, children: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="want">Want children</SelectItem>
                    <SelectItem value="dont_want">
                      Don&lsquo;t want children
                    </SelectItem>
                    <SelectItem value="have">Have children</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save Profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
