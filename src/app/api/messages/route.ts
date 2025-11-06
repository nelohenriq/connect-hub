import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const conversationId = searchParams.get("conversationId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (conversationId) {
      // Get messages for a specific conversation
      const messages = await prisma.message.findMany({
        where: {
          conversationId,
          conversation: {
            participants: {
              has: userId,
            },
          },
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePicture: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      const formattedMessages = messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        timestamp: msg.createdAt,
        isFromUser: msg.senderId === userId,
        status: msg.isRead ? "read" : "delivered",
      }));

      return NextResponse.json({ messages: formattedMessages });
    } else {
      // Get all conversations for the user
      const conversations = await prisma.conversation.findMany({
        where: {
          participants: {
            has: userId,
          },
        },
        include: {
          messages: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePicture: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      const formattedConversations = conversations.map((conv) => {
        const lastMessage = conv.messages[0];

        return {
          id: conv.id,
          participant: conv.user ? {
            id: conv.user.id,
            firstName: conv.user.firstName,
            lastName: conv.user.lastName,
            profilePicture: conv.user.profilePicture || "/placeholder-avatar.jpg",
            isOnline: true, // TODO: Implement online status
          } : null,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            timestamp: lastMessage.createdAt,
            isFromUser: lastMessage.senderId === userId,
          } : null,
          unreadCount: 0, // TODO: Implement unread count
          isTyping: false, // TODO: Implement typing indicators
        };
      });

      return NextResponse.json({ conversations: formattedConversations });
    }

  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { senderId, receiverId, content } = body;

    if (!senderId || !receiverId || !content) {
      return NextResponse.json(
        { error: "Sender ID, receiver ID, and content are required" },
        { status: 400 }
      );
    }

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { has: senderId } },
          { participants: { has: receiverId } },
        ],
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participants: [senderId, receiverId],
        },
      });
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
          },
        },
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    const formattedMessage = {
      id: message.id,
      content: message.content,
      timestamp: message.createdAt,
      isFromUser: message.senderId === senderId,
      status: "sent",
    };

    return NextResponse.json({
      message: formattedMessage,
      conversationId: conversation.id,
    });

  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}