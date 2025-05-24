'use client';

import React, { useState, useEffect, useRef, useActionState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Send, AlertCircle, Info } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import type { Chat, Message } from '@/types/messaging';
import { sendMessage, markMessagesAsRead } from '@/app/actions/messaging-actions';
import { db } from "@/firebase";
import { collection, query, orderBy, onSnapshot, Timestamp, DocumentData } from "firebase/firestore";
import { UserProfileModal } from './user-profile-modal';

interface ChatViewProps {
  chat: Chat;
  initialMessages: Message[];
  currentUserId: string;
  canSendMessage: boolean;
  bookingStatus: string;
}

interface SendMessageState {
  error?: string;
  message?: string;
  timestamp?: number;
}

const initialSendMessageState: SendMessageState = {};

function getInitials(name: string) {
  return name?.split(' ').map((n) => n[0]).join('').toUpperCase() || '';
}

function convertMessageTimestampsRT(messageData: DocumentData): Omit<Message, 'id'> {
  return {
    ...messageData,
    timestamp: (messageData.timestamp as Timestamp)?.toMillis() || Date.now(),
  } as Omit<Message, 'id'>;
}

export function ChatView({
  chat,
  initialMessages,
  currentUserId,
  canSendMessage,
  bookingStatus
}: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessageText, setNewMessageText] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<typeof chat.client | typeof chat.contractor | null>(null);
  
  const [sendMessageState, handleSendMessageAction, isSendMessagePending] = useActionState<SendMessageState, FormData>(async (_prevState, formData) => {
    const text = formData.get('text') as string;
    if (!text.trim()) return { error: 'Message cannot be empty.' };
    const receiver = currentUserId === chat.client.userId ? chat.contractor : chat.client;
    const result = await sendMessage({
      chatId: chat.id,
      senderId: currentUserId,
      receiverId: receiver.userId,
      text: text.trim(),
    });
    if (result.success && result.data) {
        setNewMessageText(''); 
        return { message: 'Message sent!', timestamp: Date.now() };
    }
    return { error: result.error || 'Failed to send message.', timestamp: Date.now() };
  }, initialSendMessageState);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!chat || !chat.id) return;

    const messagesColRef = collection(db, "chats", chat.id, "messages");
    const q = query(messagesColRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const newMessages: Message[] = [];
      let hasNewUnreadMessages = false;
      querySnapshot.forEach((doc) => {
        const msgData = convertMessageTimestampsRT(doc.data());
        const message = { ...msgData, id: doc.id } as Message;
        newMessages.push(message);
        if (message.senderId !== currentUserId && (!message.readBy || !message.readBy[currentUserId])) {
          hasNewUnreadMessages = true;
        }
      });
      setMessages(newMessages);
      
      if (hasNewUnreadMessages) {
        markMessagesAsRead(chat.id).then(result => {
          if (!result.success) {
            console.warn("Failed to mark messages as read after real-time update:", result.error);
          }
        });
      }
    }, (error) => {
      console.error("Error fetching real-time messages:", error);
    });

    return () => unsubscribe();
  }, [chat.id, currentUserId]);

  useEffect(() => {
    const unreadCount = currentUserId === chat.client.userId ? chat.clientUnreadMessages : chat.contractorUnreadMessages;
    if (unreadCount > 0 && initialMessages.length > 0) {
      markMessagesAsRead(chat.id).then(result => {
        if (!result.success) {
          console.warn("Failed to mark initial messages as read:", result.error);
        }
      });
    }
  }, [chat.id, chat.clientUnreadMessages, chat.contractorUnreadMessages, currentUserId, initialMessages.length]);

  const otherParticipant = currentUserId === chat.client.userId ? chat.contractor : chat.client;
  
  const handleAvatarClick = (participant: typeof chat.client | typeof chat.contractor) => {
    setSelectedParticipant(participant);
    setProfileModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg) => {
            const isCurrentUser = msg.senderId === currentUserId;
            const participant = isCurrentUser
              ? (currentUserId === chat.client.userId ? chat.client : chat.contractor)
              : otherParticipant;

            return (
              <div
                key={msg.id}
                className={`flex items-end space-x-2 ${isCurrentUser ? 'justify-end' : ''}`}
              >
                {!isCurrentUser && (
                  <Avatar 
                    className="h-8 w-8 cursor-pointer" 
                    onClick={() => handleAvatarClick(participant)}
                  >
                    <AvatarImage src={participant.avatarUrl} />
                    <AvatarFallback>{getInitials(participant.displayName)}</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${isCurrentUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'}`}
                >
                  <p className="text-sm">{msg.text}</p>
                  <p className={`text-xs mt-1 ${isCurrentUser ? 'text-primary-foreground/80 text-right' : 'text-muted-foreground/80'}`}>
                    {formatDistanceToNowStrict(new Date(msg.timestamp), { addSuffix: true })}
                  </p>
                </div>
                {isCurrentUser && (
                  <Avatar 
                    className="h-8 w-8 cursor-pointer" 
                    onClick={() => handleAvatarClick(participant)}
                  >
                    <AvatarImage src={participant.avatarUrl} />
                    <AvatarFallback>{getInitials(participant.displayName)}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
      
      {!canSendMessage && (
        <Alert variant="default" className="m-4 rounded-md">
          <Info className="h-4 w-4" />
          <AlertTitle>Messaging Disabled</AlertTitle>
          <AlertDescription>
            You can only send messages for active bookings. This booking is currently <strong>{bookingStatus}</strong>.
          </AlertDescription>
        </Alert>
      )}

      {sendMessageState.error && (
        <Alert variant="destructive" className="m-4 rounded-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Send Error</AlertTitle>
            <AlertDescription>{sendMessageState.error}</AlertDescription>
        </Alert>
      )}

      {canSendMessage && (
        <form action={handleSendMessageAction} className="p-4 border-t bg-background">
          <div className="flex items-center space-x-2">
            <Input
              name="text"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              placeholder="Type your message..."
              autoComplete="off"
              className="flex-grow"
              disabled={isSendMessagePending}
            />
            <Button type="submit" disabled={isSendMessagePending || !newMessageText.trim() }>
              <Send className="h-4 w-4 mr-2" />
              {isSendMessagePending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </form>
      )}
      
      {selectedParticipant && (
        <UserProfileModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          participant={selectedParticipant}
          bookingId={chat.bookingId}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
} 