-- Add RLS policies for course_ratings table
ALTER TABLE public.course_ratings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view ratings for published courses
CREATE POLICY "Anyone can view course ratings" ON public.course_ratings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_ratings.course_id
      AND courses.is_published = true
    )
  );

-- Policy: Students can only insert their own ratings for courses they're enrolled in
CREATE POLICY "Students can insert own ratings" ON public.course_ratings
  FOR INSERT WITH CHECK (
    auth.uid() = student_id AND
    EXISTS (
      SELECT 1 FROM public.purchases
      WHERE purchases.student_id = auth.uid()
      AND purchases.course_id = course_ratings.course_id
      AND purchases.status = 'completed'
    )
  );

-- Policy: Students can only update their own ratings
CREATE POLICY "Students can update own ratings" ON public.course_ratings
  FOR UPDATE USING (auth.uid() = student_id);

-- Policy: Students can only delete their own ratings
CREATE POLICY "Students can delete own ratings" ON public.course_ratings
  FOR DELETE USING (auth.uid() = student_id);

-- Policy: Mentors can view ratings for their own courses
CREATE POLICY "Mentors can view own course ratings" ON public.course_ratings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = course_ratings.course_id
      AND courses.mentor_id = auth.uid()
    )
  );

-- Policy: Admins can manage all ratings
CREATE POLICY "Admins can manage all ratings" ON public.course_ratings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Add RLS policies for lesson_progress table
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Students can only view their own lesson progress
CREATE POLICY "Students can view own lesson progress" ON public.lesson_progress
  FOR SELECT USING (auth.uid() = student_id);

-- Policy: Students can only insert their own lesson progress for enrolled courses
CREATE POLICY "Students can insert own lesson progress" ON public.lesson_progress
  FOR INSERT WITH CHECK (
    auth.uid() = student_id AND
    EXISTS (
      SELECT 1 FROM public.purchases
      WHERE purchases.student_id = auth.uid()
      AND purchases.course_id = lesson_progress.course_id
      AND purchases.status = 'completed'
    )
  );

-- Policy: Students can only update their own lesson progress
CREATE POLICY "Students can update own lesson progress" ON public.lesson_progress
  FOR UPDATE USING (auth.uid() = student_id);

-- Policy: Students can only delete their own lesson progress
CREATE POLICY "Students can delete own lesson progress" ON public.lesson_progress
  FOR DELETE USING (auth.uid() = student_id);

-- Policy: Mentors can view lesson progress for their own courses
CREATE POLICY "Mentors can view course lesson progress" ON public.lesson_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = lesson_progress.course_id
      AND courses.mentor_id = auth.uid()
    )
  );

-- Policy: Admins can manage all lesson progress
CREATE POLICY "Admins can manage all lesson progress" ON public.lesson_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
