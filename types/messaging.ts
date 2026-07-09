export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string; // For potential direct targeting or future use, though senderId is primary for display
  text: string;
  timestamp: number; // Firebase ServerTimestamp will be a number after conversion
  readBy: { [userId: string]: boolean };
}

export interface ChatParticipant {
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

export interface Chat {
  id: string; // Will be the bookingId
  bookingId: string;
  client: ChatParticipant;
  contractor: ChatParticipant;
  lastMessage: Message | null;
  lastMessageAt: number; // Firebase ServerTimestamp
  createdAt: number; // Firebase ServerTimestamp
  updatedAt: number; // Firebase ServerTimestamp
  clientUnreadMessages: number;
  contractorUnreadMessages: number;
  // bookingStatus will be checked dynamically, not stored directly in chat to avoid denormalization issues
}

// For creating/updating chats
export interface ChatInputData {
  bookingId: string;
  clientUserId: string;
  clientDisplayName: string;
  clientAvatarUrl?: string;
  contractorUserId: string;
  contractorDisplayName: string;
  contractorAvatarUrl?: string;
}

export interface MessageInputData {
  chatId: string; // bookingId
  senderId: string;
  receiverId: string;
  text: string;
} 