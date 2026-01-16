"use client"

import { Suspense, useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRequireRole } from '../../use-require-role';
import { getContractorProfile, saveContractorFeedback } from '@/lib/firebase/contractors';
import { getBookingById } from '@/lib/firebase/bookings';
import { getClientById, getPetsByIds } from '@/lib/firebase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Star, 
  Dog, 
  MessageSquare, 
  Send, 
  TrendingUp,
  Award,
  Users,
  Calendar,
  CheckCircle,
  AlertCircle,
  Heart,
  MessageCircle,
  PawPrint
} from 'lucide-react';
import { toast } from 'sonner';

interface Review {
  rating: number;
  comment?: string;
  date: string;
  bookingId: string;
  clientName?: string;
  clientAvatar?: string;
  petNames?: string[];
  contractorFeedback?: {
    comment: string;
    date: string;
  };
}

const StarRatingDisplay = ({ rating, maxStars = 5, size = "default" }: { 
  rating: number; 
  maxStars?: number;
  size?: "small" | "default" | "large";
}) => {
  const starSize = size === "small" ? "w-4 h-4" : size === "large" ? "w-6 h-6" : "w-5 h-5";
  const textSize = size === "small" ? "text-xs" : size === "large" ? "text-base" : "text-sm";
  
  return (
    <div className="flex items-center gap-1">
      {[...Array(maxStars)].map((_, index) => {
        const starValue = index + 1;
        return (
          <Star
            key={index}
            className={`${starSize} ${starValue <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`}
          />
        );
      })}
      <span className={`ml-2 ${textSize} text-slate-600 font-medium`}>({rating.toFixed(1)})</span>
    </div>
  );
};

function FeedbackForm({ review, contractorId, onFeedbackSaved }: { 
  review: Review; 
  contractorId: string; 
  onFeedbackSaved: (bookingId: string, feedback: { comment: string; date: string }) => void;
}) {
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

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
      };
      onFeedbackSaved(review.bookingId, newFeedback);
      setFeedbackText('');
      setShowForm(false);
      toast.success('Feedback submitted successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (review.contractorFeedback) {
    return (
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
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
          <p className="text-sm text-blue-800 leading-relaxed italic">"{review.contractorFeedback.comment}"</p>
        </div>
      </div>
    );
  }

  if (!showForm) {
    return (
      <div className="mt-4 pt-4 border-t border-slate-200">
        <Button
          variant="outline"
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl border-2 border-slate-200 hover:border-primary hover:bg-primary/5 transition-all duration-200"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Respond to this review
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-slate-700 mb-2 block">
            Your response to this review:
          </label>
          <Textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Thank the client or provide additional context..."
            className="min-h-[100px] border-2 border-slate-200 rounded-xl focus:border-primary focus:ring-0 resize-none"
            maxLength={500}
          />
          <div className="text-xs text-slate-500 mt-2 flex justify-between items-center">
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
              setShowForm(false);
              setFeedbackText('');
            }}
            disabled={isSubmitting}
            className="px-6 rounded-xl border-2 border-slate-200 hover:bg-slate-50"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

