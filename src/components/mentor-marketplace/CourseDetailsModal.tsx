'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Course } from '@/types/mentor-marketplace';
import {
  Star,
  Clock,
  Users,
  BookOpen,
  CheckCircle,
  CreditCard,
  Play,
  Info,
  Settings
} from 'lucide-react';

interface CourseDetailsModalProps {
  course: Course | null;
  isOpen: boolean;
  onClose: () => void;
  onEnroll: (courseId: string) => void;
  user: any;
}

export default function CourseDetailsModal({
  course,
  isOpen,
  onClose,
  onEnroll,
  user
}: CourseDetailsModalProps) {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { toast } = useToast();

  if (!course) return null;

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const handleEnroll = async () => {
    if (course.price === 0) {
      setIsEnrolling(true);
      try {
        await onEnroll(course.id);
        onClose();
      } catch (error) {
        console.error('Enrollment failed:', error);
      } finally {
        setIsEnrolling(false);
      }
    } else {
      // Handle payment for paid courses
      setIsProcessingPayment(true);
      try {
        // TODO: Implement Stripe payment flow
        toast({
          title: "Info",
          description: "Payment integration coming soon! For now, you can enroll in free courses.",
        });
        onClose();
      } catch (error) {
        console.error('Payment failed:', error);
      } finally {
        setIsProcessingPayment(false);
      }
    }
  };

  // Check if current user is the mentor of this course
  const isMentorOfCourse = user?.role === 'mentor' && user?.id === course.mentor_id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{course.title}</DialogTitle>
              <DialogDescription className="text-base mb-4">
                {course.description}
              </DialogDescription>

              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center space-x-2">
                  <img
                    src={course.mentor.avatar_url || '/placeholder-avatar.png'}
                    alt={course.mentor.display_name}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="font-medium">
                    {course.mentor.display_name || course.mentor.username || 'Anonymous Mentor'}
                  </span>
                </div>

                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{course.average_rating.toFixed(1)}</span>
                  <span className="text-gray-500">({course.total_enrollments} students)</span>
                </div>
              </div>

              <div className="flex items-center space-x-4 mb-4">
                <Badge variant="secondary">{course.category.toUpperCase()}</Badge>
                <Badge variant="outline">{course.level.toUpperCase()}</Badge>
                <div className="flex items-center space-x-1 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{course.total_lessons} lessons</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {formatPrice(course.price, course.currency)}
              </div>

              {isMentorOfCourse ? (
                <Button
                  onClick={() => {
                    // Close modal and redirect to mentor dashboard
                    onClose();
                    window.location.href = '/mentors/dashboard';
                  }}
                  className="w-full"
                  size="lg"
                  variant="default"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Course
                </Button>
              ) : (
                <Button
                  onClick={handleEnroll}
                  disabled={isEnrolling || isProcessingPayment}
                  className="w-full"
                  size="lg"
                >
                  {isEnrolling || isProcessingPayment ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>
                        {course.price === 0 ? 'Enrolling...' : 'Processing...'}
                      </span>
                    </div>
                  ) : (
                    course.price === 0 ? 'Enroll Now' : 'Buy Now'
                  )}
                </Button>
              )}

              {course.price > 0 && !isMentorOfCourse && (
                <p className="text-xs text-gray-500 mt-2">
                  Secure payment via Stripe
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Course Preview/Lessons */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Course Preview</h3>
            {course.trailer_video_id ? (
              <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                <iframe
                  src={`https://player.vimeo.com/video/${course.trailer_video_id}?autoplay=0&muted=1`}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  title={`${course.title} Preview`}
                />
              </div>
            ) : (
              <div className="text-center py-8">
                <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium mb-2">Preview Coming Soon</h4>
                <p className="text-gray-600">
                  This course doesn't have a trailer video yet. Check back soon for preview content!
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Course Features */}
          <div>
            <h3 className="text-lg font-semibold mb-3">What You'll Learn</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Comprehensive course materials</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Access to mentor support</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Certificate of completion</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Lifetime access</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Mentor Info */}
          <div>
            <h3 className="text-lg font-semibold mb-3">About Your Mentor</h3>
            <div className="flex items-center space-x-4">
              <img
                src={course.mentor.avatar_url || '/placeholder-avatar.png'}
                alt={course.mentor.display_name}
                className="w-16 h-16 rounded-full"
              />
              <div>
                <h4 className="font-semibold">
                  {course.mentor.display_name || course.mentor.username || 'Anonymous Mentor'}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  Expert in {course.category} with {course.total_enrollments} students taught
                </p>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm">{course.average_rating.toFixed(1)} rating</span>
                </div>
              </div>
            </div>
          </div>


        </div>
      </DialogContent>
    </Dialog>
  );
}
