import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  getMessagesForChat,
  createOrGetChat,
  isOpenBookingStatus,
  markMessagesAsRead
} from "@/app/actions/messaging-actions";
import { getBookingById } from "@/lib/firebase/bookings"; // Assuming this function exists
import { getClientProfile } from "@/lib/firebase/client";
import { getContractorProfile } from "@/lib/firebase/contractors";
import { ChatView } from "./components/chat-view";
import { ChatViewSkeleton } from "./components/chat-view-skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { PageTitle } from "@/app/dashboard/components/page-title";
import { auth } from "@clerk/nextjs/server";
import type { Chat, Message, ChatInputData } from "@/types/messaging";
import type { Booking } from "@/types/booking";

interface ChatPageProps {
  params: {
    chatId: string; // This will be the bookingId
  };
}

async function getChatPageData(chatId: string, currentUserId: string) {
  // chatId is the bookingId. A chat is intrinsically linked to a booking.
  const booking = await getBookingById(chatId);
  if (!booking) {
    console.warn(`Booking not found for chat ID (bookingId): ${chatId}`);
    return { success: false, error: "Booking not found, cannot initiate chat.", errorCode: "BOOKING_NOT_FOUND" };
  }

  // Ensure current user is part of the booking
  if (currentUserId !== booking.clientId && currentUserId !== booking.contractorId) {
    return { success: false, error: "You are not authorized to view this chat.", errorCode: "UNAUTHORIZED_CHAT_ACCESS" };
  }

  // Fetch client and contractor profiles
  let clientProfile = null;
  let contractorProfile = null;
  let clientDisplayName = "Client";
  let clientAvatarUrl: string | undefined = undefined;
  let contractorDisplayName = booking.contractorName || "Contractor";
  let contractorAvatarUrl: string | undefined = undefined;

  try {
    clientProfile = await getClientProfile(booking.clientId);
    if (clientProfile) {
      clientDisplayName = clientProfile.name || "Client";
      clientAvatarUrl = clientProfile.avatar || undefined;
    }
  } catch (e) {
    console.warn(`Failed to fetch client profile for ${booking.clientId}:`, e);
  }

  try {
    contractorProfile = await getContractorProfile(booking.contractorId);
    if (contractorProfile) {
      contractorDisplayName = contractorProfile.name || "Contractor";
      contractorAvatarUrl = contractorProfile.profileImage || undefined;
    }
  } catch (e) {
    console.warn(`Failed to fetch contractor profile for ${booking.contractorId}:`, e);
  }

  const chatInput: ChatInputData = {
    bookingId: booking.id,
    clientUserId: booking.clientId,
    clientDisplayName: clientDisplayName, 
    clientAvatarUrl: clientAvatarUrl,
    contractorUserId: booking.contractorId,
    contractorDisplayName: contractorDisplayName,
    contractorAvatarUrl: contractorAvatarUrl,
  };

  const chatResult = await createOrGetChat(chatInput);
  if (!chatResult.success || !chatResult.data) {
    return { error: chatResult.error || "Failed to load chat.", errorCode: chatResult.errorCode || "CHAT_LOAD_ERROR" };
  }
  const chat = chatResult.data;

  const messagesResult = await getMessagesForChat(chat.id);
  if (!messagesResult.success) {
    // Non-fatal for page load, chat can be shown with message loading error
    console.warn(`Failed to load messages for chat ${chat.id}: ${messagesResult.error}`);
  }

  // Mark messages as read if user is receiver and there are unread messages
  const isUserClient = currentUserId === chat.client.userId;
  const hasUnread = isUserClient ? chat.clientUnreadMessages > 0 : chat.contractorUnreadMessages > 0;
  if (hasUnread && messagesResult.success) { // Only mark as read if messages were successfully loaded
    await markMessagesAsRead(chat.id);
  }

  const canSendMessage = await isOpenBookingStatus(booking.status);

  return {
    success: true,
    chat,
    initialMessages: messagesResult.data || [],
    error: messagesResult.success ? undefined : messagesResult.error,
    errorCode: messagesResult.success ? undefined : messagesResult.errorCode,
    canSendMessage,
    bookingStatus: booking.status,
  };
}

export default async function ChatPage({ params }: ChatPageProps) {
  const awaitedParams = await params;
  const { chatId } = awaitedParams;
  const authResult = await auth();

  if (!authResult || !authResult.userId) {
    // This should ideally be handled by middleware or a higher-order component
    // For now, direct redirect or notFound might be too abrupt without a proper unauthorized page for this context
    console.error("User not authenticated trying to access chat page.");
    notFound(); 
  }
  const { userId: currentUserId } = authResult;

  const pageData = await getChatPageData(chatId, currentUserId);

  if (pageData.success === false || !pageData.chat) {
    if (pageData.errorCode === "BOOKING_NOT_FOUND" || pageData.errorCode === "UNAUTHORIZED_CHAT_ACCESS") {
      notFound(); // Or redirect to an unauthorized page
    }
    // For other errors, show an error message on the page
    return (
      <div className="container mx-auto px-4 py-8">
        <PageTitle title="Chat Error" />
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Could not load chat</AlertTitle>
          <AlertDescription>
            {pageData.error || "An unexpected error occurred."}
            {pageData.errorCode && ` (Code: ${pageData.errorCode})`}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { chat, initialMessages, error: messagesError, errorCode: messagesErrorCode, canSendMessage, bookingStatus } = pageData;
  const otherParticipant = currentUserId === chat.client.userId ? chat.contractor : chat.client;

  return (
    <div className="h-[calc(100vh-var(--header-height,80px))] bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="h-full max-w-4xl mx-auto">
        {messagesError && (
          <div className="p-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center space-x-2">
                <Terminal className="h-5 w-5 text-amber-600 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-amber-800">Error Loading Messages</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    {messagesError}
                    {messagesErrorCode && ` (Code: ${messagesErrorCode})`}
                    <br />Some messages may not be displayed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="h-full bg-white shadow-xl rounded-t-2xl overflow-hidden">
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
    </div>
  );
} 