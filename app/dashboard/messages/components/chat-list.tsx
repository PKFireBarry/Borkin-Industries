'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNowStrict } from 'date-fns';
import { MessageCircle, Clock } from 'lucide-react';
import type { Chat, ChatParticipant } from '@/types/messaging';

interface ChatListProps {
  chats: Chat[];
  currentUserId: string;
}

function getInitials(name: string) {
  return name?.split(' ').map((n) => n[0]).join('').toUpperCase() || '';
}

export function ChatList({ chats, currentUserId }: ChatListProps) {
  if (!chats || chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
          <MessageCircle className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No conversations yet</h3>
        <p className="text-gray-500 text-center max-w-sm">
          Start a conversation by messaging a contractor or client about your bookings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {chats.map((chat) => {
        const otherParticipant = currentUserId === chat.client.userId ? chat.contractor : chat.client;
        const unreadCount = currentUserId === chat.client.userId 
          ? chat.clientUnreadMessages 
          : chat.contractorUnreadMessages;

        return (
          <Link
            href={`/dashboard/messages/${chat.id}`}
            key={chat.id}
            className="group block"
          >
            <div className="flex items-center space-x-3 p-4 rounded-xl hover:bg-gray-50 transition-all duration-200 hover:shadow-sm border border-transparent hover:border-gray-100">
              {/* Avatar with online indicator */}
              <div className="relative">
                <Avatar className="h-12 w-12 ring-2 ring-white shadow-sm">
                  <AvatarImage 
                    src={otherParticipant.avatarUrl} 
                    alt={otherParticipant.displayName}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                    {getInitials(otherParticipant.displayName)}
                  </AvatarFallback>
                </Avatar>
                {/* Online indicator - could be dynamic in the future */}
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {otherParticipant.displayName}
                  </h3>
                  <div className="flex items-center space-x-2">
                    {chat.lastMessageAt && (
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>{formatDistanceToNowStrict(new Date(chat.lastMessageAt), { addSuffix: true })}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <p className={`text-sm truncate ${
                    unreadCount > 0 
                      ? 'text-gray-900 font-medium' 
                      : 'text-gray-500'
                  }`}>
                    {chat.lastMessage ? (
                      <>
                        {chat.lastMessage.senderId === currentUserId && (
                          <span className="text-blue-600 mr-1">You:</span>
                        )}
                        {chat.lastMessage.text}
                      </>
                    ) : (
                      <span className="italic">No messages yet</span>
                    )}
                  </p>
                  
                  {unreadCount > 0 && (
                    <Badge 
                      variant="default" 
                      className="ml-2 h-5 min-w-[20px] px-1.5 text-xs bg-blue-600 hover:bg-blue-700 flex items-center justify-center rounded-full"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
} 