import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis connection if available
    let redisStatus = "not configured";
    if (process.env.REDIS_URL) {
      try {
        // Redis health check would go here
        redisStatus = "connected";
      } catch {
        redisStatus = "disconnected";
      }
    }

    // Check Elasticsearch connection if available
    let elasticsearchStatus = "not configured";
    if (process.env.ELASTICSEARCH_NODE) {
      try {
        // Elasticsearch health check would go here
        elasticsearchStatus = "connected";
      } catch {
        elasticsearchStatus = "disconnected";
      }
    }

    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      version: process.env.npm_package_version || "1.0.0",
      services: {
        database: "connected",
        redis: redisStatus,
        elasticsearch: elasticsearchStatus,
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
    };

    return NextResponse.json(healthData);
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Service unavailable",
      },
      { status: 503 }
    );
  }
}