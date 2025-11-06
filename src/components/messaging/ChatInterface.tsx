"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Phone, Video, MoreVertical, Flag } from "lucide-react";
import { socketManager } from "@/lib/socket";
import WebRTCManager from "@/lib/webrtc";

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
  };
  createdAt: string;
  messageType: string;
}

interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  otherParticipant?: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture?: string;
    isVerified: boolean;
  };
}

interface ChatInterfaceProps {
  conversation: Conversation;
  currentUserId: string;
  onClose?: () => void;
}

export default function ChatInterface({
  conversation,
  currentUserId,
  onClose,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [webrtcManager, setWebrtcManager] = useState<WebRTCManager | null>(
    null
  );
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const otherParticipant = conversation.otherParticipant;
  const otherUserId =
    otherParticipant?.id ||
    conversation.participants.find((p) => p !== currentUserId);

  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/messages?conversationId=${conversation.id}`
      );
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  }, [conversation.id]);

  const setupSocketListeners = useCallback(() => {
    // Listen for new messages
    socketManager.onMessage((data) => {
      if (data.from === otherUserId) {
        const newMsg: Message = {
          id: Date.now().toString(),
          content: data.message,
          senderId: data.from,
          sender: {
            id: data.from,
            firstName: otherParticipant?.firstName || "",
            lastName: otherParticipant?.lastName || "",
            profilePicture: otherParticipant?.profilePicture,
          },
          createdAt: data.timestamp.toISOString(),
          messageType: "text",
        };
        setMessages((prev) => [...prev, newMsg]);
      }
    });

    // Listen for typing indicators
    socketManager.onTypingStart((data) => {
      if (data.from === otherUserId) {
        setIsTyping(true);
      }
    });

    socketManager.onTypingStop((data) => {
      if (data.from === otherUserId) {
        setIsTyping(false);
      }
    });

    // Listen for WebRTC signaling
    socketManager.onOffer(async (data) => {
      if (data.from === otherUserId && webrtcManager) {
        const answer = await webrtcManager.handleOffer(data.offer);
        socketManager.sendAnswer(data.from, answer);
      }
    });

    socketManager.onAnswer(async (data) => {
      if (data.from === otherUserId && webrtcManager) {
        await webrtcManager.handleAnswer(data.answer);
      }
    });

    socketManager.onIceCandidate(async (data) => {
      if (data.from === otherUserId && webrtcManager) {
        await webrtcManager.addIceCandidate(data.candidate);
      }
    });
  }, [otherUserId, webrtcManager, otherParticipant]);

  // Load messages on component mount - use setTimeout to avoid sync setState
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadMessages();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [loadMessages]);

  // Set up socket listeners on mount and clean up on unmount
  useEffect(() => {
    setupSocketListeners();

    return () => {
      // Cleanup socket listeners if needed
      // Note: SocketManager doesn't have removeAllListeners, so we skip cleanup for now
    };
  }, [setupSocketListeners]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      // Send via API
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id,
          senderId: currentUserId,
          content: newMessage,
        }),
      });

      if (response.ok) {
        const message = await response.json();

        // Add to local state
        setMessages((prev) => [...prev, message]);

        // Send via socket
        socketManager.sendMessage(otherUserId!, newMessage, currentUserId);

        setNewMessage("");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleTyping = () => {
    socketManager.startTyping(otherUserId!);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      socketManager.stopTyping(otherUserId!);
    }, 1000);
  };

  const startCall = async () => {
    try {
      const rtcManager = new WebRTCManager(socketManager, otherUserId!);
      const result = await rtcManager.initialize();

      if (result.success) {
        setWebrtcManager(rtcManager);
        setLocalStream(result.stream!);
        setIsInCall(true);

        // Create offer and send
        const offer = await rtcManager.createOffer();
        socketManager.sendOffer(otherUserId!, offer);
      }
    } catch (error) {
      console.error("Error starting call:", error);
    }
  };

  const endCall = () => {
    if (webrtcManager) {
      webrtcManager.cleanup();
      setWebrtcManager(null);
    }
    setLocalStream(null);
    setRemoteStream(null);
    setIsInCall(false);
  };

  const reportMessage = async (messageId: string, reason: string) => {
    try {
      await fetch("/api/moderation/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId,
          reporterId: currentUserId,
          reason,
        }),
      });
    } catch (error) {
      console.error("Error reporting message:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="flex flex-col h-full max-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarImage src={otherParticipant?.profilePicture} />
            <AvatarFallback>
              {otherParticipant?.firstName?.[0]}
              {otherParticipant?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">
              {otherParticipant?.firstName} {otherParticipant?.lastName}
            </h3>
            {isTyping && <p className="text-sm text-gray-500">typing...</p>}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={startCall}
            disabled={isInCall}
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={startCall}
            disabled={isInCall}
          >
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Call Interface */}
      {isInCall && (
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm">In call</span>
            </div>
            <Button variant="destructive" size="sm" onClick={endCall}>
              End Call
            </Button>
          </div>

          <div className="flex space-x-4 mt-4">
            <video
              ref={(video) => {
                if (video && localStream) {
                  video.srcObject = localStream;
                }
              }}
              autoPlay
              muted
              className="w-32 h-24 bg-black rounded"
            />
            <video
              ref={(video) => {
                if (video && remoteStream) {
                  video.srcObject = remoteStream;
                }
              }}
              autoPlay
              className="w-32 h-24 bg-black rounded"
            />
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.senderId === currentUserId
                ? "justify-end"
                : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.senderId === currentUserId
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-900"
              }`}
            >
              <p>{message.content}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs opacity-70">
                  {formatTime(message.createdAt)}
                </span>
                {message.senderId !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-2"
                    onClick={() => reportMessage(message.id, "inappropriate")}
                  >
                    <Flag className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
