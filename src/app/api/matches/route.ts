import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get potential matches for the user
    // This is a simplified version - in production you'd have a more sophisticated matching algorithm
    const potentialMatches = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userId } },
          { isVerified: true },
          {
            profile: {
              isNot: null
            }
          }
        ]
      },
      include: {
        profile: true,
        trustScore: true,
      },
      take: limit,
      skip: offset,
    });

    // Transform the data to match the expected format
    const matches = potentialMatches.map((user) => {
      const profile = user.profile!;
      const trustScore = user.trustScore;

      // Calculate compatibility score (simplified)
      const compatibilityScore = Math.random() * 0.4 + 0.6; // 60-100%
      const locationScore = Math.random() * 0.3 + 0.7; // 70-100%
      const interestScore = Math.random() * 0.3 + 0.7; // 70-100%
      const personalityScore = Math.random() * 0.3 + 0.7; // 70-100%

      const overallScore = (
        compatibilityScore * 0.4 +
        locationScore * 0.2 +
        interestScore * 0.25 +
        personalityScore * 0.15
      );

      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        age: Math.floor((Date.now() - user.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
        bio: user.bio || "",
        profilePicture: user.profilePicture || "/placeholder-avatar.jpg",
        location: user.location || "Unknown",
        score: overallScore,
        factors: {
          compatibility: compatibilityScore,
          location: locationScore,
          interests: interestScore,
          personality: personalityScore,
        },
        weights: {
          compatibilityWeight: 0.4,
          locationWeight: 0.2,
          interestWeight: 0.25,
          personalityWeight: 0.15,
        },
        reasoning: `Strong match based on shared interests and lifestyle compatibility. Trust score: ${trustScore?.overallScore || 50}/100`,
        profile: {
          occupation: profile.occupation,
          education: profile.education,
          interests: profile.interests || [],
          personalityTraits: profile.personalityTraits || [],
        },
      };
    });

    return NextResponse.json({
      matches,
      total: potentialMatches.length,
      hasMore: potentialMatches.length === limit,
    });

  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json(
      { error: "Failed to fetch matches" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { senderId, receiverId, compatibilityScore, locationScore, interestScore, personalityScore } = body;

    if (!senderId || !receiverId) {
      return NextResponse.json(
        { error: "Sender and receiver IDs are required" },
        { status: 400 }
      );
    }

    // Check if match already exists
    const existingMatch = await prisma.match.findUnique({
      where: {
        senderId_receiverId: {
          senderId,
          receiverId,
        },
      },
    });

    if (existingMatch) {
      return NextResponse.json(
        { error: "Match already exists" },
        { status: 409 }
      );
    }

    // Create the match
    const match = await prisma.match.create({
      data: {
        senderId,
        receiverId,
        overallScore: compatibilityScore,
        compatibilityScore: compatibilityScore,
        locationScore: locationScore || 0,
        interestScore: interestScore || 0,
        personalityScore: personalityScore || 0,
      },
    });

    return NextResponse.json(match, { status: 201 });

  } catch (error) {
    console.error("Error creating match:", error);
    return NextResponse.json(
      { error: "Failed to create match" },
      { status: 500 }
    );
  }
}