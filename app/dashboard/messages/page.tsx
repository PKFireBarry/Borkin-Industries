import { Suspense } from 'react';
import { auth } from '@clerk/nextjs/server';
import { getChatsForUser } from '@/app/actions/messaging-actions';
import { ChatList } from '@/app/dashboard/messages/components/chat-list';
import { ChatListSkeleton } from '@/app/dashboard/messages/components/chat-list-skeleton';
import { PageTitle } from '@/app/dashboard/components/page-title';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default async function MessagesPage() {
  const authResult = await auth();
  if (!authResult || !authResult.userId) {
    // This should ideally be handled by middleware or a higher-level component
    // For now, show an error or redirect
    return (
      <div className="container mx-auto px-4 py-8">
        <PageTitle title="Messages" />
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>
            You must be logged in to view messages.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const chatsResult = await getChatsForUser();

  if (!chatsResult.success) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageTitle title="Messages" />
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Loading Chats</AlertTitle>
          <AlertDescription>
            {chatsResult.error || 'Could not retrieve your chat conversations.'}
            {chatsResult.errorCode && ` (Code: ${chatsResult.errorCode})`}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const chats = chatsResult.data || [];
  const currentUserId = authResult.userId;

  return (
    <div className="container mx-auto px-4 py-8">
      <PageTitle title="Your Conversations" />
      <Suspense fallback={<ChatListSkeleton />}>
        {chats.length === 0 ? (
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>No Conversations Yet</AlertTitle>
            <AlertDescription>
              You have no chat conversations. Messages related to your bookings will appear here.
            </AlertDescription>
          </Alert>
        ) : (
          <ChatList chats={chats} currentUserId={currentUserId} />
        )}
      </Suspense>
    </div>
  );
} 