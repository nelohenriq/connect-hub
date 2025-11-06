import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/moderation/report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, reporterId, reason, description } = body;

    if (!messageId || !reporterId || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify message exists
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, senderId: true },
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Create report
    const report = await prisma.messageReport.create({
      data: {
        messageId,
        reporterId,
        reason,
        description,
      },
    });

    // If multiple reports for same message, consider auto-blocking
    const reportCount = await prisma.messageReport.count({
      where: { messageId },
    });

    if (reportCount >= 3) { // Threshold for auto-moderation
      await prisma.message.update({
        where: { id: messageId },
        data: {
          isModerated: true,
          moderationReason: 'Multiple user reports',
          isBlocked: true,
        },
      });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/moderation/reports?status=pending
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const reports = await prisma.messageReport.findMany({
      where: { status },
      include: {
        message: {
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            conversation: {
              select: {
                participants: true,
              },
            },
          },
        },
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/moderation/reports/[reportId]
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportId, action, moderatorId } = body;

    if (!reportId || !action) {
      return NextResponse.json({ error: 'Report ID and action required' }, { status: 400 });
    }

    const report = await prisma.messageReport.findUnique({
      where: { id: reportId },
      include: { message: true },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Update report status
    const updatedReport = await prisma.messageReport.update({
      where: { id: reportId },
      data: {
        status: action === 'resolve' ? 'resolved' : 'dismissed',
        reviewedAt: new Date(),
        reviewedBy: moderatorId,
      },
    });

    // If resolving, block the message
    if (action === 'resolve') {
      await prisma.message.update({
        where: { id: report.messageId },
        data: {
          isModerated: true,
          moderationReason: `Resolved report: ${report.reason}`,
          isBlocked: true,
        },
      });
    }

    return NextResponse.json(updatedReport);
  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}