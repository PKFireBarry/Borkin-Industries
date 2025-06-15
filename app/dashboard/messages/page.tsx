import { Suspense } from 'react';
import { auth } from '@clerk/nextjs/server';
import { getChatsForUser } from '@/app/actions/messaging-actions';
import { ChatList } from '@/app/dashboard/messages/components/chat-list';
import { ChatListSkeleton } from '@/app/dashboard/messages/components/chat-list-skeleton';
import { PageTitle } from '@/app/dashboard/components/page-title';
import { MessageCircle, AlertTriangle } from 'lucide-react';

export default async function MessagesPage() {
  const authResult = await auth();
  if (!authResult || !authResult.userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
              <p className="text-gray-600">
                You must be logged in to view your messages.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const chatsResult = await getChatsForUser();

  if (!chatsResult.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <PageTitle title="Messages" />
            <div className="bg-white rounded-2xl shadow-sm border p-8 text-center mt-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Conversations</h2>
              <p className="text-gray-600 mb-1">
                {chatsResult.error || 'Could not retrieve your chat conversations.'}
              </p>
              {chatsResult.errorCode && (
                <p className="text-sm text-gray-500">Error Code: {chatsResult.errorCode}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const chats = chatsResult.data || [];
  const currentUserId = authResult.userId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
                <p className="text-gray-600">
                  {chats.length > 0 
                    ? `${chats.length} conversation${chats.length !== 1 ? 's' : ''}`
                    : 'Stay connected with your bookings'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Chat List */}
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <Suspense fallback={<ChatListSkeleton />}>
              <ChatList chats={chats} currentUserId={currentUserId} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
} 