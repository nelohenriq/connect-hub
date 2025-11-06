import { io, Socket } from 'socket.io-client';

class SocketManager {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(userId: string, username: string) {
    if (this.socket?.connected) {
      return this.socket;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';

    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server:', this.socket?.id);
      this.reconnectAttempts = 0;

      // Register user
      this.socket?.emit('register', { userId, username });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.handleReconnect();
    });

    return this.socket;
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

      setTimeout(() => {
        this.socket?.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Messaging methods
  sendMessage(to: string, message: string, from: string) {
    this.socket?.emit('private_message', { to, message, from });
  }

  onMessage(callback: (data: { from: string; message: string; timestamp: Date }) => void) {
    this.socket?.on('private_message', callback);
  }

  // Typing indicators
  startTyping(to: string) {
    this.socket?.emit('typing_start', { to });
  }

  stopTyping(to: string) {
    this.socket?.emit('typing_stop', { to });
  }

  onTypingStart(callback: (data: { from: string }) => void) {
    this.socket?.on('typing_start', callback);
  }

  onTypingStop(callback: (data: { from: string }) => void) {
    this.socket?.on('typing_stop', callback);
  }

  // User presence
  onUserOnline(callback: (data: { userId: string; username: string }) => void) {
    this.socket?.on('user_online', callback);
  }

  onUserOffline(callback: (data: { userId: string; username: string }) => void) {
    this.socket?.on('user_offline', callback);
  }

  onOnlineUsers(callback: (users: Array<{ userId: string; username: string }>) => void) {
    this.socket?.on('online_users', callback);
  }

  // WebRTC signaling for calls
  sendOffer(to: string, offer: RTCSessionDescriptionInit) {
    this.socket?.emit('webrtc_offer', { to, offer });
  }

  sendAnswer(to: string, answer: RTCSessionDescriptionInit) {
    this.socket?.emit('webrtc_answer', { to, answer });
  }

  sendIceCandidate(to: string, candidate: RTCIceCandidate) {
    this.socket?.emit('webrtc_ice_candidate', { to, candidate });
  }

  onOffer(callback: (data: { from: string; offer: RTCSessionDescriptionInit }) => void) {
    this.socket?.on('webrtc_offer', callback);
  }

  onAnswer(callback: (data: { from: string; answer: RTCSessionDescriptionInit }) => void) {
    this.socket?.on('webrtc_answer', callback);
  }

  onIceCandidate(callback: (data: { from: string; candidate: RTCIceCandidate }) => void) {
    this.socket?.on('webrtc_ice_candidate', callback);
  }

  // Call management
  initiateCall(to: string) {
    this.socket?.emit('call_initiate', { to });
  }

  acceptCall(from: string) {
    this.socket?.emit('call_accept', { from });
  }

  rejectCall(from: string) {
    this.socket?.emit('call_reject', { from });
  }

  endCall(withUser: string) {
    this.socket?.emit('call_end', { with: withUser });
  }

  onCallInitiated(callback: (data: { from: string }) => void) {
    this.socket?.on('call_initiate', callback);
  }

  onCallAccepted(callback: (data: { from: string }) => void) {
    this.socket?.on('call_accept', callback);
  }

  onCallRejected(callback: (data: { from: string }) => void) {
    this.socket?.on('call_reject', callback);
  }

  onCallEnded(callback: (data: { from: string }) => void) {
    this.socket?.on('call_end', callback);
  }

  // Get current socket instance
  getSocket() {
    return this.socket;
  }

  // Check connection status
  isConnected() {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const socketManager = new SocketManager();