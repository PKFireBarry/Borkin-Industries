import { Suspense } from 'react'
import Link from 'next/link'
import {
  createOrGetChat,
  getMessagesForChat,
  isOpenBookingStatus,
  markMessagesAsRead,
} from '@/app/actions/messaging-actions'
import { getBookingById } from '@/lib/firebase/bookings'
import { getClientProfile } from '@/lib/firebase/client'
import { getContractorProfile } from '@/lib/firebase/contractors'
import { ChatView } from './components/chat-view'
import { ChatViewSkeleton } from './components/chat-view-skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { DashboardPageContent, DashboardPageShell } from '../../components/dashboard-shell'
import { ArrowLeft, Terminal } from 'lucide-react'
import { auth } from '@clerk/nextjs/server'
import type { ChatInputData } from '@/types/messaging'

interface ChatPageProps {
  params: {
    chatId: string
  }
}

async function getChatPageData(chatId: string, currentUserId: string) {
  const booking = await getBookingById(chatId)
  if (!booking) {
    console.warn(`Booking not found for chat ID (bookingId): ${chatId}`)
    return { success: false, error: 'Booking not found, cannot initiate chat.', errorCode: 'BOOKING_NOT_FOUND' }
  }

  if (currentUserId !== booking.clientId && currentUserId !== booking.contractorId) {
    return { success: false, error: 'You are not authorized to view this chat.', errorCode: 'UNAUTHORIZED_CHAT_ACCESS' }
  }

  let clientDisplayName = 'Client'
  let clientAvatarUrl: string | undefined = undefined
  let contractorDisplayName = booking.contractorName || 'Contractor'
  let contractorAvatarUrl: string | undefined = undefined

  try {
    const clientProfile = await getClientProfile(booking.clientId)
    if (clientProfile) {
      clientDisplayName = clientProfile.name || 'Client'
      clientAvatarUrl = clientProfile.avatar || undefined
    }
  } catch (error) {
    console.warn(`Failed to fetch client profile for ${booking.clientId}:`, error)
  }

  try {
    const contractorProfile = await getContractorProfile(booking.contractorId)
    if (contractorProfile) {
      contractorDisplayName = contractorProfile.name || 'Contractor'
      contractorAvatarUrl = contractorProfile.profileImage || undefined
    }
  } catch (error) {
    console.warn(`Failed to fetch contractor profile for ${booking.contractorId}:`, error)
  }

  const chatInput: ChatInputData = {
    bookingId: booking.id,
    clientUserId: booking.clientId,
    clientDisplayName,
    clientAvatarUrl,
    contractorUserId: booking.contractorId,
    contractorDisplayName,
    contractorAvatarUrl,
  }

  const chatResult = await createOrGetChat(chatInput)
  if (!chatResult.success || !chatResult.data) {
    return { success: false, error: chatResult.error || 'Failed to load chat.', errorCode: chatResult.errorCode || 'CHAT_LOAD_ERROR' }
  }

  const chat = chatResult.data
  const messagesResult = await getMessagesForChat(chat.id)
  if (!messagesResult.success) {
    console.warn(`Failed to load messages for chat ${chat.id}: ${messagesResult.error}`)
  }

  const isUserClient = currentUserId === chat.client.userId
  const hasUnread = isUserClient ? chat.clientUnreadMessages > 0 : chat.contractorUnreadMessages > 0
  if (hasUnread && messagesResult.success) {
    await markMessagesAsRead(chat.id)
  }

  const canSendMessage = await isOpenBookingStatus(booking.status)

  return {
    success: true,
    chat,
    initialMessages: messagesResult.data || [],
    error: messagesResult.success ? undefined : messagesResult.error,
    errorCode: messagesResult.success ? undefined : messagesResult.errorCode,
    canSendMessage,
    bookingStatus: booking.status,
  }
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { chatId } = await params
  const authResult = await auth()

  if (!authResult?.userId) {
    return (
      <DashboardPageShell>
        <DashboardPageContent>
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Authentication required</AlertTitle>
            <AlertDescription>You need to sign in before opening a conversation.</AlertDescription>
          </Alert>
        </DashboardPageContent>
      </DashboardPageShell>
    )
  }

  const currentUserId = authResult.userId
  const pageData = await getChatPageData(chatId, currentUserId)

  if (pageData.success === false || !pageData.chat) {
    return (
      <DashboardPageShell>
        <DashboardPageContent className="space-y-4 pt-4 sm:pt-6">
          <Link href="/dashboard/messages" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Back to messages
          </Link>
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Could not load chat</AlertTitle>
            <AlertDescription>
              {pageData.error || 'An unexpected error occurred.'}
              {pageData.errorCode ? ` (Code: ${pageData.errorCode})` : ''}
              <br />Return to the messages directory and choose another conversation.
            </AlertDescription>
          </Alert>
        </DashboardPageContent>
      </DashboardPageShell>
    )
  }

  const { chat, initialMessages, error: messagesError, errorCode: messagesErrorCode, canSendMessage, bookingStatus } = pageData

  return (
    <DashboardPageShell className="bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <DashboardPageContent className="pt-4 sm:pt-6">
        <div className="h-[80svh] min-h-[32rem] rounded-[1.75rem] border border-slate-200/70 bg-white/95 shadow-sm sm:h-[calc(100svh-11rem)] sm:min-h-[36rem]">
          {messagesError ? (
            <div className="p-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center space-x-2">
                  <Terminal className="h-5 w-5 flex-shrink-0 text-amber-600" />
                  <div>
                    <h4 className="font-medium text-amber-800">Error Loading Messages</h4>
                    <p className="mt-1 text-sm text-amber-700">
                      {messagesError}
                      {messagesErrorCode ? ` (Code: ${messagesErrorCode})` : ''}
                      <br />Some messages may not be displayed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="h-full overflow-hidden rounded-[1.75rem]">
            <Suspense fallback={<ChatViewSkeleton />}>
              <ChatView
                chat={chat}
                initialMessages={initialMessages}
                currentUserId={currentUserId}
                canSendMessage={canSendMessage}
                bookingStatus={bookingStatus}
              />
            </Suspense>
          </div>
        </div>
      </DashboardPageContent>
    </DashboardPageShell>
  )
}
