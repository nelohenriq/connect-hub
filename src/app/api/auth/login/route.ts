import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // For development: allow test login
    if (email === "test@example.com" && password === "password") {
      // Create or find test user
      let user = await prisma.user.findUnique({
        where: { email: "test@example.com" },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: "test@example.com",
            password: await AuthService.hashPassword("password"),
            firstName: "Test",
            lastName: "User",
            dateOfBirth: new Date("1990-01-01"),
            gender: "other",
            bio: "Test user for development",
            location: "San Francisco, CA",
          },
        });
      }

      const token = AuthService.generateToken({
        userId: user.id,
        email: user.email,
      });

      return NextResponse.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });
    }

    // Regular authentication
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isValidPassword = await AuthService.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = AuthService.generateToken({
      userId: user.id,
      email: user.email,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}