"use client"

import { Suspense, useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRequireRole } from '../../use-require-role'
import { getContractorProfile, saveContractorFeedback } from '@/lib/firebase/contractors'
import { getBookingById } from '@/lib/firebase/bookings'
import { getClientById } from '@/lib/firebase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Star, 
  Dog, 
  MessageSquare, 
  Send, 
  Calendar,
  CheckCircle,
  AlertCircle,
  Heart,
  MessageCircle,
  PawPrint
} from 'lucide-react'
import { toast } from 'sonner'
import { DashboardPageContent, DashboardPageHeader, DashboardPageShell } from '../../components/dashboard-shell'
import { EmptyState } from '../../components/empty-state'
import { ModalHeader } from '../../components/modal-header'
import { ModalShell } from '../../components/modal-shell'
import { RailDots } from '../../components/rail-dots'
import { useRailScroll } from '@/hooks/use-rail-scroll'

interface Review {
  rating: number
  comment?: string
  date: string
  bookingId: string
  clientName?: string
  clientAvatar?: string
  petNames?: string[]
  contractorFeedback?: {
    comment: string
    date: string
  }
}

const DEFAULT_DESKTOP_PAGINATION_HEIGHT = 96
const DESKTOP_REVIEWS_BOTTOM_BUFFER = 72
const DESKTOP_REVIEWS_FIT_SAFETY_BUFFER = 32

const StarRatingDisplay = ({ rating, maxStars = 5, size = "default" }: { 
  rating: number
  maxStars?: number
  size?: "small" | "default" | "large"
}) => {
  const starSize = size === "small" ? "w-4 h-4" : size === "large" ? "w-6 h-6" : "w-5 h-5"
  const textSize = size === "small" ? "text-xs" : size === "large" ? "text-base" : "text-sm"
  
  return (
    <div className="flex items-center gap-1">
      {[...Array(maxStars)].map((_, index) => {
        const starValue = index + 1
        return (
          <Star
            key={index}
            className={`${starSize} ${starValue <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`}
          />
        )
      })}
      <span className={`ml-2 ${textSize} text-slate-600 font-medium`}>({rating.toFixed(1)})</span>
    </div>
  )
}

