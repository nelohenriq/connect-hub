import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/conversation-starters?userId=xxx&targetUserId=yyy
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const targetUserId = searchParams.get('targetUserId');

    if (!userId || !targetUserId) {
      return NextResponse.json({ error: 'User ID and target user ID required' }, { status: 400 });
    }

    // Get user's profile and target user's profile
    const [userProfile, targetProfile] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId },
        select: { interests: true, personalityTraits: true },
      }),
      prisma.profile.findUnique({
        where: { userId: targetUserId },
        select: { interests: true, personalityTraits: true },
      }),
    ]);

    if (!userProfile || !targetProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Find shared interests
    const sharedInterests = userProfile.interests.filter((interest) =>
      targetProfile.interests.includes(interest)
    );

    // Generate AI conversation starters based on shared interests
    const starters = generateConversationStarters(sharedInterests, userProfile, targetProfile);

    // Save conversation starters to database
    const savedStarters = await Promise.all(
      starters.map((starter) =>
        prisma.conversationStarter.create({
          data: {
            userId,
            prompt: starter,
            targetUserId,
            sharedInterests,
          },
        })
      )
    );

    return NextResponse.json({
      starters: savedStarters.map((s) => ({
        id: s.id,
        prompt: s.prompt,
        sharedInterests: s.sharedInterests,
      })),
      sharedInterests,
    });
  } catch (error) {
    console.error('Error generating conversation starters:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/conversation-starters/mark-used
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { starterId } = body;

    if (!starterId) {
      return NextResponse.json({ error: 'Starter ID required' }, { status: 400 });
    }

    const updatedStarter = await prisma.conversationStarter.update({
      where: { id: starterId },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });

    return NextResponse.json(updatedStarter);
  } catch (error) {
    console.error('Error marking starter as used:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

interface UserProfile {
  interests: string[];
  personalityTraits: string[];
}

function generateConversationStarters(sharedInterests: string[], userProfile: UserProfile, targetProfile: UserProfile): string[] {
  const starters: string[] = [];

  // Generate starters based on shared interests
  sharedInterests.forEach((interest) => {
    switch (interest.toLowerCase()) {
      case 'hiking':
        starters.push(
          `I noticed we both love hiking! What's your favorite trail that you've discovered?`,
          `Hiking is such a great way to explore nature. Have you been on any memorable hikes recently?`
        );
        break;
      case 'cooking':
        starters.push(
          `We both enjoy cooking! What's your signature dish that always impresses people?`,
          `Cooking is so therapeutic. What's the most interesting ingredient you've experimented with lately?`
        );
        break;
      case 'reading':
        starters.push(
          `I see we both love reading! What's the last book that completely captivated you?`,
          `Books can transport you to different worlds. What's your favorite genre and why?`
        );
        break;
      case 'music':
        starters.push(
          `Music lovers unite! What's your go-to playlist for different moods?`,
          `I love discovering new music. What's an artist or band that changed your perspective on music?`
        );
        break;
      case 'travel':
        starters.push(
          `Travel is one of life's greatest adventures! What's the most unforgettable place you've visited?`,
          `We both love exploring new places. What's on your travel bucket list?`
        );
        break;
      case 'fitness':
        starters.push(
          `Staying active is important to both of us! What's your favorite way to stay fit?`,
          `Fitness can be so rewarding. Have you tried any new workout routines lately?`
        );
        break;
      case 'photography':
        starters.push(
          `Photography captures life's beautiful moments! What's your favorite subject to photograph?`,
          `We both appreciate photography. What's the story behind your favorite photo?`
        );
        break;
      default:
        starters.push(
          `I noticed we both enjoy ${interest}! What's your favorite thing about it?`,
          `We have ${interest} in common! How did you first get interested in it?`
        );
    }
  });

  // Add personality-based starters
  const sharedPersonality = userProfile.personalityTraits.filter((trait: string) =>
    targetProfile.personalityTraits.includes(trait)
  );

  if (sharedPersonality.includes('adventurous')) {
    starters.push(
      `We both seem adventurous! What's the most spontaneous thing you've ever done?`,
      `Adventure calls to both of us! What's your next big adventure going to be?`
    );
  }

  if (sharedPersonality.includes('creative')) {
    starters.push(
      `Creativity flows through both of us! What's your favorite creative outlet?`,
      `We both have creative spirits! What's inspired your creativity lately?`
    );
  }

  // Ensure we have at least 3 starters
  while (starters.length < 3) {
    starters.push(
      `We seem to have a lot in common! What's something you're passionate about that we haven't discussed yet?`,
      `I'm really enjoying getting to know you. What's a fun fact about yourself that most people don't know?`,
      `We both value meaningful connections. What does a perfect day look like to you?`
    );
  }

  // Return first 5 starters
  return starters.slice(0, 5);
}