-- Create user profiles table for students and teachers
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')) DEFAULT 'student',
  grade_level INTEGER CHECK (grade_level BETWEEN 1 AND 6), -- Primary 1-6 in Singapore
  school_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subjects table for Singapore MOE curriculum
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  grade_levels INTEGER[] NOT NULL, -- Array of grade levels this subject applies to
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create topics table for organizing quiz content
CREATE TABLE IF NOT EXISTS public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
  grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 1 AND 6),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank')),
  options JSONB, -- For multiple choice options
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quiz sessions table to track student attempts
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  topic_id UUID REFERENCES public.topics(id),
  current_difficulty INTEGER NOT NULL DEFAULT 3 CHECK (current_difficulty BETWEEN 1 AND 5),
  questions_answered INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'paused')) DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_time_seconds INTEGER DEFAULT 0
);

-- Create quiz responses table to track individual question responses
CREATE TABLE IF NOT EXISTS public.quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id),
  student_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_taken_seconds INTEGER NOT NULL,
  difficulty_at_time INTEGER NOT NULL,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create student progress table for tracking learning analytics
CREATE TABLE IF NOT EXISTS public.student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  topic_id UUID NOT NULL REFERENCES public.topics(id),
  mastery_level DECIMAL(3,2) NOT NULL DEFAULT 0.0 CHECK (mastery_level BETWEEN 0.0 AND 1.0),
  questions_attempted INTEGER NOT NULL DEFAULT 0,
  questions_correct INTEGER NOT NULL DEFAULT 0,
  average_difficulty DECIMAL(3,2) NOT NULL DEFAULT 3.0,
  last_practiced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, subject_id, topic_id)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for subjects (readable by all authenticated users)
CREATE POLICY "Authenticated users can view subjects" ON public.subjects
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Teachers can manage subjects" ON public.subjects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- RLS Policies for topics (readable by all authenticated users)
CREATE POLICY "Authenticated users can view topics" ON public.topics
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Teachers can manage topics" ON public.topics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- RLS Policies for questions (readable by all authenticated users)
CREATE POLICY "Authenticated users can view questions" ON public.questions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Teachers can manage questions" ON public.questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- RLS Policies for quiz sessions (students can only access their own)
CREATE POLICY "Students can view their own quiz sessions" ON public.quiz_sessions
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can create their own quiz sessions" ON public.quiz_sessions
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own quiz sessions" ON public.quiz_sessions
  FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view all quiz sessions" ON public.quiz_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- RLS Policies for quiz responses (students can only access their own)
CREATE POLICY "Students can view their own quiz responses" ON public.quiz_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_sessions 
      WHERE id = session_id AND student_id = auth.uid()
    )
  );

CREATE POLICY "Students can create their own quiz responses" ON public.quiz_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_sessions 
      WHERE id = session_id AND student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view all quiz responses" ON public.quiz_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );

-- RLS Policies for student progress (students can only access their own)
CREATE POLICY "Students can view their own progress" ON public.student_progress
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Students can update their own progress" ON public.student_progress
  FOR ALL USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view all student progress" ON public.student_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'teacher'
    )
  );
