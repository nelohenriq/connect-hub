import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        trustScore: true,
        analytics: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Calculate age from date of birth
    const age = Math.floor((Date.now() - user.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

    // Calculate profile completeness
    const profileFields = [
      user.bio,
      user.location,
      user.profilePicture,
      user.profile?.occupation,
      user.profile?.education,
      user.profile?.height,
      user.profile?.religion,
      user.profile?.ethnicity,
      user.profile?.smoking,
      user.profile?.drinking,
      user.profile?.exercise,
      user.profile?.diet,
      user.profile?.relationshipGoals,
      user.profile?.children,
      user.profile?.pets,
    ];

    const completedFields = profileFields.filter(field => field !== null && field !== undefined && field !== "").length;
    const profileCompleteness = Math.round((completedFields / profileFields.length) * 100);

    const profileData = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      age,
      bio: user.bio,
      location: user.location,
      occupation: user.profile?.occupation,
      education: user.profile?.education,
      profilePicture: user.profilePicture,
      interests: user.profile?.interests || [],
      personalityTraits: user.profile?.personalityTraits || [],
      profileCompleteness,
      joinDate: user.createdAt,
      lastActive: user.analytics?.lastActive || user.updatedAt,
      isPremium: false, // TODO: Implement premium logic
      trustScore: user.trustScore?.overallScore || 50,
    };

    return NextResponse.json(profileData);

  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, ...updateData } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Separate user and profile fields
    const userFields = {
      firstName: updateData.firstName,
      lastName: updateData.lastName,
      bio: updateData.bio,
      location: updateData.location,
    };

    const profileFields = {
      occupation: updateData.occupation,
      education: updateData.education,
      interests: updateData.interests,
      personalityTraits: updateData.personalityTraits,
    };

    // Update user data
    await prisma.user.update({
      where: { id: userId },
      data: userFields,
    });

    // Update or create profile data
    const existingProfile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      await prisma.profile.update({
        where: { userId },
        data: profileFields,
      });
    } else {
      await prisma.profile.create({
        data: {
          userId,
          ...profileFields,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
    });

  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}