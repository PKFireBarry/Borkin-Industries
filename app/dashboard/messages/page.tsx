import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { getChatsForUser } from '@/app/actions/messaging-actions'
import { ChatList } from '@/app/dashboard/messages/components/chat-list'
import { ChatListSkeleton } from '@/app/dashboard/messages/components/chat-list-skeleton'
import { Badge } from '@/components/ui/badge'
import { DashboardPageContent, DashboardPageHeader, DashboardPageShell } from '../components/dashboard-shell'
import { AlertTriangle, BellDot } from 'lucide-react'

export default async function MessagesPage() {
  const authResult = await auth()

  if (!authResult || !authResult.userId) {
    return (
      <DashboardPageShell className="bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <DashboardPageContent className="pt-4 sm:pt-6">
          <div className="mx-auto max-w-2xl rounded-[1.75rem] border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-slate-900">Authentication Required</h2>
            <p className="text-slate-600">You must be logged in to view your messages.</p>
          </div>
        </DashboardPageContent>
      </DashboardPageShell>
    )
  }

  const chatsResult = await getChatsForUser()

  if (!chatsResult.success) {
    return (
      <DashboardPageShell className="bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <DashboardPageContent className="pt-4 sm:pt-6">
          <div className="mx-auto max-w-2xl rounded-[1.75rem] border border-red-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-slate-900">Error Loading Conversations</h2>
            <p className="mb-1 text-slate-600">{chatsResult.error || 'Could not retrieve your chat conversations.'}</p>
            {chatsResult.errorCode ? <p className="text-sm text-slate-500">Error Code: {chatsResult.errorCode}</p> : null}
          </div>
        </DashboardPageContent>
      </DashboardPageShell>
    )
  }

  const chats = chatsResult.data || []
  const currentUserId = authResult.userId
  const totalUnreadMessages = chats.reduce((total, chat) => {
    return total + (currentUserId === chat.client.userId ? chat.clientUnreadMessages : chat.contractorUnreadMessages)
  }, 0)
  return (
    <DashboardPageShell className="bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <DashboardPageContent className="space-y-4 pb-8 pt-4 sm:space-y-6 sm:pb-10 sm:pt-6 lg:pb-12">
        <DashboardPageHeader
          variant="summary"
          title="Messages"
          surfaceClassName="from-white via-blue-50/70 to-purple-50/70"
          actions={
            totalUnreadMessages > 0 ? (
              <div className="rounded-[1.5rem] border border-white/80 bg-white/80 p-4 shadow-sm sm:min-w-[14rem]">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <BellDot className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Unread messages</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{totalUnreadMessages}</p>
                  </div>
                </div>
              </div>
            ) : null
          }
        />

        <section className="rounded-[1.75rem] border border-slate-200/70 bg-white/90 shadow-sm">
          {totalUnreadMessages > 0 ? (
            <div className="border-b border-slate-200/70 px-4 py-3 sm:px-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <BellDot className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Unread messages waiting</p>
                  <p className="mt-1 text-sm text-slate-600">Unread threads are highlighted directly in the directory below.</p>
                </div>
              </div>
            </div>
          ) : null}
          <Suspense fallback={<ChatListSkeleton />}>
            <ChatList chats={chats} currentUserId={currentUserId} pageSize={8} />
          </Suspense>
        </section>
      </DashboardPageContent>
    </DashboardPageShell>
  )
}