function FeedbackForm({ review, contractorId, onFeedbackSaved }: { 
  review: Review
  contractorId: string
  onFeedbackSaved: (bookingId: string, feedback: { comment: string; date: string }) => void
}) {
  const [feedbackText, setFeedbackText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim()) {
      toast.error('Please enter your feedback');
      return;
    }

    setIsSubmitting(true);
    try {
      await saveContractorFeedback(contractorId, review.bookingId, feedbackText.trim());
      const newFeedback = {
        comment: feedbackText.trim(),
        date: new Date().toISOString()
      }
      onFeedbackSaved(review.bookingId, newFeedback)
      setFeedbackText('')
      setShowForm(false)
      toast.success('Feedback submitted successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit feedback')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (review.contractorFeedback) {
    return (
      <div className="mt-auto border-t border-slate-200 pt-4">
        <div className="flex items-center justify-between rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 sm:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
              <MessageSquare className="h-3.5 w-3.5 text-white" />
            </div>
            <span>Responded</span>
          </div>
          <span className="text-[11px] text-blue-600">
            {review.contractorFeedback.date && !isNaN(new Date(review.contractorFeedback.date).getTime())
              ? new Date(review.contractorFeedback.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              : 'Saved'}
          </span>
        </div>
        <div className="hidden rounded-xl border border-blue-200 bg-blue-50 p-4 sm:block">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-semibold text-blue-900">Your Response</span>
              <div className="text-xs text-blue-600">
                {review.contractorFeedback.date && !isNaN(new Date(review.contractorFeedback.date).getTime())
                  ? new Date(review.contractorFeedback.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  : 'Date not available'
                }
              </div>
            </div>
          </div>
          <p className="line-clamp-3 text-sm italic leading-relaxed text-blue-800 sm:line-clamp-none">"{review.contractorFeedback.comment}"</p>
        </div>
      </div>
    )
  }

  if (!showForm) {
    return (
      <div className="mt-auto hidden border-t border-slate-200 pt-4 sm:block">
        <Button
          variant="outline"
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl border-2 border-slate-200 text-sm font-medium transition-all duration-200 hover:border-primary hover:bg-primary/5"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Respond to this review
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-auto border-t border-slate-200 pt-4">
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-col gap-4">
        <div className="min-h-0 flex-1">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Your response to this review:
          </label>
          <Textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Thank the client or provide additional context..."
            className="min-h-[96px] border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0 resize-none"
            maxLength={500}
          />
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Be professional and courteous in your response</span>
            <span className={feedbackText.length > 450 ? 'text-orange-600 font-medium' : ''}>
              {feedbackText.length}/500
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isSubmitting || !feedbackText.trim()}
            className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold py-2.5"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Response
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setShowForm(false)
              setFeedbackText('')
            }}
            disabled={isSubmitting}
            className="px-6 rounded-xl border-2 border-slate-200 hover:bg-slate-50"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

function ContractorReviewsPageContent() {
  const { isLoaded: isAuthLoaded, isAuthorized } = useRequireRole('contractor')
  const { user, isLoaded: isUserLoaded } = useUser()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contractorName, setContractorName] = useState<string>('')
  const [ratingFilter, setRatingFilter] = useState<'all' | '5' | '4plus' | 'needs-response'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest')
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [isDesktopViewport, setIsDesktopViewport] = useState(false)
  const [activeDesktopPage, setActiveDesktopPage] = useState(1)
  const [desktopReviewsPerPage, setDesktopReviewsPerPage] = useState(6)
  const [desktopPaginationHeight, setDesktopPaginationHeight] = useState(DEFAULT_DESKTOP_PAGINATION_HEIGHT)
  const [desktopViewportSectionHeight, setDesktopViewportSectionHeight] = useState<number | null>(null)
  const reviewRailContainerRef = useRef<HTMLDivElement | null>(null)
  const reviewsSectionRef = useRef<HTMLDivElement | null>(null)
  const firstReviewCardRef = useRef<HTMLDivElement | null>(null)
  const desktopPaginationRef = useRef<HTMLDivElement | null>(null)

  const handleFeedbackSaved = (bookingId: string, feedback: { comment: string; date: string }) => {
    setReviews(prev => prev.map(review => 
      review.bookingId === bookingId 
        ? { ...review, contractorFeedback: feedback }
        : review
    ))
  }

  useEffect(() => {
    if (isAuthLoaded && isUserLoaded && isAuthorized && user) {
      const fetchAndEnrichReviews = async () => {
        setLoading(true)
        setError(null)
        try {
          const profile = await getContractorProfile(user.id)
          if (profile) {
            setContractorName(profile.name || 'Your')
            const rawReviews = (profile.ratings || []).map((r: any) => ({
              ...r,
              date: r.date || new Date().toISOString(),
            }))

            const enrichedReviews = await Promise.all(
              rawReviews.map(async (rawReview: Review) => {
                if (!rawReview.bookingId) return rawReview

                try {
                  const booking = await getBookingById(rawReview.bookingId)
                  if (!booking) return rawReview

                  let clientName = 'N/A'
                  let clientAvatar = undefined
                  let petNames: string[] = []

                  if (booking.clientId) {
                    const client = await getClientById(booking.clientId)
                    if (client) {
                      clientName = client.name || 'N/A'
                      clientAvatar = client.avatar
                      if (booking.petIds && booking.petIds.length && client.pets) {
                        petNames = client.pets
                          .filter((p: any) => booking.petIds.includes(p.id))
                          .map((p: any) => p.name)
                      }
                    }
                  }
                  return {
                    ...rawReview,
                    clientName,
                    clientAvatar,
                    petNames,
                  }
                } catch (enrichError) {
                  console.error(`Error enriching review for booking ${rawReview.bookingId}:`, enrichError)
                  return rawReview
                }
              })
            )

            enrichedReviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            setReviews(enrichedReviews)
          } else {
            setError('Could not load your profile information.')
          }
        } catch (err) {
          console.error("Error fetching contractor reviews:", err)
          setError('Failed to load reviews. Please try again later.')
        }
        setLoading(false)
      }
      fetchAndEnrichReviews()
    } else if (isAuthLoaded && isUserLoaded && !isAuthorized) {
      setLoading(false)
      setError('You are not authorized to view this page.')
    }
  }, [user, isAuthLoaded, isUserLoaded, isAuthorized])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(max-width: 639px)')
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches)

    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)

    return () => {
      mediaQuery.removeEventListener('change', updateViewport)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const updateViewport = () => setIsDesktopViewport(mediaQuery.matches)

    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)

    return () => {
      mediaQuery.removeEventListener('change', updateViewport)
    }
  }, [])

  const totalReviews = reviews.length
  const averageRating = totalReviews > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews
    : 0
  const reviewsWithResponses = reviews.filter((review) => review.contractorFeedback).length
  const responseRate = totalReviews > 0 ? (reviewsWithResponses / totalReviews) * 100 : 0
  const fiveStarReviews = reviews.filter((review) => review.rating === 5).length

  const filteredReviews = [...reviews]
    .filter((review) => {
      if (ratingFilter === '5') return review.rating === 5
      if (ratingFilter === '4plus') return review.rating >= 4
      if (ratingFilter === 'needs-response') return !review.contractorFeedback
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'oldest') return new Date(a.date).getTime() - new Date(b.date).getTime()
      if (sortBy === 'highest') return b.rating - a.rating || new Date(b.date).getTime() - new Date(a.date).getTime()
      if (sortBy === 'lowest') return a.rating - b.rating || new Date(b.date).getTime() - new Date(a.date).getTime()
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

  const desktopPageCount = Math.max(1, Math.ceil(filteredReviews.length / desktopReviewsPerPage))
  const visibleReviews = isDesktopViewport
    ? filteredReviews.slice((activeDesktopPage - 1) * desktopReviewsPerPage, activeDesktopPage * desktopReviewsPerPage)
    : filteredReviews

  const { railRef: reviewRailRef, clampedDotIndex: reviewRailDotIndex, onScroll: handleReviewRailScroll } = useRailScroll({
    slideSelector: '[data-contractor-review-slide="true"]',
    itemCount: visibleReviews.length,
  })

  useEffect(() => {
    setActiveDesktopPage(1)
  }, [ratingFilter, sortBy])

  useEffect(() => {
    if (activeDesktopPage > desktopPageCount) {
      setActiveDesktopPage(desktopPageCount)
    }
  }, [activeDesktopPage, desktopPageCount])

  useEffect(() => {
    if (!isDesktopViewport) {
      setDesktopViewportSectionHeight(null)
      return
    }

    const updateDesktopReviewsPerPage = () => {
      const sectionTop = reviewsSectionRef.current?.getBoundingClientRect().top
      const firstCardHeight = firstReviewCardRef.current?.getBoundingClientRect().height
      const paginationHeight = desktopPaginationRef.current?.getBoundingClientRect().height

      if (typeof sectionTop !== 'number') return

      const sectionHeight = Math.max(0, window.innerHeight - sectionTop - DESKTOP_REVIEWS_BOTTOM_BUFFER)
      setDesktopViewportSectionHeight((previousHeight) => (previousHeight === sectionHeight ? previousHeight : sectionHeight))

      if (typeof paginationHeight === 'number') {
        setDesktopPaginationHeight((previousHeight) => (previousHeight === paginationHeight ? previousHeight : paginationHeight))
      }

      if (typeof firstCardHeight !== 'number') return

      const gridGap = 20
      const availableHeight = Math.max(0, sectionHeight - desktopPaginationHeight - DESKTOP_REVIEWS_FIT_SAFETY_BUFFER)
      const visibleRows = Math.max(1, Math.floor((availableHeight + gridGap) / (firstCardHeight + gridGap)))
      const desktopColumns = window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1
      const nextPageSize = Math.max(desktopColumns, visibleRows * desktopColumns)

      setDesktopReviewsPerPage((previousPageSize) => (previousPageSize === nextPageSize ? previousPageSize : nextPageSize))
    }

    const frameId = window.requestAnimationFrame(updateDesktopReviewsPerPage)
    window.addEventListener('resize', updateDesktopReviewsPerPage)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', updateDesktopReviewsPerPage)
    }
  }, [activeDesktopPage, desktopPaginationHeight, filteredReviews.length, isDesktopViewport])

  useEffect(() => {
    if (!isMobileViewport) {
      reviewRailContainerRef.current?.style.removeProperty('--rail-card-height')
      return
    }

    const updateMobileRailCardHeight = () => {
      const railContainer = reviewRailContainerRef.current
      if (!railContainer) return

      const topOffset = railContainer.getBoundingClientRect().top
      const dotsAndBottomSpacing = 36
      const nextCardHeight = Math.max(260, window.innerHeight - topOffset - dotsAndBottomSpacing)

      railContainer.style.setProperty('--rail-card-height', `${nextCardHeight}px`)
    }

    const frameId = window.requestAnimationFrame(updateMobileRailCardHeight)
    window.addEventListener('resize', updateMobileRailCardHeight)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', updateMobileRailCardHeight)
    }
  }, [filteredReviews.length, isMobileViewport])

  if (!isAuthLoaded || !isUserLoaded) {
    return (
      <DashboardPageShell className="flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-medium">Loading reviews...</p>
        </div>
      </DashboardPageShell>
    )
  }

  if (loading) {
    return (
      <DashboardPageShell className="bg-gradient-to-br from-slate-50 via-white to-blue-50/70">
        <DashboardPageContent>
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </DashboardPageContent>
      </DashboardPageShell>
    )
  }

  if (error) {
    return (
      <DashboardPageShell className="bg-gradient-to-br from-slate-50 via-white to-blue-50/70">
        <DashboardPageContent>
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800">Error loading reviews</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </DashboardPageContent>
      </DashboardPageShell>
    );
  }

  return (
    <DashboardPageShell className="bg-gradient-to-br from-slate-50 via-white to-blue-50/70">
      <DashboardPageContent className="space-y-6 pb-12 lg:space-y-8 lg:pb-0">
        <Tabs value={ratingFilter} onValueChange={(value) => setRatingFilter(value as typeof ratingFilter)} className="space-y-6 lg:space-y-8">
          <DashboardPageHeader
            variant="summary"
            title={`${contractorName} Reviews`}
            description="Review client feedback, track response rate, and keep your public reputation strong with thoughtful follow-up."
            surfaceClassName="from-white via-amber-50/70 to-purple-50/70"
            eyebrow={
              <>
                <Badge className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary hover:bg-primary/10">
                  Contractor reviews
                </Badge>
                <Badge className="border-yellow-200 bg-yellow-100 text-yellow-700">{averageRating.toFixed(1)} average</Badge>
              </>
            }
            meta={
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className="border-blue-200 bg-blue-100 text-blue-700">{totalReviews} reviews</Badge>
                  <Badge className="border-green-200 bg-green-100 text-green-700">{responseRate.toFixed(0)}% response rate</Badge>
                  <Badge className="border-purple-200 bg-purple-100 text-purple-700">{fiveStarReviews} five-star reviews</Badge>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <TabsList className="grid h-11 w-full grid-cols-4 rounded-2xl border border-slate-200 bg-white/90 p-1 shadow-sm sm:h-12">
                    <TabsTrigger value="all" className="rounded-xl px-1 text-[11px] font-medium transition-all duration-200 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm sm:px-2 sm:text-sm">
                      All
                    </TabsTrigger>
                    <TabsTrigger value="5" className="rounded-xl px-1 text-[11px] font-medium transition-all duration-200 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm sm:px-2 sm:text-sm">
                      5 Stars
                    </TabsTrigger>
                    <TabsTrigger value="4plus" className="rounded-xl px-1 text-[11px] font-medium transition-all duration-200 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm sm:px-2 sm:text-sm">
                      4+
                    </TabsTrigger>
                    <TabsTrigger value="needs-response" className="rounded-xl px-1 text-[11px] font-medium transition-all duration-200 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm sm:px-2 sm:text-sm">
                      Needs Reply
                    </TabsTrigger>
                  </TabsList>
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                    <SelectTrigger className="h-11 w-full rounded-2xl border-slate-200 bg-white/90 text-sm shadow-sm sm:h-12 sm:w-[12rem]">
                      <SelectValue placeholder="Sort reviews" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest first</SelectItem>
                      <SelectItem value="oldest">Oldest first</SelectItem>
                      <SelectItem value="highest">Highest rating</SelectItem>
                      <SelectItem value="lowest">Lowest rating</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            }
          />

        {/* Reviews Section */}
        {filteredReviews.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="text-center py-16">
              <EmptyState
                icon={<Star className="h-12 w-12 text-slate-400" />}
                title={reviews.length === 0 ? 'No Reviews Yet' : 'No reviews match these filters'}
                description={reviews.length === 0 ? 'Complete more gigs to start receiving feedback from clients. Great reviews help build trust and attract more bookings.' : 'Try a different rating filter or sort to see more client feedback.'}
                iconInCircle
                iconWrapperClassName="h-24 w-24 bg-slate-100"
                titleClassName="text-2xl font-bold"
                className="border-0 bg-transparent px-0 py-0 shadow-none"
              />
              <div className="mt-6 flex items-center justify-center gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Complete gigs professionally</span>
                </div>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  <span>Provide excellent care</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>Communicate clearly</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div
              ref={reviewsSectionRef}
              className="flex flex-col gap-6"
              style={isDesktopViewport && desktopViewportSectionHeight ? { minHeight: `${desktopViewportSectionHeight}px` } : undefined}
            >
              <div
                ref={reviewRailContainerRef}
                className="-mx-4 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0 sm:py-0"
              >
                <div
                  ref={reviewRailRef}
                  onScroll={handleReviewRailScroll}
                  className="flex snap-x snap-mandatory gap-4 overscroll-x-contain overflow-x-auto scroll-px-[12vw] pl-[12vw] pr-[12vw] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:pl-0 sm:pr-0 lg:grid-cols-3"
                >
                  {visibleReviews.map((review, index) => {
                  return (
                  <Card
                    key={review.bookingId || index}
                    ref={index === 0 ? firstReviewCardRef : undefined}
                    data-contractor-review-slide="true"
                    className="flex h-[var(--rail-card-height,26rem)] w-[76vw] min-w-[16.25rem] max-w-[17.5rem] shrink-0 snap-center snap-always flex-col rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:h-full sm:w-auto sm:min-w-0 sm:max-w-none"
                  >
                    <CardHeader className="pb-3 sm:pb-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-11 w-11 border-2 border-white shadow-md sm:h-12 sm:w-12">
                          <AvatarImage src={review.clientAvatar} alt={review.clientName} />
                          <AvatarFallback className="bg-primary/10 font-bold text-primary">
                            {review.clientName?.charAt(0) || 'C'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="truncate text-base font-bold text-slate-900 sm:text-lg">
                            {review.clientName || 'Client'}
                          </CardTitle>
                          <StarRatingDisplay rating={review.rating} size="small" />
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 sm:text-xs">
                            <Calendar className="h-3 w-3" />
                            {review.date && !isNaN(new Date(review.date).getTime())
                              ? new Date(review.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })
                              : 'Date not available'}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="flex min-h-0 flex-1 flex-col pt-0">
                      <div className="min-h-0 flex-1 space-y-4 overflow-hidden">
                        {review.comment ? (
                          <blockquote className="rounded-r-xl border-l-4 border-primary bg-slate-50 py-2 pl-4">
                            <p className="line-clamp-3 text-sm italic leading-relaxed text-slate-700 sm:line-clamp-none">
                              "{review.comment}"
                            </p>
                          </blockquote>
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
                            <p className="text-center text-sm italic text-slate-500">No comment provided</p>
                          </div>
                        )}

                        {review.petNames && review.petNames.length > 0 ? (
                          <div className="hidden border-t border-slate-200 pt-4 sm:block">
                            <div className="mb-2 flex items-center gap-2">
                              <PawPrint className="h-4 w-4 text-slate-500" />
                              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Pet{review.petNames.length > 1 ? 's' : ''} in this gig
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {review.petNames.map((petName) => (
                                <Badge
                                  key={petName}
                                  variant="outline"
                                  className="border-orange-200 bg-orange-50 text-xs text-orange-700"
                                >
                                  <Dog className="mr-1 h-3 w-3" />
                                  {petName}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-auto space-y-3 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="pillSm"
                          className="w-full"
                          onClick={() => setSelectedReview(review)}
                        >
                          Read Full Review
                        </Button>

                        {user ? (
                          <FeedbackForm
                            review={review}
                            contractorId={user.id}
                            onFeedbackSaved={handleFeedbackSaved}
                          />
                        ) : null}
                      </div>
                    </CardContent>

                    <CardContent className="hidden border-t border-slate-100 bg-slate-50/50 pb-4 pt-3 sm:block">
                      <div className="text-xs text-slate-500">
                        <p className="font-mono">Booking ID: {review.bookingId}</p>
                      </div>
                    </CardContent>
                  </Card>
                )})}
                </div>
              </div>
              <div className="lg:hidden">
                <RailDots count={visibleReviews.length} activeIndex={reviewRailDotIndex} />
              </div>

              {isDesktopViewport && filteredReviews.length > desktopReviewsPerPage ? (
                <div
                  ref={desktopPaginationRef}
                  className="hidden lg:mt-auto lg:flex lg:items-center lg:justify-between lg:gap-4 lg:rounded-[1.35rem] lg:border lg:border-slate-200/80 lg:bg-white/92 lg:px-5 lg:py-4 lg:shadow-lg lg:backdrop-blur"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Page {activeDesktopPage} of {desktopPageCount}
                    </p>
                    <p className="text-xs text-slate-500">
                      Showing {visibleReviews.length} of {filteredReviews.length} reviews
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="pillSm"
                      onClick={() => setActiveDesktopPage((prev) => Math.max(prev - 1, 1))}
                      disabled={activeDesktopPage === 1}
                      className="min-w-[7rem]"
                    >
                      Previous
                    </Button>

                    <div className="flex items-center gap-2">
                      {Array.from({ length: desktopPageCount }, (_, index) => {
                        const pageNumber = index + 1
                        const isCurrentPage = pageNumber === activeDesktopPage

                        return (
                          <Button
                            key={pageNumber}
                            type="button"
                            variant={isCurrentPage ? 'default' : 'outline'}
                            size="icon"
                            onClick={() => setActiveDesktopPage(pageNumber)}
                            className="h-10 w-10 rounded-2xl"
                            aria-label={`Go to page ${pageNumber}`}
                          >
                            {pageNumber}
                          </Button>
                        )
                      })}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="pillSm"
                      onClick={() => setActiveDesktopPage((prev) => Math.min(prev + 1, desktopPageCount))}
                      disabled={activeDesktopPage === desktopPageCount}
                      className="min-w-[7rem]"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}
        </Tabs>

        <Dialog open={!!selectedReview} onOpenChange={(open) => { if (!open) setSelectedReview(null) }}>
          <ModalShell aria-labelledby="contractorReviewDetailTitle" maxWidth="lg">
            <div className="flex h-full min-h-0 flex-col">
              <ModalHeader
                eyebrow="Contractor reviews"
                title={selectedReview?.clientName || 'Review details'}
                description="Read the full client review and any response details without leaving the page."
                titleId="contractorReviewDetailTitle"
                onClose={() => setSelectedReview(null)}
                closeAriaLabel="Close review details"
                descriptionAlwaysVisible
              />

              {selectedReview ? (
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
                  <div className="space-y-5">
                    <div className="rounded-[1.5rem] border border-slate-200 bg-gradient-to-r from-slate-50 to-amber-50 p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-11 w-11 border-2 border-white shadow-md sm:h-12 sm:w-12">
                          <AvatarImage src={selectedReview.clientAvatar} alt={selectedReview.clientName} />
                          <AvatarFallback className="bg-primary/10 font-bold text-primary">
                            {selectedReview.clientName?.charAt(0) || 'C'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold text-slate-900 sm:text-lg">{selectedReview.clientName || 'Client'}</p>
                          <StarRatingDisplay rating={selectedReview.rating} size="small" />
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 sm:text-xs">
                            <Calendar className="h-3 w-3" />
                            {selectedReview.date && !isNaN(new Date(selectedReview.date).getTime())
                              ? new Date(selectedReview.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })
                              : 'Date not available'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 sm:p-5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Client Review</p>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {selectedReview.comment ? `"${selectedReview.comment}"` : 'No comment provided'}
                      </p>
                    </div>

                    {selectedReview.petNames && selectedReview.petNames.length > 0 ? (
                      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 sm:p-5">
                        <div className="mb-2 flex items-center gap-2">
                          <PawPrint className="h-4 w-4 text-slate-500" />
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Pets in this gig</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedReview.petNames.map((petName) => (
                            <Badge
                              key={petName}
                              variant="outline"
                              className="border-orange-200 bg-orange-50 text-xs text-orange-700"
                            >
                              <Dog className="mr-1 h-3 w-3" />
                              {petName}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {selectedReview.contractorFeedback ? (
                      <div className="rounded-[1.5rem] border border-blue-200 bg-blue-50 p-4 sm:p-5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600">Your Response</p>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-blue-900">
                          "{selectedReview.contractorFeedback.comment}"
                        </p>
                      </div>
                    ) : null}

                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Booking ID</p>
                      <p className="mt-1 break-all font-mono text-xs text-slate-700">{selectedReview.bookingId}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </ModalShell>
        </Dialog>
      </DashboardPageContent>
    </DashboardPageShell>
  )
}

export default function ContractorReviewsPage() {
  return (
    <Suspense fallback={null}>
      <ContractorReviewsPageContent />
    </Suspense>
  )
} 
