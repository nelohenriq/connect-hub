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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      // Mock data - replace with API call
      const mockConversations: Conversation[] = [
        {
          id: "1",
          participant: {
            id: "1",
            firstName: "Sarah",
            lastName: "Chen",
            profilePicture: "/placeholder-avatar.jpg",
            isOnline: true,
          },
          lastMessage: {
            content: "Hey! I saw we both love hiking. Want to plan a trip?",
            timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
            isFromUser: false,
          },
          unreadCount: 2,
          isTyping: false,
        },
        {
          id: "2",
          participant: {
            id: "2",
            firstName: "Mike",
            lastName: "Rodriguez",
            profilePicture: "/placeholder-avatar.jpg",
            isOnline: false,
          },
          lastMessage: {
            content: "That new restaurant downtown looks amazing!",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
            isFromUser: true,
          },
          unreadCount: 0,
          isTyping: false,
        },
        {
          id: "3",
          participant: {
            id: "3",
            firstName: "Emma",
            lastName: "Thompson",
            profilePicture: "/placeholder-avatar.jpg",
            isOnline: true,
          },
          lastMessage: {
            content: "Thanks for the museum recommendation! It was wonderful.",
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
            isFromUser: false,
          },
          unreadCount: 1,
          isTyping: true,
        },
      ];
      setConversations(mockConversations);
      if (mockConversations.length > 0) {
        setSelectedConversation(mockConversations[0].id);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      // Mock messages - replace with API call
      const mockMessages: Message[] = [
        {
          id: "1",
          content:
            "Hi Sarah! I saw your profile and we seem to have a lot in common.",
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
          isFromUser: true,
          status: "read",
        },
        {
          id: "2",
          content:
            "Hey! Thanks for reaching out. I noticed we both love photography and hiking.",
          timestamp: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 5
          ),
          isFromUser: false,
          status: "read",
        },
        {
          id: "3",
          content:
            "Absolutely! I just got a new camera and I'm looking for good spots to try it out.",
          timestamp: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 10
          ),
          isFromUser: true,
          status: "read",
        },
        {
          id: "4",
          content:
            "That sounds amazing! There's this great trail in Marin County with stunning views.",
          timestamp: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 15
          ),
          isFromUser: false,
          status: "read",
        },
        {
          id: "5",
          content: "Hey! I saw we both love hiking. Want to plan a trip?",
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          isFromUser: false,
          status: "delivered",
        },
      ];
      setMessages(mockMessages);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const message: Message = {
      id: Date.now().toString(),
      content: newMessage.trim(),
      timestamp: new Date(),
      isFromUser: true,
      status: "sent",
    };

    setMessages((prev) => [...prev, message]);
    setNewMessage("");

    // Here you would typically send the message to the server
    console.log("Sending message:", message);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
