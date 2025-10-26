-- Create course_ratings table
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
  CONSTRAINT course_ratings_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT unique_student_course_rating UNIQUE (student_id, course_id)
);

-- Create index for faster queries
CREATE INDEX idx_course_ratings_course_id ON public.course_ratings(course_id);
CREATE INDEX idx_course_ratings_student_id ON public.course_ratings(student_id);
