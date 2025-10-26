'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Lesson, Course, LessonProgress } from '@/types/mentor-marketplace';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import {
  Play,
  CheckCircle,
  ArrowLeft,
  BookOpen,
  Clock,
  Star
} from 'lucide-react';
import { CourseRating } from '@/types/mentor-marketplace';

export default function CourseOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([]);
  const [userRating, setUserRating] = useState<CourseRating | null>(null);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isEditingRating, setIsEditingRating] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [reviewText, setReviewText] = useState('');

  useEffect(() => {
    fetchCourseAndLessons();
    fetchUserRating();
    fetchLessonProgress();
  }, [courseId]);

  const fetchCourseAndLessons = async () => {
    try {
      setLoading(true);

      // Fetch course details
      const courseResponse = await fetch(`/api/mentor-marketplace/courses/${courseId}`);
      const courseData = await courseResponse.json();

      if (courseData.error) {
        console.error('Error fetching course:', courseData.error);
        return;
      }

      setCourse(courseData.data);

      // Fetch lessons for enrolled students
      const lessonsResponse = await fetch(`/api/mentor-marketplace/lessons/enrolled?courseId=${courseId}`);
      const lessonsData = await lessonsResponse.json();

      if (lessonsData.error) {
        console.error('Error fetching lessons:', lessonsData.error);
        return;
      }

      setLessons(lessonsData.data || []);

    } catch (error) {
      console.error('Error fetching course data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLessonClick = (lesson: Lesson) => {
    router.push(`/mentors/${courseId}/${lesson.id}`);
  };

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const fetchUserRating = async () => {
    try {
      const response = await fetch(`/api/mentor-marketplace/ratings?courseId=${courseId}`);
      const data = await response.json();

      if (data.success && data.rating) {
        setUserRating(data.rating);
        setRatingValue(data.rating.rating);
        setReviewText(data.rating.review || '');
      }
    } catch (error) {
      console.error('Error fetching user rating:', error);
    }
  };

  const fetchLessonProgress = async () => {
    try {
      const response = await fetch(`/api/mentor-marketplace/lesson-progress?courseId=${courseId}`);
      const data = await response.json();

      if (data.success && data.progress) {
        setLessonProgress(data.progress);
        // Update completed lessons based on progress
        const completedIds = data.progress
          .filter((p: LessonProgress) => p.is_completed)
          .map((p: LessonProgress) => p.lesson_id);
        setCompletedLessons(completedIds);
      }
    } catch (error) {
      console.error('Error fetching lesson progress:', error);
    }
  };

  const submitRating = async () => {
    if (ratingValue < 1 || ratingValue > 5) {
      alert('Please select a rating between 1 and 5.');
      return;
    }

    setIsSubmittingRating(true);
    try {
      const response = await fetch('/api/mentor-marketplace/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId,
          rating: ratingValue,
          review: reviewText,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUserRating(data.rating);
        setIsEditingRating(false);
        // Refresh course data to update average rating
        fetchCourseAndLessons();
        alert('Rating submitted successfully!');
      } else {
        alert(data.error || 'Failed to submit rating.');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating.');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background relative text-foreground">
        <Sidebar />
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(128, 128, 128, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(128, 128, 128, 0.1) 1px, transparent 1px)`,
            backgroundSize: "100px 100px",
          }}
        />
        <Navbar />
        <main className="relative z-10 pt-24 ml-[300px]">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background relative text-foreground">
        <Sidebar />
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(128, 128, 128, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(128, 128, 128, 0.1) 1px, transparent 1px)`,
            backgroundSize: "100px 100px",
          }}
        />
        <Navbar />
        <main className="relative z-10 pt-24 ml-[300px]">
          <div className="flex max-w-7xl mx-auto px-6">
            <div className="flex-1 max-w-6xl mx-auto">
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Course not found</h3>
                <p className="text-muted-foreground mb-4">
                  The course you're looking for doesn't exist or you don't have access to it.
                </p>
                <Button onClick={() => router.push('/mentors')} variant="outline">
                  Go Back
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative text-foreground">
      <Sidebar />
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(128, 128, 128, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(128, 128, 128, 0.1) 1px, transparent 1px)`,
          backgroundSize: "100px 100px",
        }}
      />
      <Navbar />

      <main className="relative z-10 pt-24 ml-[300px]">
        <div className="flex max-w-7xl mx-auto px-6">
          {/* Main Content - Centered */}
          <div className="flex-1 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/mentors')}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">{course.title}</h1>
                    <p className="text-muted-foreground mt-1">
                      {course.mentor.display_name || course.mentor.username || 'Anonymous Mentor'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">{course.category.toUpperCase()}</Badge>
                  <Badge variant="outline">{course.level.toUpperCase()}</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Course Thumbnail */}
              <div className="lg:col-span-2">
                <Card>
                  <CardContent className="p-0">
                    <div className="aspect-video bg-gray-200 rounded-t-lg flex items-center justify-center">
                      {course.thumbnail_url ? (
                        <img
                          src={course.thumbnail_url}
                          alt={course.title}
                          className="w-full h-full object-cover rounded-t-lg"
                        />
                      ) : (
                        <BookOpen className="w-16 h-16 text-gray-400" />
                      )}
                    </div>

                    <div className="p-6">
                      <h3 className="text-xl font-semibold mb-4">{course.title}</h3>
                      <p className="text-muted-foreground mb-4">
                        {course.description}
                      </p>

                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-4">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{course.total_duration_minutes} minutes total</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <BookOpen className="w-4 h-4" />
                          <span>{course.total_lessons} lessons</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span>{course.average_rating.toFixed(1)} rating</span>
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        Progress: {completedLessons.length} / {lessons.length} lessons completed
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Lesson List Sidebar */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Course Content</CardTitle>
                    <CardDescription>
                      {lessons.length} lessons • {course.total_duration_minutes} minutes total
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-96 overflow-y-auto">
                      {lessons.map((lesson, index) => (
                        <div key={lesson.id}>
                          <button
                            onClick={() => handleLessonClick(lesson)}
                            className="w-full p-4 text-left hover:bg-muted transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                {completedLessons.includes(lesson.id) ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Play className="w-4 h-4 text-muted-foreground" />
                                )}
                                <span className="text-sm font-medium">
                                  {index + 1}. {lesson.title}
                                </span>
                              </div>
                              {lesson.is_preview && (
                                <Badge variant="outline" className="text-xs">
                                  Preview
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{lesson.duration_minutes} min</span>
                              {completedLessons.includes(lesson.id) && (
                                <span className="text-green-600">Completed</span>
                              )}
                            </div>
                          </button>

                          {index < lessons.length - 1 && <Separator />}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Course Info */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="text-lg">About This Course</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Price</span>
                        <span className="font-medium">{formatPrice(course.price, course.currency)}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Lessons</span>
                        <span className="font-medium">{course.total_lessons}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Duration</span>
                        <span className="font-medium">{course.total_duration_minutes} minutes</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Rating</span>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{course.average_rating.toFixed(1)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Students</span>
                        <span className="font-medium">{course.total_enrollments}</span>
                      </div>
                    </div>

                    {/* Rating Section */}
                    <Separator className="my-4" />
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Rate this Course</h4>
                      {userRating && !isEditingRating ? (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= userRating.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="text-sm text-muted-foreground ml-2">
                              Your rating: {userRating.rating}/5
                            </span>
                          </div>
                          {userRating.review && (
                            <p className="text-sm text-muted-foreground">
                              Your review: {userRating.review}
                            </p>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditingRating(true)}
                          >
                            Update Rating
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => setRatingValue(star)}
                                className="focus:outline-none"
                              >
                                <Star
                                  className={`w-5 h-5 ${
                                    star <= ratingValue
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                          <Textarea
                            placeholder="Write a review (optional)"
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            className="min-h-[80px]"
                          />
                          <div className="flex space-x-2">
                            <Button
                              onClick={submitRating}
                              disabled={isSubmittingRating || ratingValue === 0}
                              size="sm"
                            >
                              {isSubmittingRating ? 'Submitting...' : 'Submit Rating'}
                            </Button>
                            {userRating && isEditingRating && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setIsEditingRating(false);
                                  setRatingValue(userRating.rating);
                                  setReviewText(userRating.review || '');
                                }}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
