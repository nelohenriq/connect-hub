import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthService } from '@/lib/auth'
import { MatchingService } from '@/lib/matching'

// GET /api/matches - Get potential matches for current user
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = await AuthService.getUserFromToken(token)

    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check session limits
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const sessionLimit = await prisma.sessionLimit.findUnique({
      where: {
        userId_date: {
          userId: user.id,
          date: today
        }
      }
    })

    if (sessionLimit && sessionLimit.profilesViewed >= sessionLimit.maxProfiles) {
      return NextResponse.json({
        error: 'Daily profile limit reached',
        limit: sessionLimit.maxProfiles,
        viewed: sessionLimit.profilesViewed
      }, { status: 429 })
    }

    // Find potential matches
    const matches = await MatchingService.findMatchesForUser(user.id, 10)

    // Update session limits
    await prisma.sessionLimit.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: today
        }
      },
      update: {
        profilesViewed: { increment: matches.length }
      },
      create: {
        userId: user.id,
        date: today,
        profilesViewed: matches.length
      }
    })

    // Format response with transparency
    const formattedMatches = matches.map(match => ({
      id: match.user.id,
      firstName: match.user.firstName,
      lastName: match.user.lastName,
      age: Math.floor((Date.now() - match.user.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
      bio: match.user.bio,
      profilePicture: match.user.profilePicture,
      location: match.user.location,
      score: match.score,
      factors: match.factors,
      weights: match.weights,
      reasoning: match.reasoning,
      profile: {
        occupation: match.user.profile?.occupation,
        education: match.user.profile?.education,
        interests: match.user.profile?.interests,
        personalityTraits: match.user.profile?.personalityTraits
      }
    }))

    return NextResponse.json({
      matches: formattedMatches,
      remainingProfiles: sessionLimit
        ? Math.max(0, sessionLimit.maxProfiles - sessionLimit.profilesViewed)
        : 10
    })
  } catch (error) {
    console.error('Matches fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/matches - Like or pass on a match
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = await AuthService.getUserFromToken(token)

    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { targetUserId, action } = await request.json()

    if (!targetUserId || !['like', 'pass'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    if (action === 'like') {
      // Check if mutual like exists
      const existingLike = await prisma.like.findUnique({
        where: {
          likerId_likedId: {
            likerId: targetUserId,
            likedId: user.id
          }
        }
      })

      if (existingLike) {
        // Create match
        const match = await prisma.match.create({
          data: {
            senderId: user.id,
            receiverId: targetUserId,
            overallScore: 0.8, // High score for mutual likes
            compatibilityScore: 0.8,
            locationScore: 0.8,
            interestScore: 0.8,
            personalityScore: 0.8
          }
        })

        return NextResponse.json({
          success: true,
          match: true,
          matchId: match.id
        })
      } else {
        // Create like
        await prisma.like.create({
          data: {
            likerId: user.id,
            likedId: targetUserId
          }
        })

        return NextResponse.json({ success: true, match: false })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Match action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}