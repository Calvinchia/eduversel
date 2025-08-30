-- Function to update student progress
CREATE OR REPLACE FUNCTION update_student_progress(
  p_student_id UUID,
  p_subject_id UUID,
  p_topic_id UUID,
  p_mastery_change DECIMAL,
  p_questions_attempted INTEGER,
  p_questions_correct INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.student_progress (
    student_id,
    subject_id,
    topic_id,
    mastery_level,
    questions_attempted,
    questions_correct,
    average_difficulty,
    last_practiced_at,
    updated_at
  )
  VALUES (
    p_student_id,
    p_subject_id,
    p_topic_id,
    GREATEST(0.0, LEAST(1.0, p_mastery_change)),
    p_questions_attempted,
    p_questions_correct,
    3.0,
    NOW(),
    NOW()
  )
  ON CONFLICT (student_id, subject_id, topic_id)
  DO UPDATE SET
    mastery_level = GREATEST(0.0, LEAST(1.0, student_progress.mastery_level + p_mastery_change)),
    questions_attempted = student_progress.questions_attempted + p_questions_attempted,
    questions_correct = student_progress.questions_correct + p_questions_correct,
    last_practiced_at = NOW(),
    updated_at = NOW();
END;
$$;