function ContractorReviewsPageContent() {
  const { isLoaded: isAuthLoaded, isAuthorized } = useRequireRole('contractor');
  const { user, isLoaded: isUserLoaded } = useUser();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contractorName, setContractorName] = useState<string>('');

  const handleFeedbackSaved = (bookingId: string, feedback: { comment: string; date: string }) => {
    setReviews(prev => prev.map(review => 
      review.bookingId === bookingId 
        ? { ...review, contractorFeedback: feedback }
        : review
    ));
  };

  useEffect(() => {
    if (isAuthLoaded && isUserLoaded && isAuthorized && user) {
      const fetchAndEnrichReviews = async () => {
        setLoading(true);
        setError(null);
        try {
          const profile = await getContractorProfile(user.id);
          if (profile) {
            setContractorName(profile.name || 'Your');
            const rawReviews = (profile.ratings || []).map((r: any) => ({
              ...r,
              date: r.date || new Date().toISOString(),
            }));

            const enrichedReviews = await Promise.all(
              rawReviews.map(async (rawReview: Review) => {
                if (!rawReview.bookingId) return rawReview;

                try {
                  const booking = await getBookingById(rawReview.bookingId);
                  if (!booking) return rawReview;

                  let clientName = 'N/A';
                  let clientAvatar = undefined;
                  let petNames: string[] = [];

                  if (booking.clientId) {
                    const client = await getClientById(booking.clientId);
                    if (client) {
                      clientName = client.name || 'N/A';
                      clientAvatar = client.avatar;
                      if (booking.petIds && booking.petIds.length && client.pets) {
                        petNames = client.pets
                          .filter((p: any) => booking.petIds.includes(p.id))
                          .map((p: any) => p.name);
                      }
                    }
                  }
                  return {
                    ...rawReview,
                    clientName,
                    clientAvatar,
                    petNames,
                  };
                } catch (enrichError) {
                  console.error(`Error enriching review for booking ${rawReview.bookingId}:`, enrichError);
                  return rawReview;
                }
              })
            );

            enrichedReviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setReviews(enrichedReviews);
          } else {
            setError('Could not load your profile information.');
          }
        } catch (err) {
          console.error("Error fetching contractor reviews:", err);
          setError('Failed to load reviews. Please try again later.');
        }
        setLoading(false);
      };
      fetchAndEnrichReviews();
    } else if (isAuthLoaded && isUserLoaded && !isAuthorized) {
      setLoading(false);
      setError('You are not authorized to view this page.');
    }
  }, [user, isAuthLoaded, isUserLoaded, isAuthorized]);

  if (!isAuthLoaded || !isUserLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 font-medium">Loading reviews...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-slate-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800">Error loading reviews</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate review statistics
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews 
    : 0;
  const reviewsWithResponses = reviews.filter(r => r.contractorFeedback).length;
  const responseRate = totalReviews > 0 ? (reviewsWithResponses / totalReviews) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header Section */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12 border-2 border-white shadow-md">
                  <AvatarImage src={user?.imageUrl} alt={user?.fullName || 'Contractor'} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {(user?.fullName || 'C')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                    {contractorName} Reviews
                  </h1>
                  <p className="text-slate-600 mt-1">
                    Client feedback and your professional responses
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-white/80 text-slate-700 border-slate-300">
                  <Star className="w-4 h-4 mr-1 text-yellow-500" />
                  {averageRating.toFixed(1)} average
                </Badge>
                <Badge variant="outline" className="bg-white/80 text-slate-700 border-slate-300">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  {totalReviews} reviews
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        {totalReviews > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-600 text-sm font-medium">Average Rating</p>
                    <p className="text-3xl font-bold text-yellow-900">{averageRating.toFixed(1)}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-200 rounded-full flex items-center justify-center">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-medium">Total Reviews</p>
                    <p className="text-3xl font-bold text-blue-900">{totalReviews}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 text-sm font-medium">Response Rate</p>
                    <p className="text-3xl font-bold text-green-900">{responseRate.toFixed(0)}%</p>
                  </div>
                  <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-600 text-sm font-medium">5-Star Reviews</p>
                    <p className="text-3xl font-bold text-purple-900">
                      {reviews.filter(r => r.rating === 5).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center">
                    <Award className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reviews Section */}
        {reviews.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="text-center py-16">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Star className="w-12 h-12 text-slate-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">No Reviews Yet</h2>
              <p className="text-slate-600 mb-6 max-w-md mx-auto">
                Complete more gigs to start receiving feedback from clients. Great reviews help build trust and attract more bookings.
              </p>
              <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review, index) => (
              <Card 
                key={review.bookingId || index} 
                className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12 border-2 border-white shadow-md">
                      <AvatarImage src={review.clientAvatar} alt={review.clientName} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {review.clientName?.charAt(0) || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-bold text-slate-900 truncate">
                        {review.clientName || 'Client'}
                      </CardTitle>
                      <StarRatingDisplay rating={review.rating} size="default" />
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {review.date && !isNaN(new Date(review.date).getTime())
                          ? new Date(review.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : 'Date not available'
                        }
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0 flex-grow">
                  {review.comment ? (
                    <blockquote className="border-l-4 border-primary pl-4 py-2 bg-slate-50 rounded-r-lg">
                      <p className="text-sm text-slate-700 leading-relaxed italic">
                        "{review.comment}"
                      </p>
                    </blockquote>
                  ) : (
                    <div className="bg-slate-50 rounded-lg p-4 border-2 border-dashed border-slate-200">
                      <p className="text-sm text-slate-500 italic text-center">No comment provided</p>
                    </div>
                  )}

                  {review.petNames && review.petNames.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <PawPrint className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-semibold uppercase text-slate-500 tracking-wide">
                          Pet{review.petNames.length > 1 ? 's' : ''} in this gig
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {review.petNames.map(petName => (
                          <Badge 
                            key={petName} 
                            variant="outline"
                            className="bg-orange-50 text-orange-700 border-orange-200 text-xs"
                          >
                            <Dog className="w-3 h-3 mr-1" />
                            {petName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {user && (
                    <FeedbackForm 
                      review={review} 
                      contractorId={user.id} 
                      onFeedbackSaved={handleFeedbackSaved}
                    />
                  )}
                </CardContent>
                
                <CardContent className="pt-3 pb-4 border-t border-slate-100 bg-slate-50/50">
                  <div className="text-xs text-slate-500">
                    <p className="font-mono">Booking ID: {review.bookingId}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ContractorReviewsPage() {
  return (
    <Suspense fallback={null}>
      <ContractorReviewsPageContent />
    </Suspense>
  )
} 