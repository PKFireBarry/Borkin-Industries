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
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <Avatar 
            className="h-10 w-10 ring-2 ring-white shadow-sm cursor-pointer hover:ring-blue-200 transition-all" 
            onClick={() => handleAvatarClick(otherParticipant)}
          >
            <AvatarImage src={otherParticipant.avatarUrl} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
              {getInitials(otherParticipant.displayName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold text-gray-900">{otherParticipant.displayName}</h2>
            <p className="text-sm text-gray-500">
              {canSendMessage ? 'Active conversation' : `Booking ${bookingStatus}`}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4 py-2" ref={scrollAreaRef}>
        <div className="space-y-4 pb-4">
          {messages.map((msg, index) => {
            const isCurrentUser = msg.senderId === currentUserId;
            const participant = isCurrentUser
              ? (currentUserId === chat.client.userId ? chat.client : chat.contractor)
              : otherParticipant;
            
            const showAvatar = !isCurrentUser && (
              index === 0 || 
              messages[index - 1]?.senderId !== msg.senderId ||
              (new Date(msg.timestamp).getTime() - new Date(messages[index - 1]?.timestamp || 0).getTime()) > 300000 // 5 minutes
            );

            return (
              <div
                key={msg.id}
                className={`flex items-end space-x-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                {/* Avatar for other user */}
                {!isCurrentUser && (
                  <div className="w-8 h-8 flex-shrink-0">
                    {showAvatar ? (
                      <Avatar 
                        className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-blue-200 transition-all" 
                        onClick={() => handleAvatarClick(participant)}
                      >
                        <AvatarImage src={participant.avatarUrl} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-gray-400 to-gray-600 text-white text-xs">
                          {getInitials(participant.displayName)}
                        </AvatarFallback>
                      </Avatar>
                    ) : null}
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`group relative max-w-[75%] ${isCurrentUser ? 'order-1' : ''}`}>
                  <div
                    className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                      isCurrentUser
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-900 rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                  </div>
                  
                  {/* Timestamp */}
                  <div className={`mt-1 px-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                    <p className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatDistanceToNowStrict(new Date(msg.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                {/* Avatar for current user */}
                {isCurrentUser && (
                  <div className="w-8 h-8 flex-shrink-0">
                    {showAvatar || index === messages.length - 1 ? (
                      <Avatar 
                        className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-blue-200 transition-all" 
                        onClick={() => handleAvatarClick(participant)}
                      >
                        <AvatarImage src={participant.avatarUrl} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                          {getInitials(participant.displayName)}
                        </AvatarFallback>
                      </Avatar>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
      
      {/* Status Messages */}
      {!canSendMessage && (
        <div className="mx-4 mb-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center space-x-2">
              <Info className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-amber-800">Messaging Disabled</h4>
                <p className="text-sm text-amber-700 mt-1">
                  You can only send messages for active bookings. This booking is currently <strong>{bookingStatus}</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {sendMessageState.error && (
        <div className="mx-4 mb-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-800">Send Error</h4>
                <p className="text-sm text-red-700 mt-1">{sendMessageState.error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Input */}
      {canSendMessage && (
        <div className="p-4 border-t bg-white">
          <form action={handleSendMessageAction} className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <Input
                name="text"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder="Type your message..."
                autoComplete="off"
                disabled={isSendMessagePending}
                className="min-h-[44px] py-3 px-4 pr-12 rounded-full border-gray-200 focus:border-blue-500 focus:ring-blue-500 resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (newMessageText.trim() && !isSendMessagePending) {
                      const form = e.currentTarget.form;
                      if (form) {
                        const formData = new FormData(form);
                        handleSendMessageAction(formData);
                      }
                    }
                  }
                }}
              />
            </div>
            <Button 
              type="submit" 
              disabled={isSendMessagePending || !newMessageText.trim()}
              className="h-11 w-11 rounded-full bg-blue-600 hover:bg-blue-700 p-0 flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </div>
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