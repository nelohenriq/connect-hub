import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthService } from '@/lib/auth'

// GET /api/analytics - Get user's profile analytics
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

    const analytics = await prisma.userAnalytics.findUnique({
      where: { userId: user.id }
    })

    if (!analytics) {
      // Create initial analytics if none exist
      const newAnalytics = await prisma.userAnalytics.create({
        data: { userId: user.id }
      })
      return NextResponse.json(newAnalytics)
    }

    // Calculate derived metrics
    const totalInteractions = analytics.likesReceived + analytics.matchesMade
    const matchRate = totalInteractions > 0 ? (analytics.matchesMade / totalInteractions) * 100 : 0
    const avgSessionTime = analytics.appOpens > 0 ? analytics.timeSpent / analytics.appOpens : 0

    return NextResponse.json({
      ...analytics,
      derivedMetrics: {
        matchRate: Math.round(matchRate * 100) / 100,
        avgSessionTime: Math.round(avgSessionTime * 100) / 100,
        totalInteractions,
        engagementScore: Math.min(100, Math.round((analytics.appOpens * 0.3 + analytics.matchesMade * 0.4 + analytics.messagesSent * 0.3)))
      }
    })
  } catch (error) {
    console.error('Analytics fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/analytics - Update analytics (called by frontend)
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

    const { action, data } = await request.json()

    type IncrementOp = { increment: number }
    type UpdateData = {
      profileViews?: IncrementOp
      appOpens?: IncrementOp
      timeSpent?: IncrementOp
      likesReceived?: IncrementOp
      matchesMade?: IncrementOp
      messagesSent?: IncrementOp
      messagesReceived?: IncrementOp
      conversationsStarted?: IncrementOp
      datesScheduled?: IncrementOp
      relationshipsFormed?: IncrementOp
      lastActive?: Date
    }

    const updateData: UpdateData = {}

    switch (action) {
      case 'profile_view':
        updateData.profileViews = { increment: 1 }
        break
      case 'app_open':
        updateData.appOpens = { increment: 1 }
        updateData.lastActive = new Date()
        break
      case 'session_time':
        updateData.timeSpent = { increment: data.minutes || 0 }
        break
      case 'like_received':
        updateData.likesReceived = { increment: 1 }
        break
      case 'match_made':
        updateData.matchesMade = { increment: 1 }
        break
      case 'message_sent':
        updateData.messagesSent = { increment: 1 }
        break
      case 'message_received':
        updateData.messagesReceived = { increment: 1 }
        break
      case 'conversation_started':
        updateData.conversationsStarted = { increment: 1 }
        break
      case 'date_scheduled':
        updateData.datesScheduled = { increment: 1 }
        break
      case 'relationship_formed':
        updateData.relationshipsFormed = { increment: 1 }
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const analytics = await prisma.userAnalytics.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        ...Object.fromEntries(
          Object.entries(updateData).map(([key, value]) => [
            key,
            typeof value === 'object' && 'increment' in value ? value.increment : value
          ])
        )
      }
    })

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Analytics update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}