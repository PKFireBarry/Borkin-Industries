"use server";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  serverTimestamp,
  increment,
  DocumentData,
  FieldValue,
} from "firebase/firestore";
import { db } from "@/firebase";
import type {
  Chat,
  ChatInputData,
  Message,
  MessageInputData,
} from "@/types/messaging";
import { auth } from "@clerk/nextjs/server";

// Helper to convert Firestore Timestamps in a Chat object
function convertChatTimestamps(chatData: DocumentData): Chat {
  return {
    ...chatData,
    lastMessageAt: (chatData.lastMessageAt as Timestamp)?.toMillis() || Date.now(),
    createdAt: (chatData.createdAt as Timestamp)?.toMillis() || Date.now(),
    updatedAt: (chatData.updatedAt as Timestamp)?.toMillis() || Date.now(),
    lastMessage: chatData.lastMessage
      ? {
          ...chatData.lastMessage,
          timestamp:
            (chatData.lastMessage.timestamp as Timestamp)?.toMillis() ||
            Date.now(),
        }
      : null,
  } as Chat;
}

// Helper to convert Firestore Timestamps in a Message object
function convertMessageTimestamps(messageData: DocumentData): Message {
  return {
    ...messageData,
    timestamp: (messageData.timestamp as Timestamp)?.toMillis() || Date.now(),
  } as Message;
}

// Basic error handling structure
export interface ActionResult<T = null> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

/**
 * Creates a new chat or retrieves an existing one based on bookingId.
 * Chat ID will be the bookingId.
 */
export async function createOrGetChat(
  chatInput: ChatInputData,
): Promise<ActionResult<Chat>> {
  const authResult = await auth();
  if (!authResult || !authResult.userId) {
    return { success: false, error: "User not authenticated.", errorCode: "UNAUTHENTICATED" };
  }
  const { userId } = authResult;

  if (
    userId !== chatInput.clientUserId &&
    userId !== chatInput.contractorUserId
  ) {
    return {
      success: false,
      error: "User is not a participant of this booking.",
      errorCode: "FORBIDDEN",
    };
  }

  const chatDocRef = doc(db, "chats", chatInput.bookingId);

  try {
    const chatDocSnap = await getDoc(chatDocRef);

    if (chatDocSnap.exists()) {
      const chatData = convertChatTimestamps(chatDocSnap.data());
      return { success: true, data: { ...chatData, id: chatDocSnap.id } as Chat };
    } else {
      // Chat doesn't exist, create it
      const newChatFirestoreData: Record<string, any> = {
        bookingId: chatInput.bookingId,
        client: {
          userId: chatInput.clientUserId,
          displayName: chatInput.clientDisplayName,
        },
        contractor: {
          userId: chatInput.contractorUserId,
          displayName: chatInput.contractorDisplayName,
        },
        lastMessage: null,
        clientUnreadMessages: 0,
        contractorUnreadMessages: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
      };

      if (chatInput.clientAvatarUrl) {
        newChatFirestoreData.client.avatarUrl = chatInput.clientAvatarUrl;
      }
      if (chatInput.contractorAvatarUrl) {
        newChatFirestoreData.contractor.avatarUrl = chatInput.contractorAvatarUrl;
      }

      await writeBatch(db).set(chatDocRef, newChatFirestoreData).commit();
      
      const createdChat: Chat = {
        id: chatInput.bookingId,
        bookingId: chatInput.bookingId,
        client: {
          userId: chatInput.clientUserId,
          displayName: chatInput.clientDisplayName,
          avatarUrl: chatInput.clientAvatarUrl || undefined,
        },
        contractor: {
          userId: chatInput.contractorUserId,
          displayName: chatInput.contractorDisplayName,
          avatarUrl: chatInput.contractorAvatarUrl || undefined,
        },
        lastMessage: null,
        clientUnreadMessages: 0,
        contractorUnreadMessages: 0,
        createdAt: Date.now(), 
        updatedAt: Date.now(),
        lastMessageAt: Date.now(),
      };

      return { success: true, data: createdChat };
    }
  } catch (error: unknown) {
    console.error("Error in createOrGetChat:", error);
    return {
      success: false,
      error: "Failed to create or get chat.",
      errorCode: "FIRESTORE_ERROR",
    };
  }
}

/**
 * Sends a message to a chat.
 */
