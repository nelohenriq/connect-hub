"use client";

import { useState, useEffect } from "react";
import {
  User,
  Camera,
  MapPin,
  Calendar,
  Heart,
  Settings,
  Edit,
  Save,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  bio: string;
  location: string;
  occupation: string;
  education: string;
  profilePicture: string;
  interests: string[];
  personalityTraits: string[];
  profileCompleteness: number;
  joinDate: Date;
  lastActive: Date;
  isPremium: boolean;
}

const interestOptions = [
  "Photography",
  "Hiking",
  "Coffee",
  "Travel",
  "Music",
  "Technology",
  "Food",
  "Books",
  "Yoga",
  "Art",
  "Sports",
  "Movies",
  "Gaming",
  "Cooking",
  "Dancing",
  "Writing",
  "Fitness",
  "Nature",
  "Pets",
];

const personalityOptions = [
  "Adventurous",
  "Creative",
  "Outgoing",
  "Introverted",
  "Analytical",
  "Empathetic",
  "Ambitious",
  "Laid-back",
  "Humorous",
  "Thoughtful",
  "Energetic",
  "Calm",
  "Social",
  "Independent",
  "Romantic",
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    bio: "",
    location: "",
    occupation: "",
    education: "",
    interests: [] as string[],
    personalityTraits: [] as string[],
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // Mock data - replace with API call
      const mockProfile: UserProfile = {
        id: "current-user",
        firstName: "Alex",
        lastName: "Johnson",
        email: "alex.johnson@connecthub.com",
        age: 28,
        bio: "Software developer who loves hiking, photography, and trying new restaurants. Looking for someone to share adventures with!",
        location: "San Francisco, CA",
        occupation: "Software Engineer",
        education: "Stanford University",
        profilePicture: "/placeholder-avatar.jpg",
        interests: ["Photography", "Hiking", "Technology", "Food", "Travel"],
        personalityTraits: [
          "Adventurous",
          "Creative",
          "Analytical",
          "Outgoing",
        ],
        profileCompleteness: 85,
        joinDate: new Date("2024-01-15"),
        lastActive: new Date(),
        isPremium: false,
      };

      setProfile(mockProfile);
      setFormData({
        firstName: mockProfile.firstName,
        lastName: mockProfile.lastName,
        bio: mockProfile.bio,
        location: mockProfile.location,
        occupation: mockProfile.occupation,
        education: mockProfile.education,
        interests: mockProfile.interests,
        personalityTraits: mockProfile.personalityTraits,
      });
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      // Mock API call - replace with actual API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setProfile({
        ...profile,
        ...formData,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!profile) return;

    setFormData({
      firstName: profile.firstName,
      lastName: profile.lastName,
      bio: profile.bio,
      location: profile.location,
      occupation: profile.occupation,
      education: profile.education,
      interests: profile.interests,
      personalityTraits: profile.personalityTraits,
    });
    setIsEditing(false);
  };

  const toggleInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const togglePersonalityTrait = (trait: string) => {
    setFormData((prev) => ({
      ...prev,
      personalityTraits: prev.personalityTraits.includes(trait)
        ? prev.personalityTraits.filter((t) => t !== trait)
        : [...prev.personalityTraits, trait],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Profile not found
          </h2>
          <p className="text-muted-foreground">
            Unable to load your profile information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground mt-1">
              Manage your profile information and preferences
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button onClick={handleCancel} variant="outline">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Profile Completeness */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                Profile Completeness
              </span>
              <span className="text-sm text-muted-foreground">
                {profile.profileCompleteness}%
              </span>
            </div>
            <Progress value={profile.profileCompleteness} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Complete your profile to increase your chances of getting matches!
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Picture & Basic Info */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="relative inline-block">
                    <Avatar className="h-32 w-32 mx-auto mb-4">
                      <AvatarImage src={profile.profilePicture} />
                      <AvatarFallback className="text-2xl">
                        {profile.firstName[0]}
                        {profile.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    {isEditing && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute bottom-2 right-2 rounded-full h-8 w-8 p-0"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <h2 className="text-xl font-semibold text-foreground mb-1">
                    {profile.firstName} {profile.lastName}
                  </h2>
                  <p className="text-muted-foreground mb-2">
                    {profile.age} years old
                  </p>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{profile.location}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Joined {profile.joinDate.toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {profile.isPremium && (
                    <Badge className="mt-4 bg-linear-to-r from-yellow-400 to-orange-500">
                      <Heart className="h-3 w-3 mr-1" />
                      Premium Member
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Your personal details and background information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          firstName: e.target.value,
                        }))
                      }
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          lastName: e.target.value,
                        }))
                      }
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    disabled={!isEditing}
                    rows={3}
                    placeholder="Tell others about yourself..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="occupation">Occupation</Label>
                    <Input
                      id="occupation"
                      value={formData.occupation}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          occupation: e.target.value,
                        }))
                      }
                      disabled={!isEditing}
                      placeholder="What do you do?"
                    />
                  </div>
                  <div>
                    <Label htmlFor="education">Education</Label>
                    <Input
                      id="education"
                      value={formData.education}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          education: e.target.value,
                        }))
                      }
                      disabled={!isEditing}
                      placeholder="Where did you study?"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        location: e.target.value,
                      }))
                    }
                    disabled={!isEditing}
                    placeholder="City, State/Country"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Interests */}
            <Card>
              <CardHeader>
                <CardTitle>Interests</CardTitle>
                <CardDescription>
                  What are you passionate about? Select up to 8 interests.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {interestOptions.map((interest) => (
                    <Button
                      key={interest}
                      variant={
                        formData.interests.includes(interest)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => isEditing && toggleInterest(interest)}
                      disabled={!isEditing}
                      className="text-xs"
                    >
                      {interest}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Personality Traits */}
            <Card>
              <CardHeader>
                <CardTitle>Personality Traits</CardTitle>
                <CardDescription>
                  How would you describe your personality? Select up to 5
                  traits.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {personalityOptions.map((trait) => (
                    <Button
                      key={trait}
                      variant={
                        formData.personalityTraits.includes(trait)
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => isEditing && togglePersonalityTrait(trait)}
                      disabled={!isEditing}
                      className="text-xs"
                    >
                      {trait}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Account Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Manage your account preferences and privacy settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Email</p>
                    <p className="text-sm text-muted-foreground">
                      {profile.email}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Change Email
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Password</p>
                    <p className="text-sm text-muted-foreground">
                      Last changed 3 months ago
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
