'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { validateThreadAccess } from '@/app/actions/messaging-actions'
import { formatDistanceToNowStrict } from 'date-fns'
import { AlertCircle, BellDot, Clock, MessageCircle } from 'lucide-react'
import type { Chat } from '@/types/messaging'
import { cn } from '@/lib/utils'

const DEFAULT_DESKTOP_CHATS_PER_PAGE = 6
const DEFAULT_DESKTOP_PAGINATION_HEIGHT = 80
const DESKTOP_CHATS_BOTTOM_BUFFER = 24
const DESKTOP_CHATS_FIT_SAFETY_BUFFER = 12

interface ChatListProps {
  chats: Chat[]
  currentUserId: string
  pageSize?: number
}

function getInitials(name: string) {
  return name?.split(' ').map((n) => n[0]).join('').toUpperCase() || ''
}

export function ChatList({ chats, currentUserId, pageSize = 8 }: ChatListProps) {
  const [page, setPage] = useState(1)
  const [openingChatId, setOpeningChatId] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [isDesktopViewport, setIsDesktopViewport] = useState(false)
  const [desktopChatsPerPage, setDesktopChatsPerPage] = useState(DEFAULT_DESKTOP_CHATS_PER_PAGE)
  const [desktopViewportSectionHeight, setDesktopViewportSectionHeight] = useState<number | null>(null)
  const [desktopPaginationHeight, setDesktopPaginationHeight] = useState(DEFAULT_DESKTOP_PAGINATION_HEIGHT)
  const router = useRouter()
  const desktopSectionRef = useRef<HTMLDivElement | null>(null)
  const listBodyRef = useRef<HTMLDivElement | null>(null)
  const firstChatRowRef = useRef<HTMLButtonElement | null>(null)
  const desktopPaginationRef = useRef<HTMLDivElement | null>(null)
  const listErrorRef = useRef<HTMLDivElement | null>(null)

  const sortedChats = useMemo(() => {
    return [...(chats || [])].sort((a, b) => (b.lastMessageAt || b.updatedAt || 0) - (a.lastMessageAt || a.updatedAt || 0))
  }, [chats])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const updateViewport = (event?: MediaQueryListEvent) => {
      setIsDesktopViewport(event ? event.matches : mediaQuery.matches)
    }

    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)

    return () => mediaQuery.removeEventListener('change', updateViewport)
  }, [])

  const effectivePageSize = isDesktopViewport ? desktopChatsPerPage : pageSize
  const totalPages = Math.max(1, Math.ceil(sortedChats.length / effectivePageSize))
  const safePage = Math.min(page, totalPages)
  const paginatedChats = sortedChats.slice((safePage - 1) * effectivePageSize, safePage * effectivePageSize)

  useEffect(() => {
    if (!isDesktopViewport) {
      setDesktopViewportSectionHeight(null)
      return
    }

    const updateDesktopChatsPerPage = () => {
      const sectionTop = desktopSectionRef.current?.getBoundingClientRect().top
      const firstRowHeight = firstChatRowRef.current?.getBoundingClientRect().height
      const paginationHeight = desktopPaginationRef.current?.getBoundingClientRect().height
      const errorHeight = listErrorRef.current?.getBoundingClientRect().height ?? 0

      if (typeof sectionTop !== 'number') return

      const sectionHeight = Math.max(0, window.innerHeight - sectionTop - DESKTOP_CHATS_BOTTOM_BUFFER)
      setDesktopViewportSectionHeight((previousHeight) => (previousHeight === sectionHeight ? previousHeight : sectionHeight))

      if (typeof paginationHeight === 'number') {
        setDesktopPaginationHeight((previousHeight) => (previousHeight === paginationHeight ? previousHeight : paginationHeight))
      }

      if (typeof firstRowHeight !== 'number') return

      const availableHeight = Math.max(
        0,
        sectionHeight - desktopPaginationHeight - errorHeight - DESKTOP_CHATS_FIT_SAFETY_BUFFER
      )
      const nextPageSize = Math.max(1, Math.floor(availableHeight / firstRowHeight))

      setDesktopChatsPerPage((previousPageSize) => (previousPageSize === nextPageSize ? previousPageSize : nextPageSize))
    }

    const frameId = window.requestAnimationFrame(updateDesktopChatsPerPage)
    window.addEventListener('resize', updateDesktopChatsPerPage)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', updateDesktopChatsPerPage)
    }
  }, [desktopPaginationHeight, isDesktopViewport, listError, paginatedChats.length, safePage, sortedChats.length])

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  if (!sortedChats.length) {
      return (
        <div className="flex flex-col items-center justify-center px-4 py-16">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-purple-100">
            <MessageCircle className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-slate-900">No conversations yet</h3>
          <p className="max-w-sm text-center text-slate-500">Start a conversation by messaging a contractor or client about your bookings.</p>
        </div>
      )
  }

  const handleOpenChat = async (chatId: string) => {
    setOpeningChatId(chatId)
    setListError(null)

    const result = await validateThreadAccess(chatId)
    if (result.success) {
      router.push(`/dashboard/messages/${chatId}`)
      return
    }

    setListError(result.error || 'This conversation is no longer available.')
    setOpeningChatId(null)
  }

  return (
    <div
      ref={isDesktopViewport ? desktopSectionRef : null}
      className={cn(isDesktopViewport && 'lg:flex lg:flex-col')}
      style={isDesktopViewport && desktopViewportSectionHeight ? { minHeight: `${desktopViewportSectionHeight}px`, maxHeight: `${desktopViewportSectionHeight}px` } : undefined}
    >
      {listError ? (
        <div ref={isDesktopViewport ? listErrorRef : null} className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:px-5">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{listError}</span>
          </div>
        </div>
      ) : null}

      <div ref={isDesktopViewport ? listBodyRef : null} className={cn('divide-y divide-slate-100', isDesktopViewport && 'lg:flex-none')}>
        {paginatedChats.map((chat, index) => {
          const otherParticipant = currentUserId === chat.client.userId ? chat.contractor : chat.client
          const unreadCount = currentUserId === chat.client.userId ? chat.clientUnreadMessages : chat.contractorUnreadMessages
          const awaitingReply = unreadCount > 0 && chat.lastMessage?.senderId !== currentUserId

          return (
            <button
              key={chat.id}
              ref={isDesktopViewport && index === 0 ? firstChatRowRef : null}
              type="button"
              onClick={() => handleOpenChat(chat.id)}
              className="group block w-full px-4 py-4 text-left transition-colors hover:bg-slate-50 sm:px-5"
            >
              <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                  <Avatar className="h-12 w-12 ring-2 ring-white shadow-sm">
                    <AvatarImage src={otherParticipant.avatarUrl} alt={otherParticipant.displayName} className="object-cover" />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                      {getInitials(otherParticipant.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  {awaitingReply ? <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-500" /> : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-primary sm:text-[15px]">
                          {otherParticipant.displayName}
                        </h3>
                        {awaitingReply ? (
                          <Badge variant="secondary" className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700">
                            Needs reply
                          </Badge>
                        ) : null}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{chat.lastMessageAt ? formatDistanceToNowStrict(new Date(chat.lastMessageAt), { addSuffix: true }) : 'No recent activity'}</span>
                      </div>
                    </div>

                    {unreadCount > 0 ? (
                      <Badge className="ml-2 inline-flex min-w-[1.6rem] items-center justify-center rounded-full bg-primary px-1.5 py-1 text-[10px] text-white hover:bg-primary">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </Badge>
                    ) : openingChatId === chat.id ? (
                      <Badge variant="secondary" className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600">
                        Opening...
                      </Badge>
                    ) : null}
                  </div>

                  <div className="mt-3 flex items-start justify-between gap-3">
                    <p className={`line-clamp-2 text-sm leading-6 ${unreadCount > 0 ? 'font-medium text-slate-900' : 'text-slate-500'}`}>
                      {chat.lastMessage ? (
                        <>
                          {chat.lastMessage.senderId === currentUserId ? <span className="mr-1 text-blue-600">You:</span> : null}
                          {chat.lastMessage.text}
                        </>
                      ) : (
                        <span className="italic">No messages yet</span>
                      )}
                    </p>
                    {awaitingReply ? <BellDot className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /> : null}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {isDesktopViewport || totalPages > 1 ? (
        <div
          ref={isDesktopViewport ? desktopPaginationRef : null}
          className={cn(
            'flex items-center justify-between border-t border-slate-200/70 px-4 py-4 sm:px-5',
            isDesktopViewport && 'lg:mt-auto lg:flex-none lg:rounded-b-[1.75rem] lg:bg-white/92 lg:backdrop-blur'
          )}
        >
          <p className="text-xs text-slate-500 sm:text-sm">
            Showing {(safePage - 1) * effectivePageSize + 1}-{Math.min(safePage * effectivePageSize, sortedChats.length)} of {sortedChats.length}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="pillSm" onClick={() => setPage((current) => Math.max(current - 1, 1))} disabled={safePage === 1}>
              Previous
            </Button>
            <Badge variant="secondary" className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] text-slate-600 sm:text-xs">
              Page {safePage} of {totalPages}
            </Badge>
            <Button type="button" variant="outline" size="pillSm" onClick={() => setPage((current) => Math.min(current + 1, totalPages))} disabled={safePage === totalPages}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
