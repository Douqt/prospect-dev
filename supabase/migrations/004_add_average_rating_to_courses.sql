-- Add average_rating column to courses table
ALTER TABLE public.courses ADD COLUMN average_rating numeric(2,1) DEFAULT 0.0;

-- Create index for better performance
CREATE INDEX idx_courses_average_rating ON public.courses(average_rating);

-- Update existing courses to have a default average rating of 0.0
UPDATE public.courses SET average_rating = 0.0 WHERE average_rating IS NULL;

-- Enable RLS on courses table if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'courses' AND policyname = 'Allow updating average rating'
  ) THEN
    ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

    -- Add policy to allow updating average_rating column for any authenticated user
    -- This allows the ratings API to update the average rating when users submit ratings
    CREATE POLICY "Allow updating average rating" ON public.courses
      FOR UPDATE USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;
