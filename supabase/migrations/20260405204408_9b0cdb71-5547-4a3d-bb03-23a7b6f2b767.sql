
-- Create interview_results table
CREATE TABLE public.interview_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  overall_score INTEGER NOT NULL DEFAULT 0,
  category_scores JSONB DEFAULT '{}',
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  improvements TEXT[] DEFAULT '{}',
  total_duration INTEGER NOT NULL DEFAULT 0,
  answers JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.interview_results ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own results"
  ON public.interview_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own results"
  ON public.interview_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own results"
  ON public.interview_results FOR DELETE
  USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_interview_results_updated_at
  BEFORE UPDATE ON public.interview_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
