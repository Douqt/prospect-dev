-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.comment_votes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  comment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  vote_type character varying NOT NULL CHECK (vote_type::text = ANY (ARRAY['up'::character varying, 'down'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comment_votes_pkey PRIMARY KEY (id),
  CONSTRAINT comment_votes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id),
  CONSTRAINT comment_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT fk_comment_votes_comment FOREIGN KEY (comment_id) REFERENCES public.comments(id),
  CONSTRAINT fk_comment_votes_user FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  content text NOT NULL,
  user_id uuid NOT NULL,
  discussion_id uuid NOT NULL,
  parent_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  upvotes integer NOT NULL DEFAULT 0,
  downvotes integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  searchable tsvector,
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT comments_discussion_id_fkey FOREIGN KEY (discussion_id) REFERENCES public.discussions(id),
  CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.comments(id),
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT fk_comments_discussion FOREIGN KEY (discussion_id) REFERENCES public.discussions(id)
);
CREATE TABLE public.commissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  purchase_id uuid NOT NULL,
  mentor_id uuid NOT NULL,
  platform_fee numeric NOT NULL,
  mentor_payout numeric NOT NULL,
  currency text DEFAULT 'USD'::text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text])),
  stripe_transfer_id text,
  created_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  CONSTRAINT commissions_pkey PRIMARY KEY (id),
  CONSTRAINT commissions_purchase_id_fkey FOREIGN KEY (purchase_id) REFERENCES public.purchases(id),
  CONSTRAINT commissions_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.community_memberships (
  user_id uuid NOT NULL,
  community_symbol text NOT NULL DEFAULT '""'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT community_memberships_pkey PRIMARY KEY (user_id, community_symbol),
  CONSTRAINT community_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT fk_memberships_user FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT community_memberships_community_symbol_fkey FOREIGN KEY (community_symbol) REFERENCES public.community_stats(community_symbol)
);
CREATE TABLE public.community_stats (
  community_symbol text NOT NULL,
  member_count bigint NOT NULL DEFAULT 0,
  post_count bigint NOT NULL DEFAULT '0'::bigint,
  last_activity timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT community_stats_pkey PRIMARY KEY (community_symbol)
);
CREATE TABLE public.course_ratings (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL,
  course_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT course_ratings_pkey PRIMARY KEY (id),
  CONSTRAINT course_ratings_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id),
  CONSTRAINT course_ratings_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.courses (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text NOT NULL,
  price numeric DEFAULT 0,
  currency text DEFAULT 'USD'::text,
  category text NOT NULL,
  level text DEFAULT 'beginner'::text CHECK (level = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text])),
  mentor_id uuid NOT NULL,
  thumbnail_url text,
  trailer_video_id text,
  is_published boolean DEFAULT false,
  total_lessons integer DEFAULT 0,
  total_duration_minutes integer DEFAULT 0,
  total_enrollments integer DEFAULT 0,
  tags ARRAY DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  average_rating numeric DEFAULT 0.0,
  CONSTRAINT courses_pkey PRIMARY KEY (id),
  CONSTRAINT courses_mentor_id_fkey FOREIGN KEY (mentor_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.discussion_votes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  discussion_id uuid NOT NULL,
  user_id uuid NOT NULL,
  vote_type character varying NOT NULL CHECK (vote_type::text = ANY (ARRAY['up'::character varying, 'down'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT discussion_votes_pkey PRIMARY KEY (id),
  CONSTRAINT discussion_votes_discussion_id_fkey FOREIGN KEY (discussion_id) REFERENCES public.discussions(id),
  CONSTRAINT discussion_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT fk_discussion_votes_discussion FOREIGN KEY (discussion_id) REFERENCES public.discussions(id),
  CONSTRAINT fk_discussion_votes_user FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.discussions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title character varying NOT NULL,
  content text NOT NULL,
  user_id uuid NOT NULL,
  category text NOT NULL CHECK (char_length(category) >= 1 AND char_length(category) <= 50),
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  upvotes integer NOT NULL DEFAULT 0,
  downvotes integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  views bigint NOT NULL DEFAULT '0'::bigint,
  searchable tsvector,
  CONSTRAINT discussions_pkey PRIMARY KEY (id),
  CONSTRAINT discussions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT fk_discussions_user FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT discussions_category_fkey FOREIGN KEY (category) REFERENCES public.community_stats(community_symbol)
);
CREATE TABLE public.lesson_progress (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  course_id uuid NOT NULL,
  is_completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lesson_progress_pkey PRIMARY KEY (id),
  CONSTRAINT lesson_progress_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id),
  CONSTRAINT lesson_progress_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id),
  CONSTRAINT lesson_progress_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.lessons (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  course_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  video_id text NOT NULL,
  duration_minutes integer NOT NULL,
  order_index integer NOT NULL,
  is_preview boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lessons_pkey PRIMARY KEY (id),
  CONSTRAINT lessons_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  avatar_url text,
  last_login timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  username text NOT NULL UNIQUE CHECK (length(username) >= 3 AND length(username) <= 20),
  dark_mode boolean NOT NULL DEFAULT true,
  onboarded boolean NOT NULL DEFAULT false,
  display_name text NOT NULL DEFAULT ''::text,
  bio text NOT NULL DEFAULT ''::text,
  stripe_account_id text,
  role text NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['member'::text, 'admin'::text, 'mentor'::text])),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.purchases (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL,
  course_id uuid NOT NULL,
  amount_paid numeric NOT NULL,
  currency text DEFAULT 'USD'::text,
  stripe_payment_intent_id text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text])),
  enrolled_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  progress_percentage integer DEFAULT 0,
  CONSTRAINT purchases_pkey PRIMARY KEY (id),
  CONSTRAINT purchases_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id),
  CONSTRAINT purchases_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.user_post_views (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_post_views_pkey PRIMARY KEY (id),
  CONSTRAINT user_post_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_post_views_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.discussions(id)
);
CREATE TABLE public.waitlist (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL DEFAULT ''::text,
  email text NOT NULL DEFAULT ''::text UNIQUE,
  CONSTRAINT waitlist_pkey PRIMARY KEY (id)
);