export async function sendMessage(
  messageInput: MessageInputData,
): Promise<ActionResult<Message>> {
  const authResult = await auth();
  if (!authResult || !authResult.userId) {
    return { success: false, error: "User not authenticated.", errorCode: "UNAUTHENTICATED" };
  }
  const { userId: currentUserId } = authResult;

  if (currentUserId !== messageInput.senderId) {
    return {
      success: false,
      error: "Sender ID does not match authenticated user.",
      errorCode: "FORBIDDEN",
    };
  }

  const { chatId, senderId, receiverId, text } = messageInput;
  const chatDocRef = doc(db, "chats", chatId);
  const messagesColRef = collection(chatDocRef, "messages");

  try {
    // Check if chat exists and user is a participant
    const chatDocSnap = await getDoc(chatDocRef);
    if (!chatDocSnap.exists()) {
      return { success: false, error: "Chat not found.", errorCode: "NOT_FOUND" };
    }
    const chatData = chatDocSnap.data() as Chat;
    if (currentUserId !== chatData.client.userId && currentUserId !== chatData.contractor.userId) {
      return { success: false, error: "User is not a participant of this chat.", errorCode: "FORBIDDEN" };
    }

    // TODO: Check if booking associated with chatId is "open" (e.g., ACTIVE, CONFIRMED)
    // This requires fetching the booking details. For now, we'll assume it's open if chat exists.
    // const bookingDocRef = doc(db, "bookings", chatId);
    // const bookingDocSnap = await getDoc(bookingDocRef);
    // if (!bookingDocSnap.exists() || !isOpenBookingStatus(bookingDocSnap.data()?.status)) {
    //   return { success: false, error: "Cannot send message, booking is not active.", errorCode: "BOOKING_NOT_ACTIVE" };
    // }

    const batch = writeBatch(db);

    // Add the new message
    const newMessageRef = doc(collection(db, "chats", chatId, "messages"));
    const newMessageDataForFirestore: Record<string, unknown> = {
      chatId,
      senderId,
      receiverId, // Store receiverId for clarity, though chat context is primary
      text,
      timestamp: serverTimestamp(),
      readBy: { [senderId]: true }, // Sender has implicitly read it
    };
    batch.set(newMessageRef, newMessageDataForFirestore);

    // Update the chat document with last message and unread counts
    const updateData: DocumentData = {
      lastMessage: {
        // Storing a snippet of the message
        id: newMessageRef.id, // Store the new message ID
        senderId,
        text: text.length > 50 ? text.substring(0, 47) + "..." : text, // Truncate if long
        timestamp: serverTimestamp(),
      },
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Increment unread count for the receiver
    if (receiverId === chatData.client.userId) {
      updateData.clientUnreadMessages = increment(1);
    } else if (receiverId === chatData.contractor.userId) {
      updateData.contractorUnreadMessages = increment(1);
    }

    batch.update(chatDocRef, updateData);

    // Mark individual messages as read
    // Fetch all messages and update those not read by the user.
    const allMessagesQuery = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("timestamp", "desc") // Process recent ones first if we were to limit
    );
    const messagesSnap = await getDocs(allMessagesQuery);
    messagesSnap.forEach(msgDoc => {
      const msgData = msgDoc.data() as Message;
      // Check if the message was sent by the other party and not yet read by current user
      if (msgData.senderId !== currentUserId && (!msgData.readBy || !msgData.readBy[currentUserId])) {
        const messageRef = doc(db, "chats", chatId, "messages", msgDoc.id);
        batch.update(messageRef, { [`readBy.${currentUserId}`]: true });
      }
    });

    await batch.commit();

    const createdMessage: Message = {
      id: newMessageRef.id,
      chatId,
      senderId,
      receiverId,
      text,
      timestamp: Date.now(), // Approximate for immediate return
      readBy: { [senderId]: true },
    };

    return { success: true, data: createdMessage };
  } catch (error: unknown) {
    console.error("Error in sendMessage:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send message.";
    return {
      success: false,
      error: errorMessage,
      errorCode: "FIRESTORE_ERROR",
    };
  }
}

/**
 * Retrieves all chats for the currently authenticated user.
 */
export async function getChatsForUser(): Promise<ActionResult<Chat[]>> {
  const authResult = await auth();
  if (!authResult || !authResult.userId) {
    return { success: false, error: "User not authenticated.", errorCode: "UNAUTHENTICATED" };
  }
  const { userId } = authResult;

  const chatsColRef = collection(db, "chats");
  const q = query(
    chatsColRef,
    where(`client.userId`, "==", userId)
  );
  const q2 = query(
    chatsColRef,
    where(`contractor.userId`, "==", userId)
  );

  try {
    const [clientChatsSnap, contractorChatsSnap] = await Promise.all([
      getDocs(q),
      getDocs(q2),
    ]);

    const chatsMap = new Map<string, Chat>();

    clientChatsSnap.forEach((docSnap) => {
      const chatData = convertChatTimestamps(docSnap.data());
      chatsMap.set(docSnap.id, { ...chatData, id: docSnap.id } as Chat);
    });

    contractorChatsSnap.forEach((docSnap) => {
      if (!chatsMap.has(docSnap.id)) { // Avoid duplicates if user is both client and contractor in a chat (edge case)
        const chatData = convertChatTimestamps(docSnap.data());
        chatsMap.set(docSnap.id, { ...chatData, id: docSnap.id } as Chat);
      }
    });
    
    const chats = Array.from(chatsMap.values()).sort((a, b) => b.lastMessageAt - a.lastMessageAt);

    return { success: true, data: chats };
  } catch (error: unknown) {
    console.error("Error in getChatsForUser:", error);
    return {
      success: false,
      error: "Failed to get chats.",
      errorCode: "FIRESTORE_ERROR",
    };
  }
}

/**
 * Retrieves messages for a specific chat, ordered by timestamp.
 */
export async function getMessagesForChat(
  chatId: string,
): Promise<ActionResult<Message[]>> {
  const authResult = await auth();
  if (!authResult || !authResult.userId) {
    return { success: false, error: "User not authenticated.", errorCode: "UNAUTHENTICATED" };
  }
  const { userId: currentUserId } = authResult;

  const chatDocRef = doc(db, "chats", chatId);

  try {
    // First, verify the user is part of this chat
    const chatDocSnap = await getDoc(chatDocRef);
    if (!chatDocSnap.exists()) {
      return { success: false, error: "Chat not found.", errorCode: "NOT_FOUND" };
    }
    const chatData = chatDocSnap.data();

    if (!chatData || !chatData.client || !chatData.client.userId || !chatData.contractor || !chatData.contractor.userId) {
      console.error("Chat data is incomplete or malformed for chatId:", chatId, "Data:", chatData);
      return {
        success: false,
        error: "Chat data is incomplete. Cannot verify participation.",
        errorCode: "INVALID_CHAT_DATA",
      };
    }

    // Now explicitly cast, as we've checked the necessary fields
    const typedChatData = chatData as Chat;


    console.log("[getMessagesForChat] chatContractorUserId:", typedChatData.contractor.userId, "Type:", typeof typedChatData.contractor.userId);

    if (currentUserId !== typedChatData.client.userId && currentUserId !== typedChatData.contractor.userId) {
      return {
        success: false,
        error: "User is not a participant of this chat.",
        errorCode: "FORBIDDEN",
      };
    }

    const messagesQuery = query(
      collection(chatDocRef, "messages"),
      orderBy("timestamp", "asc"),
    );
    const messagesSnap = await getDocs(messagesQuery);

    const messages = messagesSnap.docs.map((docSnap) => {
      const messageData = convertMessageTimestamps(docSnap.data());
      return { ...messageData, id: docSnap.id } as Message;
    });

    return { success: true, data: messages };
  } catch (error: unknown) {
    console.error("Error in getMessagesForChat:", error);
    return {
      success: false,
      error: "Failed to get messages.",
      errorCode: "FIRESTORE_ERROR",
    };
  }
}

/**
 * Marks messages in a chat as read by the current user and resets their unread count for the chat.
 */
export async function markMessagesAsRead(
  chatId: string,
): Promise<ActionResult> {
  const authResult = await auth();
  if (!authResult || !authResult.userId) {
    return { success: false, error: "User not authenticated.", errorCode: "UNAUTHENTICATED" };
  }
  const { userId: currentUserId } = authResult;

  const chatDocRef = doc(db, "chats", chatId);

  try {
    const chatDocSnap = await getDoc(chatDocRef);
    if (!chatDocSnap.exists()) {
      return { success: false, error: "Chat not found.", errorCode: "NOT_FOUND" };
    }
    const chatData = chatDocSnap.data() as Chat;

    let isClient = false;
    if (currentUserId === chatData.client.userId) {
        isClient = true;
    } else if (currentUserId !== chatData.contractor.userId) {
        return { success: false, error: "User is not a participant of this chat.", errorCode: "FORBIDDEN" };
    }

    // No need to update if count is already 0 for this user
    if (isClient && chatData.clientUnreadMessages === 0) {
        return { success: true };
    }
    if (!isClient && chatData.contractorUnreadMessages === 0) {
        return { success: true };
    }

    const batch = writeBatch(db);

    // Update unread count on the chat document
    const chatUpdateData: Record<string, any> = {};
    if (isClient) {
      chatUpdateData.clientUnreadMessages = 0;
    } else {
      chatUpdateData.contractorUnreadMessages = 0;
    }
    chatUpdateData.updatedAt = serverTimestamp();
    batch.update(chatDocRef, chatUpdateData);

    // Mark individual messages as read - this could be a lot of writes for busy chats.
    // Consider if this level of detail is needed or if just resetting chat-level count is enough.
    // For now, let's assume we want to update some recent unread messages.
    // Fetch last N unread messages. For simplicity, let's say last 20.
    const messagesQuery = query(
        collection(db, "chats", chatId, "messages"),
        where(`readBy.${currentUserId}`, "==", false), // This query won't work directly if field doesn't exist
        orderBy("timestamp", "desc"),
        // limit(20) // Firestore doesn't support inequality filters on one field and ordering on another in this way
        // So, we fetch recent messages and filter client-side, or update all. For now, simpler: update all.
    );
    // A more robust way would be to query messages not containing userId in readBy map keys.
    // Firestore doesn't directly support "map does not contain key".
    // A common workaround is to fetch all messages and filter, or structure `readBy` differently (e.g. array of read user IDs).
    // Given the current `readBy: { [userId: string]: boolean }`, we fetch and update.
    
    // Fetch all messages and update those not read by the user.
    // This could be inefficient for very long chats. Alternative: only update messages after lastReadTimestamp.
    const allMessagesQuery = query(
        collection(db, "chats", chatId, "messages"),
        orderBy("timestamp", "desc") // Process recent ones first if we were to limit
    );
    const messagesSnap = await getDocs(allMessagesQuery);
    messagesSnap.forEach(msgDoc => {
        const msgData = msgDoc.data() as Message;
        // Check if the message was sent by the other party and not yet read by current user
        if (msgData.senderId !== currentUserId && (!msgData.readBy || !msgData.readBy[currentUserId])) {
            const messageRef = doc(db, "chats", chatId, "messages", msgDoc.id);
            batch.update(messageRef, { [`readBy.${currentUserId}`]: true });
        }
    });

    await batch.commit();
    return { success: true };

  } catch (error: unknown) {
    console.error("Error in markMessagesAsRead:", error);
    return {
      success: false,
      error: "Failed to mark messages as read.",
      errorCode: "FIRESTORE_ERROR",
    };
  }
}

/**
 * Checks if a booking status is considered "open" for messaging.
 * Example: booking is active, confirmed, in progress etc.
 * Needs to be adapted based on your actual BookingStatus enum/type.
 */
export async function isOpenBookingStatus(status?: string): Promise<boolean> {
  if (!status) return false;
  // Updated to include pending and approved for initiating chat
  const openStatuses = ["pending", "approved", "active", "confirmed", "pending_payment", "payment_succeeded", "in_progress"]; 
  return openStatuses.includes(status.toLowerCase());
}

/**
 * Deletes a chat.
 */
export async function deleteChat(
  chatId: string,
): Promise<ActionResult> {
  const authResult = await auth();
  if (!authResult || !authResult.userId) {
    return { success: false, error: "User not authenticated.", errorCode: "UNAUTHENTICATED" };
  }
  const { userId: currentUserId } = authResult;

  const chatDocRef = doc(db, "chats", chatId);

  try {
    const chatDocSnap = await getDoc(chatDocRef);
    if (!chatDocSnap.exists()) {
      return { success: false, error: "Chat not found.", errorCode: "NOT_FOUND" };
    }
    const chatData = chatDocSnap.data() as Chat;

    if (currentUserId !== chatData.client.userId && currentUserId !== chatData.contractor.userId) {
      return { success: false, error: "User is not a participant of this chat.", errorCode: "FORBIDDEN" };
    }

    await writeBatch(db).delete(chatDocRef).commit();
    return { success: true };
  } catch (error: unknown) {
    console.error("Error in deleteChat:", error);
    return {
      success: false,
      error: "Failed to delete chat.",
      errorCode: "FIRESTORE_ERROR",
    };
  }
} 