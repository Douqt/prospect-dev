'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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

export default function LessonPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  const lessonId = params.lessonId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [lessonLoading, setLessonLoading] = useState(true);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([]);
  const [playbackId, setPlaybackId] = useState<string | null>(null);
  const [userRating, setUserRating] = useState<CourseRating | null>(null);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isEditingRating, setIsEditingRating] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [reviewText, setReviewText] = useState('');

  useEffect(() => {
    fetchCourseAndLessons();
    fetchUserRating();
    fetchLessonProgress();
  }, [courseId, lessonId]);

  useEffect(() => {
    if (currentLesson) {
      fetchPlaybackId(currentLesson.video_id);
    } else {
      setPlaybackId(null);
    }
  }, [currentLesson]);

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

      // Set current lesson based on lessonId
      const lesson = lessonsData.data?.find((l: Lesson) => l.id === lessonId);
      if (lesson) {
        setCurrentLesson(lesson);
      } else if (lessonsData.data && lessonsData.data.length > 0) {
        setCurrentLesson(lessonsData.data[0]);
      }

      // Fetch user's progress and completed lessons will be handled by fetchLessonProgress

    } catch (error) {
      console.error('Error fetching course data:', error);
    } finally {
      setLoading(false);
      setLessonLoading(false);
    }
  };

  const handleLessonClick = (lesson: Lesson) => {
    setCurrentLesson(lesson);
    // Update URL to reflect the selected lesson
    router.push(`/mentors/${courseId}/${lesson.id}`);
  };

  const markLessonComplete = async (lessonId: string) => {
    try {
      const isCurrentlyCompleted = completedLessons.includes(lessonId);
      const response = await fetch('/api/mentor-marketplace/lesson-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonId,
          courseId,
          isCompleted: !isCurrentlyCompleted,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update local state immediately for better UX
        if (isCurrentlyCompleted) {
          setCompletedLessons(completedLessons.filter(id => id !== lessonId));
        } else {
          setCompletedLessons([...completedLessons, lessonId]);
        }

        // Update lesson progress state
        const updatedProgress = lessonProgress.map(p =>
          p.lesson_id === lessonId
            ? { ...p, is_completed: !isCurrentlyCompleted, completed_at: !isCurrentlyCompleted ? new Date().toISOString() : null }
            : p
        );
        setLessonProgress(updatedProgress);

        // Update course progress percentage locally
        if (course && lessons.length > 0) {
          const completedCount = isCurrentlyCompleted
            ? completedLessons.length - 1
            : completedLessons.length + 1;
          const newProgressPercentage = Math.round((completedCount / lessons.length) * 100);
          setCourse({ ...course, progress_percentage: newProgressPercentage });
        }
      } else {
        alert(data.error || 'Failed to save lesson progress');
      }
    } catch (error) {
      console.error('Error saving lesson progress:', error);
      alert('Failed to save lesson progress. Please try again.');
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const fetchPlaybackId = async (assetId: string) => {
    try {
      const response = await fetch(`/api/mentor-marketplace/videos/details?assetId=${assetId}`);
      const data = await response.json();

      if (data.success && data.asset && data.asset.playback_ids && data.asset.playback_ids.length > 0) {
        setPlaybackId(data.asset.playback_ids[0].id);
      } else {
        console.error('Failed to get playback ID:', data.error);
        setPlaybackId(null);
      }
    } catch (error) {
      console.error('Error fetching playback ID:', error);
      setPlaybackId(null);
    }
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

        // Update course progress percentage based on completed lessons
        if (course && lessons.length > 0) {
          const newProgressPercentage = Math.round((completedIds.length / lessons.length) * 100);
          setCourse({ ...course, progress_percentage: newProgressPercentage });
        }
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
        // Update local course average rating immediately
        if (course) {
          // Note: The API already updates the database, but for immediate UI update
          // we can recalculate locally or just refetch
          fetchCourseAndLessons();
        }
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
                <Button onClick={() => router.back()} variant="outline">
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
                    onClick={() => router.push(`/mentors/${courseId}`)}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Course
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
              {/* Video Player */}
              <div className="lg:col-span-2">
                <Card>
                  <CardContent className="p-0">
                    <div className="aspect-video bg-black rounded-t-lg relative">
                      {currentLesson && playbackId ? (
                        <div className="w-full h-full rounded-t-lg">
                          <iframe
                            src={`https://player.mux.com/${playbackId}`}
                            className="w-full h-full rounded-t-lg"
                            frameBorder="0"
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                            title={currentLesson.title}
                            onError={(e) => {
                              // Handle video error
                              const target = e.target as HTMLIFrameElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `
                                  <div class="flex items-center justify-center h-full text-white">
                                    <div class="text-center">
                                      <Play class="w-16 h-16 mx-auto mb-4 opacity-50" />
                                      <p class="mb-2">Video unavailable</p>
                                      <p class="text-sm opacity-75">This lesson video is currently not available</p>
                                    </div>
                                  </div>
                                `;
                              }
                            }}
                          />
                        </div>
                      ) : currentLesson ? (
                        <div className="flex items-center justify-center h-full text-white">
                          <div className="text-center">
                            <div className="animate-spin w-8 h-8 text-white mx-auto mb-4 opacity-50">
                              <Play className="w-8 h-8" />
                            </div>
                            <p>Loading video...</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-white">
                          <div className="text-center">
                            <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>Select a lesson to start watching</p>
                          </div>
                        </div>
                      )}


                    </div>

                    {currentLesson && (
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-semibold">{currentLesson.title}</h3>
                          {completedLessons.includes(currentLesson.id) ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markLessonComplete(currentLesson.id)}
                            >
                              Mark Incomplete
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markLessonComplete(currentLesson.id)}
                            >
                              Mark Complete
                            </Button>
                          )}
                        </div>

                        {currentLesson.description && (
                          <p className="text-muted-foreground text-sm mb-4">
                            {currentLesson.description}
                          </p>
                        )}

                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{currentLesson.duration_minutes} minutes</span>
                          </div>
                        </div>
                      </div>
                    )}
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
                            className={`w-full p-4 text-left hover:bg-muted transition-colors ${
                              currentLesson?.id === lesson.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                {completedLessons.includes(lesson.id) ? (
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markLessonComplete(lesson.id);
                                    }}
                                    className="cursor-pointer focus:outline-none"
                                  >
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  </span>
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
