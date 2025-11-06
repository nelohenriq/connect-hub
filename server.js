import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import next from "next";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";

const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const app = express();

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"],
        },
      },
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Rate limiting for API routes
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: "Too many requests, please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiting to all API routes
  app.use("/api/", limiter);

  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    timeout: 20000,
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Store connected users and their socket IDs
  const connectedUsers = new Map();
  const userSockets = new Map();

  // Performance optimizations
  const messageQueue = new Map(); // Queue messages for offline users
  const typingIndicators = new Map(); // Track typing states
  const cleanupInterval = setInterval(() => {
    // Clean up expired typing indicators (5 minutes)
    const now = Date.now();
    for (const [userId, timestamp] of typingIndicators.entries()) {
      if (now - timestamp > 300000) {
        typingIndicators.delete(userId);
      }
    }

    // Clean up expired queued messages (24 hours)
    for (const [userId, messages] of messageQueue.entries()) {
      const validMessages = messages.filter(
        (msg) => now - msg.timestamp < 86400000
      );
      if (validMessages.length === 0) {
        messageQueue.delete(userId);
      } else {
        messageQueue.set(userId, validMessages);
      }
    }

    // Reset message count every minute for rate limiting
    for (const user of connectedUsers.values()) {
      if (user.lastMessage && Date.now() - user.lastMessage > 60000) {
        user.messageCount = 0;
      }
    }
  }, 60000);

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Handle user authentication and registration with validation
    socket.on("register", (userData) => {
      const { userId, username } = userData;

      // Validate user data
      if (
        !userId ||
        !username ||
        typeof userId !== "string" ||
        typeof username !== "string"
      ) {
        socket.emit("error", { message: "Invalid user data" });
        return;
      }

      // Remove any existing connection for this user
      const existingUser = connectedUsers.get(userId);
      if (existingUser) {
        userSockets.delete(existingUser.socketId);
      }

      connectedUsers.set(userId, {
        socketId: socket.id,
        username,
        online: true,
        connectedAt: new Date(),
        messageCount: 0,
        lastMessage: null,
      });
      userSockets.set(socket.id, userId);

      // Deliver any queued messages for this user
      const queuedMessages = messageQueue.get(userId);
      if (queuedMessages && queuedMessages.length > 0) {
        for (const queuedMessage of queuedMessages) {
          socket.emit("private_message", queuedMessage);
        }
        // Clear the queue after delivery
        messageQueue.delete(userId);
      }

      // Broadcast user online status
      socket.broadcast.emit("user_online", { userId, username });

      // Send current online users to the new user
      const onlineUsers = Array.from(connectedUsers.entries())
        .filter(([id, user]) => user.online && id !== userId)
        .map(([id, user]) => ({
          userId: id,
          username: user.username,
        }));

      socket.emit("online_users", onlineUsers);
    });

    // Handle private messaging with validation and rate limiting
    socket.on("private_message", (data) => {
      const { to, message, from } = data;

      // Validate message data
      if (!to || !message || !from || typeof message !== "string") {
        socket.emit("error", { message: "Invalid message data" });
        return;
      }

      // Check message length limit
      if (message.length > 1000) {
        socket.emit("error", { message: "Message too long" });
        return;
      }

      const userId = userSockets.get(socket.id);
      if (!userId || userId !== from) {
        socket.emit("error", { message: "Unauthorized" });
        return;
      }

      const user = connectedUsers.get(userId);
      if (!user) {
        socket.emit("error", { message: "User not found" });
        return;
      }

      // Rate limiting: prevent spam (max 10 messages per minute)
      user.messageCount = (user.messageCount || 0) + 1;
      user.lastMessage = new Date();

      if (user.messageCount > 10) {
        const timeDiff = new Date() - user.lastMessage;
        if (timeDiff < 60000) {
          // Less than 1 minute
          socket.emit("error", { message: "Message rate limit exceeded" });
          return;
        }
        user.messageCount = 1;
      }

      const recipient = connectedUsers.get(to);

      if (recipient && recipient.online) {
        // Sanitize message content
        const sanitizedMessage = message.trim().slice(0, 1000);

        io.to(recipient.socketId).emit("private_message", {
          from,
          message: sanitizedMessage,
          timestamp: new Date(),
        });

        // Send delivery confirmation
        socket.emit("message_delivered", { to, timestamp: new Date() });
      } else {
        // Queue message for offline users
        const queuedMessages = messageQueue.get(to) || [];
        queuedMessages.push({
          from,
          message: sanitizedMessage,
          timestamp: new Date(),
        });
        messageQueue.set(to, queuedMessages);

        // Send confirmation that message was queued
        socket.emit("message_queued", {
          to,
          timestamp: new Date(),
          message: sanitizedMessage,
        });
      }
    });

    // Handle typing indicators with performance optimization
    socket.on("typing_start", (data) => {
      const { to } = data;
      const userId = userSockets.get(socket.id);

      if (!userId) return;

      const recipient = connectedUsers.get(to);
      if (recipient && recipient.online) {
        // Set typing state with timestamp
        typingIndicators.set(userId, Date.now());

        io.to(recipient.socketId).emit("typing_start", {
          from: userId,
        });
      }
    });

    socket.on("typing_stop", (data) => {
      const { to } = data;
      const userId = userSockets.get(socket.id);

      if (!userId) return;

      const recipient = connectedUsers.get(to);
      if (recipient && recipient.online) {
        // Remove typing state
        typingIndicators.delete(userId);

        io.to(recipient.socketId).emit("typing_stop", {
          from: userId,
        });
      }
    });

    // Handle WebRTC signaling
    socket.on("webrtc_offer", (data) => {
      const { to, offer } = data;
      const recipient = connectedUsers.get(to);
      if (recipient && recipient.online) {
        io.to(recipient.socketId).emit("webrtc_offer", {
          from: userSockets.get(socket.id),
          offer,
        });
      }
    });

    socket.on("webrtc_answer", (data) => {
      const { to, answer } = data;
      const recipient = connectedUsers.get(to);
      if (recipient && recipient.online) {
        io.to(recipient.socketId).emit("webrtc_answer", {
          from: userSockets.get(socket.id),
          answer,
        });
      }
    });

    socket.on("webrtc_ice_candidate", (data) => {
      const { to, candidate } = data;
      const recipient = connectedUsers.get(to);
      if (recipient && recipient.online) {
        io.to(recipient.socketId).emit("webrtc_ice_candidate", {
          from: userSockets.get(socket.id),
          candidate,
        });
      }
    });

    // Handle call management
    socket.on("call_initiate", (data) => {
      const { to } = data;
      const recipient = connectedUsers.get(to);
      if (recipient && recipient.online) {
        io.to(recipient.socketId).emit("call_initiate", {
          from: userSockets.get(socket.id),
        });
      }
    });

    socket.on("call_accept", (data) => {
      const { from } = data;
      const caller = connectedUsers.get(from);
      if (caller && caller.online) {
        io.to(caller.socketId).emit("call_accept", {
          from: userSockets.get(socket.id),
        });
      }
    });

    socket.on("call_reject", (data) => {
      const { from } = data;
      const caller = connectedUsers.get(from);
      if (caller && caller.online) {
        io.to(caller.socketId).emit("call_reject", {
          from: userSockets.get(socket.id),
        });
      }
    });

    socket.on("call_end", (data) => {
      const { with: targetUser } = data;
      const recipient = connectedUsers.get(targetUser);
      if (recipient && recipient.online) {
        io.to(recipient.socketId).emit("call_end", {
          from: userSockets.get(socket.id),
        });
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      const userId = userSockets.get(socket.id);
      if (userId) {
        const user = connectedUsers.get(userId);
        if (user) {
          user.online = false;
          socket.broadcast.emit("user_offline", {
            userId,
            username: user.username,
          });
        }
        userSockets.delete(socket.id);
      }
      console.log("User disconnected:", socket.id);
    });
  });

  // Handle Next.js requests with proper routing
  app.use((req, res) => {
    return handle(req, res);
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
    console.log(`> Socket.IO enabled with performance optimizations`);
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    console.log("Shutting down server...");
    clearInterval(cleanupInterval);
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });
});
