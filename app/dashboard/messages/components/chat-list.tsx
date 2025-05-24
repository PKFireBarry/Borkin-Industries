'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNowStrict } from 'date-fns';
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
    // This case should ideally be handled by the parent server component,
    // but as a fallback:
    return <p className="text-muted-foreground">No conversations found.</p>;
  }

  return (
    <div className="space-y-3">
      {chats.map((chat) => {
        const otherParticipant = currentUserId === chat.client.userId ? chat.contractor : chat.client;
        const unreadCount = currentUserId === chat.client.userId 
          ? chat.clientUnreadMessages 
          : chat.contractorUnreadMessages;

        return (
          <Link
            href={`/dashboard/messages/${chat.id}`}
            key={chat.id}
            className="block p-4 border rounded-lg hover:bg-muted/50 transition-colors duration-150"
          >
            <div className="flex items-center space-x-4">
              <Avatar className="h-10 w-10 border">
                <AvatarImage src={otherParticipant.avatarUrl} alt={otherParticipant.displayName} />
                <AvatarFallback>{getInitials(otherParticipant.displayName)}</AvatarFallback>
              </Avatar>
              <div className="flex-grow min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold truncate text-sm md:text-base">{otherParticipant.displayName}</h3>
                  {chat.lastMessageAt && (
                     <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNowStrict(new Date(chat.lastMessageAt), { addSuffix: true })}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-1">
                    <p className={`text-xs truncate ${unreadCount > 0 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                        {chat.lastMessage ? 
                            `${chat.lastMessage.senderId === currentUserId ? 'You: ' : ''}${chat.lastMessage.text}` 
                            : 'No messages yet'}
                    </p>
                    {unreadCount > 0 && (
                        <Badge variant="default" className="ml-2 h-5 px-1.5 text-xs">{unreadCount}</Badge>
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