"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  Send,
  Search,
  MoreVertical,
  Phone,
  Video,
  Heart,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppNavigation } from "@/components/layout/AppNavigation";
import { useAuth } from "@/lib/auth-context";

interface Conversation {
  id: string;
  participant: {
    id: string;
    firstName: string;
    lastName: string;
    profilePicture: string;
    isOnline: boolean;
  };
  lastMessage: {
    content: string;
    timestamp: Date;
    isFromUser: boolean;
  };
  unreadCount: number;
  isTyping: boolean;
}

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  isFromUser: boolean;
  status: "sent" | "delivered" | "read";
}

export default function MessagesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
      return;
    }
    if (isAuthenticated && user?.id) {
      loadConversations();
    }
  }, [isAuthenticated, isLoading, user?.id, router]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      if (!user?.id) {
        throw new Error("No authenticated user");
      }

      // Call the API to get conversations
      const response = await fetch(`/api/messages?userId=${user.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }
      const data = await response.json();
      setConversations(data.conversations || []);
      if (data.conversations && data.conversations.length > 0) {
        setSelectedConversation(data.conversations[0].id);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      if (!selectedConversation || !user?.id) {
        console.error("No conversation selected or no authenticated user");
        setMessages([]);
        return;
      }

      // Call the API to get messages for the selected conversation
      const response = await fetch(
        `/api/messages?userId=${user.id}&conversationId=${selectedConversation}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Error loading messages:", error);
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user?.id) return;

    const selectedConv = conversations.find(
      (c) => c.id === selectedConversation
    );
    if (!selectedConv) {
      console.error("Selected conversation not found");
      return;
    }

    const message: Message = {
      id: Date.now().toString(),
      content: newMessage.trim(),
      timestamp: new Date(),
      isFromUser: true,
      status: "sent",
    };

    // Optimistically add message to UI
    setMessages((prev) => [...prev, message]);
    setNewMessage("");

    try {
      // Send message to API
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          senderId: user.id,
          receiverId: selectedConv.participant.id,
          content: newMessage.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();
      // Update message with server response if needed
      console.log("Message sent successfully:", data);
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove optimistically added message on error
      setMessages((prev) => prev.filter((m) => m.id !== message.id));
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const filteredConversations = conversations.filter((conv) => {
    const fullName =
      `${conv.participant.firstName} ${conv.participant.lastName}`.toLowerCase();
    return (
      fullName.includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const selectedConv = conversations.find((c) => c.id === selectedConversation);

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleLogout = () => {
    // Mock logout - replace with actual logout logic
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      {user && <AppNavigation user={user} onLogout={handleLogout} />}

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6">
          {/* Conversations List */}
          <div className="lg:col-span-1">
            <Card className="h-[calc(100vh-8rem)]">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Messages
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-12rem)]">
                  {filteredConversations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No conversations found</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {filteredConversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          onClick={() =>
                            setSelectedConversation(conversation.id)
                          }
                          className={`p-4 cursor-pointer hover:bg-accent transition-colors ${
                            selectedConversation === conversation.id
                              ? "bg-accent"
                              : ""
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <Avatar className="h-12 w-12">
                                <AvatarImage
                                  src={conversation.participant.profilePicture}
                                />
                                <AvatarFallback>
                                  {conversation.participant.firstName[0]}
                                  {conversation.participant.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              {conversation.participant.isOnline && (
                                <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-background rounded-full"></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {conversation.participant.firstName}{" "}
                                  {conversation.participant.lastName}
                                </p>
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(
                                    conversation.lastMessage.timestamp
                                  )}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {conversation.isTyping ? (
                                  <span className="text-primary italic">
                                    typing...
                                  </span>
                                ) : (
                                  conversation.lastMessage.content
                                )}
                              </p>
                            </div>
                            {conversation.unreadCount > 0 && (
                              <Badge
                                variant="destructive"
                                className="h-5 w-5 p-0 text-xs"
                              >
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-3">
            {selectedConv ? (
              <Card className="h-[calc(100vh-8rem)] flex flex-col">
                {/* Chat Header */}
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage
                          src={selectedConv.participant.profilePicture}
                        />
                        <AvatarFallback>
                          {selectedConv.participant.firstName[0]}
                          {selectedConv.participant.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">
                          {selectedConv.participant.firstName}{" "}
                          {selectedConv.participant.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedConv.participant.isOnline
                            ? "Online"
                            : "Offline"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="icon">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon">
                        <Video className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/profile/${selectedConv.participant.id}`
                              )
                            }
                          >
                            <Heart className="mr-2 h-4 w-4" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Block User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 p-0">
                  <ScrollArea className="h-[calc(100vh-16rem)] p-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.isFromUser ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.isFromUser
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {formatTime(message.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                      {selectedConv.isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-muted text-foreground px-4 py-2 rounded-lg">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                              <div
                                className="w-2 h-2 bg-current rounded-full animate-bounce"
                                style={{ animationDelay: "0.1s" }}
                              ></div>
                              <div
                                className="w-2 h-2 bg-current rounded-full animate-bounce"
                                style={{ animationDelay: "0.2s" }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>

                {/* Message Input */}
                <div className="border-t p-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="h-[calc(100vh-8rem)] flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-muted-foreground">
                    Choose a conversation from the list to start chatting
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
