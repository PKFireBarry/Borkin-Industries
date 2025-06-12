"use client"

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRequireRole } from '../../use-require-role';
import { getContractorProfile, saveContractorFeedback } from '@/lib/firebase/contractors';
import { getBookingById } from '@/lib/firebase/bookings';
import { getClientById, getPetsByIds } from '@/lib/firebase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Dog, MessageSquare, Send } from 'lucide-react';
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

const StarRatingDisplay = ({ rating, maxStars = 5 }: { rating: number; maxStars?: number }) => {
  return (
    <div className="flex items-center gap-1">
      {[...Array(maxStars)].map((_, index) => {
        const starValue = index + 1;
        return (
          <Star
            key={index}
            className={`h-5 w-5 ${starValue <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
          />
        );
      })}
      <span className="ml-2 text-sm text-muted-foreground">({rating.toFixed(1)})</span>
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
      <div className="mt-4 pt-4 border-t bg-blue-50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">Your Response</span>
          <span className="text-xs text-blue-600">
            {new Date(review.contractorFeedback.date).toLocaleDateString()}
          </span>
        </div>
        <p className="text-sm text-blue-700 italic">"{review.contractorFeedback.comment}"</p>
      </div>
    );
  }

  if (!showForm) {
    return (
      <div className="mt-4 pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => setShowForm(true)}
          className="w-full"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Respond to this review
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Your response to this review:
          </label>
          <Textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Thank the client or provide additional context..."
            className="min-h-[80px]"
            maxLength={500}
          />
          <div className="text-xs text-gray-500 mt-1">
            {feedbackText.length}/500 characters
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={isSubmitting || !feedbackText.trim()}
            className="flex-1"
          >
            {isSubmitting ? (
              <>Submitting...</>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
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
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function ContractorReviewsPage() {
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

  if (!isAuthLoaded || !isUserLoaded || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl text-muted-foreground">Loading reviews...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
          <span className="font-medium">Error:</span> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{contractorName} Reviews</h1>
        <p className="text-muted-foreground">
          Here's what clients are saying about your services. You can respond to each review once.
        </p>
      </header>

      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <img src="/placeholder-no-reviews.svg" alt="No reviews yet" className="mx-auto mb-4 h-32 w-32 text-muted-foreground" /> 
          <h2 className="text-xl font-semibold">No Reviews Yet</h2>
          <p className="text-muted-foreground mt-2">
            Complete more gigs to start receiving feedback from clients.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {reviews.map((review, index) => (
            <Card key={review.bookingId || index} className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={review.clientAvatar} alt={review.clientName} />
                    <AvatarFallback>{review.clientName?.charAt(0) || 'C'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base font-semibold">{review.clientName || 'Client'}</CardTitle>
                    <StarRatingDisplay rating={review.rating} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-grow">
                {review.comment ? (
                  <blockquote className="border-l-4 border-primary pl-3 italic text-sm text-foreground leading-relaxed">
                    {review.comment}
                  </blockquote>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No comment provided.</p>
                )}

                {review.petNames && review.petNames.length > 0 && (
                  <div className="mt-4 pt-3 border-t">
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1.5">Pet(s) in this gig:</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {review.petNames.map(petName => (
                        <span key={petName} className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                          <Dog className="h-3 w-3" />
                          {petName}
                        </span>
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
              <CardContent className="pt-3 pb-4 border-t bg-muted/50">
                <div className="text-xs text-muted-foreground">
                  <p>Reviewed on: {new Date(review.date).toLocaleDateString()}</p>
                  <p className="mt-0.5">Booking ID: <span className="font-mono text-xs">{review.bookingId}</span></p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 