// User roles and types (matching actual schema)
export type UserRole = 'mentor' | 'member' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  stripe_account_id?: string; // For mentors using Stripe Connect
  created_at: string;
  updated_at: string;
  last_login?: string;
  metadata?: any;
  onboarded?: boolean;
  dark_mode?: boolean;
}

// Course related types
export interface Course {
  id: string;
  title: string;
  description: string;
  price: number; // 0 for free courses
  currency: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  mentor_id: string;
  mentor: User;
  thumbnail_url?: string;
  trailer_video_id?: string; // Vimeo video ID for course trailer
  is_published: boolean;
  total_lessons: number;
  total_duration_minutes: number;
  average_rating: number;
  total_enrollments: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  enrolled_at?: string; // For enrolled courses
  progress_percentage?: number; // For enrolled courses
}

// Lesson related types
export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  video_id: string; // Vimeo video ID
  duration_minutes: number;
  order_index: number;
  is_preview: boolean; // Free preview lesson
  created_at: string;
  updated_at: string;
}

// Purchase/Enrollment types
export interface Purchase {
  id: string;
  student_id: string;
  course_id: string;
  amount_paid: number;
  currency: string;
  stripe_payment_intent_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  enrolled_at: string;
  completed_at?: string;
  progress_percentage: number;
}

// Rating types
export interface CourseRating {
  id: string;
  student_id: string;
  course_id: string;
  rating: number; // 1-5
  review?: string;
  created_at: string;
  updated_at: string;
}

// Lesson progress types
export interface LessonProgress {
  id: string;
  student_id: string;
  lesson_id: string;
  course_id: string;
  is_completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

// Commission tracking
export interface Commission {
  id: string;
  purchase_id: string;
  mentor_id: string;
  platform_fee: number; // Amount kept by platform
  mentor_payout: number; // Amount paid to mentor
  currency: string;
  status: 'pending' | 'paid' | 'failed';
  stripe_transfer_id?: string;
  created_at: string;
  processed_at?: string;
}

// Vimeo API types
export interface VimeoVideo {
  id: string;
  name: string;
  description?: string;
  duration: number;
  embed_url: string;
  thumbnail_url: string;
  upload_date: string;
  status: 'available' | 'uploading' | 'processing' | 'error';
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Form types for creating/editing
export interface CreateCourseForm {
  title: string;
  description: string;
  price: number;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  thumbnail_url?: string;
  trailer_video_id?: string;
}

export interface CreateLessonForm {
  title: string;
  description?: string;
  video_file: File;
  duration_minutes: number;
  is_preview: boolean;
}

// Dashboard analytics types
export interface MentorAnalytics {
  total_courses: number;
  total_students: number;
  total_revenue: number;
  total_commissions_earned: number;
  monthly_revenue: Array<{
    month: string;
    revenue: number;
    enrollments: number;
  }>;
  top_courses: Array<{
    course_id: string;
    title: string;
    enrollments: number;
    revenue: number;
  }>;
}

export interface AdminAnalytics {
  total_mentors: number;
  total_students: number;
  total_courses: number;
  total_revenue: number;
  platform_commissions: number;
  monthly_stats: Array<{
    month: string;
    revenue: number;
    commissions: number;
    new_mentors: number;
    new_students: number;
  }>;
}

// Stripe Connect types
export interface StripeAccount {
  id: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  country: string;
  currency: string;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
}
