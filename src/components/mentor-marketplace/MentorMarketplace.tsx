'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Course, User, UserRole } from '@/types/mentor-marketplace';
import { Search, Filter, BookOpen, Users, TrendingUp, Star } from 'lucide-react';
import CourseDetailsModal from './CourseDetailsModal';
import { useToast } from '@/hooks/use-toast';

interface MentorMarketplaceProps {
  user?: User;
}

export default function MentorMarketplace({ user }: MentorMarketplaceProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolledLoading, setEnrolledLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        category: categoryFilter,
        level: levelFilter,
        search: searchTerm,
      });

      const response = await fetch(`/api/mentor-marketplace/courses?${params}`);
      const data = await response.json();

      if (data.error) {
        console.error('Error fetching courses:', data.error);
      } else {
        setCourses(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, levelFilter, searchTerm]);

  useEffect(() => {
    fetchCourses();
    fetchEnrolledCourses();
  }, [fetchCourses]);

  const fetchEnrolledCourses = async () => {
    try {
      setEnrolledLoading(true);
      const response = await fetch('/api/mentor-marketplace/enrolled');
      const data = await response.json();
      if (data.error) {
        console.error('Error fetching enrolled courses:', data.error);
      } else {
        setEnrolledCourses(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
    } finally {
      setEnrolledLoading(false);
    }
  };

  const handleSearch = () => {
    fetchCourses();
  };

  const handleCourseClick = (course: Course) => {
    setSelectedCourse(course);
    setIsModalOpen(true);
  };

  const handleEnroll = async (courseId: string) => {
    try {
      const response = await fetch('/api/mentor-marketplace/enroll', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseId }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Successfully enrolled in course!",
        });
        fetchCourses(); // Refresh to update enrollment counts
        fetchEnrolledCourses(); // Refresh enrolled courses
      } else if (data.requiresPayment) {
        toast({
          title: "Info",
          description: "Payment required for this course. Payment integration coming soon!",
        });
      } else if (data.isMentorOfCourse) {
        toast({
          title: "Info",
          description: "You cannot enroll in your own course. Use the \"Manage Course\" button instead.",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || 'Failed to enroll in course',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      toast({
        title: "Error",
        description: "Failed to enroll in course. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return 'Free';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const renderCourseCard = (course: Course) => {
    // Check if current user is the mentor of this course
    const isMentorOfCourse = user?.role === 'mentor' && user?.id === course.mentor_id;
    const isEnrolled = false; // TODO: Check if user is enrolled in this course

    return (
      <Card
        key={course.id}
        className="hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => handleCourseClick(course)}
      >
        <CardHeader className="p-0">
          <div className="aspect-video bg-gray-200 rounded-t-lg flex items-center justify-center">
            {course.thumbnail_url ? (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="w-full h-full object-cover rounded-t-lg"
              />
            ) : (
              <BookOpen className="w-12 h-12 text-gray-400" />
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <Badge variant="secondary" className="text-xs">
              {course.category.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {course.level.toUpperCase()}
            </Badge>
          </div>

          <CardTitle className="text-lg mb-2 line-clamp-2">
            {course.title}
          </CardTitle>

          <CardDescription className="text-sm mb-3 line-clamp-2">
            {course.description}
          </CardDescription>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <img
                src={course.mentor.avatar_url || '/placeholder-avatar.png'}
                alt={course.mentor.display_name}
                className="w-6 h-6 rounded-full"
              />
              <span className="text-sm text-gray-600">
                {course.mentor.display_name || course.mentor.username || 'Anonymous Mentor'}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm">{course.average_rating.toFixed(1)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-green-600">
              {formatPrice(course.price, course.currency)}
            </div>
            <div className="text-sm text-gray-500">
              {course.total_lessons} lessons
            </div>
          </div>

          {isMentorOfCourse ? (
            <Button
              className="w-full mt-3"
              variant="default"
              onClick={(e) => {
                e.stopPropagation();
                router.push('/mentors/dashboard');
              }}
            >
              Manage Course
            </Button>
          ) : (
            <Button
              className="w-full mt-3"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleCourseClick(course);
              }}
            >
              {course.price === 0 ? 'Enroll Now' : 'Buy Now'}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading && enrolledLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const renderEnrolledCourseCard = (course: Course) => (
    <Card key={course.id} className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader className="p-0">
        <div className="aspect-video bg-gray-200 rounded-t-lg flex items-center justify-center">
          {course.thumbnail_url ? (
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="w-full h-full object-cover rounded-t-lg"
            />
          ) : (
            <BookOpen className="w-12 h-12 text-gray-400" />
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <Badge variant="secondary" className="text-xs">
            {course.category.toUpperCase()}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {course.level.toUpperCase()}
          </Badge>
        </div>

        <CardTitle className="text-lg mb-2 line-clamp-2">
          {course.title}
        </CardTitle>

        <CardDescription className="text-sm mb-3 line-clamp-2">
          {course.description}
        </CardDescription>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <img
              src={course.mentor.avatar_url || '/placeholder-avatar.png'}
              alt={course.mentor.display_name}
              className="w-6 h-6 rounded-full"
            />
            <span className="text-sm text-gray-600">
              {course.mentor.display_name || course.mentor.username || 'Anonymous Mentor'}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm">{course.average_rating.toFixed(1)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-bold text-green-600">
            {formatPrice(course.price, course.currency)}
          </div>
          <div className="text-sm text-gray-500">
            {course.total_lessons} lessons
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Progress: {course.progress_percentage || 0}%
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const lessonsResponse = await fetch(`/api/mentor-marketplace/lessons/enrolled?courseId=${course.id}`);
                const lessonsData = await lessonsResponse.json();
                if (lessonsData.data && lessonsData.data.length > 0) {
                  const firstLesson = lessonsData.data[0];
                  router.push(`/mentors/${course.id}/${firstLesson.id}`);
                } else {
                  toast({
                    title: "Error",
                    description: "No lessons available for this course.",
                    variant: "destructive",
                  });
                }
              } catch (error) {
                console.error('Error fetching lessons:', error);
                toast({
                  title: "Error",
                  description: "Failed to load lessons.",
                  variant: "destructive",
                });
              }
            }}
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mentor Marketplace</h1>
          <p className="text-gray-600 mt-1">
            Learn from expert mentors and advance your skills
          </p>
        </div>

        <div className="flex items-center gap-3">
          {user?.role === 'mentor' && (
            <Button onClick={() => router.push('/mentors/dashboard')}>
              Mentor Dashboard
            </Button>
          )}

          {user?.role === 'admin' && (
            <Button onClick={() => router.push('/admin/analytics')}>
              Admin Dashboard
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="browse">Browse Courses</TabsTrigger>
          <TabsTrigger value="enrolled">My Enrolled Courses</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search courses..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="programming">Programming</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="data-science">Data Science</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={handleSearch}>
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Courses</p>
                    <p className="text-2xl font-bold">{courses.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Active Mentors</p>
                    <p className="text-2xl font-bold">
                      {new Set(courses.map(c => c.mentor_id)).size}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Avg. Rating</p>
                    <p className="text-2xl font-bold">
                      {courses.length > 0
                        ? (courses.reduce((acc, c) => acc + c.average_rating, 0) / courses.length).toFixed(1)
                        : '0.0'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(renderCourseCard)}
          </div>

          {courses.length === 0 && !loading && !enrolledLoading && (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
              <p className="text-gray-600">
                Try adjusting your search criteria or browse all courses.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="enrolled" className="space-y-6">
          {/* Enrolled Courses Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-600">Enrolled Courses</p>
                    <p className="text-2xl font-bold">{enrolledCourses.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-600">Total Progress</p>
                    <p className="text-2xl font-bold">
                      {enrolledCourses.length > 0
                        ? Math.round(enrolledCourses.reduce((acc, c) => acc + (c.progress_percentage || 0), 0) / enrolledCourses.length)
                        : 0
                      }%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold">
                      {enrolledCourses.filter(c => (c.progress_percentage || 0) >= 100).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enrolled Courses Grid */}
          {enrolledCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map(renderEnrolledCourseCard)}
            </div>
          ) : (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No enrolled courses</h3>
              <p className="text-gray-600 mb-4">
                You haven't enrolled in any courses yet. Browse the marketplace to find courses to learn from.
              </p>
              <Button onClick={() => router.push('/')} variant="outline">
                Browse Courses
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Course Details Modal */}
      <CourseDetailsModal
        course={selectedCourse}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCourse(null);
        }}
        onEnroll={(courseId) => handleEnroll(courseId)}
        user={user}
      />
    </div>
  );
}
