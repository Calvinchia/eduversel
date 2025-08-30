-- Function to get comprehensive question statistics
CREATE OR REPLACE FUNCTION get_question_statistics()
RETURNS TABLE (
  total_questions BIGINT,
  by_difficulty JSONB,
  by_type JSONB,
  by_subject JSONB,
  avg_success_rate DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_questions,
    jsonb_object_agg(difficulty_level::text, difficulty_count) as by_difficulty,
    jsonb_object_agg(question_type, type_count) as by_type,
    jsonb_object_agg(subject_name, subject_count) as by_subject,
    COALESCE(AVG(success_rate), 0.0) as avg_success_rate
  FROM (
    SELECT 
      q.difficulty_level,
      q.question_type,
      s.name as subject_name,
      COUNT(*) OVER (PARTITION BY q.difficulty_level) as difficulty_count,
      COUNT(*) OVER (PARTITION BY q.question_type) as type_count,
      COUNT(*) OVER (PARTITION BY s.name) as subject_count,
      COALESCE(
        (SELECT AVG(CASE WHEN qr.is_correct THEN 1.0 ELSE 0.0 END)
         FROM quiz_responses qr WHERE qr.question_id = q.id), 
        0.5
      ) as success_rate
    FROM questions q
    JOIN topics t ON q.topic_id = t.id
    JOIN subjects s ON t.subject_id = s.id
  ) stats;
END;
$$;

-- Function to get student performance summary
CREATE OR REPLACE FUNCTION get_student_performance_summary(
  p_student_id UUID DEFAULT NULL,
  p_subject_id UUID DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  grade_level INTEGER,
  total_sessions BIGINT,
  completed_sessions BIGINT,
  total_questions BIGINT,
  correct_answers BIGINT,
  average_accuracy DECIMAL,
  average_time DECIMAL,
  mastery_levels JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as student_id,
    p.full_name as student_name,
    p.grade_level,
    COUNT(DISTINCT qs.id) as total_sessions,
    COUNT(DISTINCT CASE WHEN qs.status = 'completed' THEN qs.id END) as completed_sessions,
    COALESCE(SUM(qs.questions_answered), 0) as total_questions,
    COALESCE(SUM(qs.correct_answers), 0) as correct_answers,
    CASE 
      WHEN SUM(qs.questions_answered) > 0 
      THEN ROUND((SUM(qs.correct_answers)::DECIMAL / SUM(qs.questions_answered)) * 100, 2)
      ELSE 0.0 
    END as average_accuracy,
    COALESCE(AVG(qr.time_taken_seconds), 0.0) as average_time,
    COALESCE(
      jsonb_object_agg(
        DISTINCT s.name, 
        ROUND(sp.mastery_level * 100, 2)
      ) FILTER (WHERE sp.mastery_level IS NOT NULL),
      '{}'::jsonb
    ) as mastery_levels
  FROM profiles p
  LEFT JOIN quiz_sessions qs ON p.id = qs.student_id 
    AND qs.started_at >= NOW() - INTERVAL '1 day' * p_days
    AND (p_subject_id IS NULL OR qs.subject_id = p_subject_id)
  LEFT JOIN quiz_responses qr ON qs.id = qr.session_id
  LEFT JOIN student_progress sp ON p.id = sp.student_id
  LEFT JOIN subjects s ON sp.subject_id = s.id
  WHERE p.role = 'student'
    AND (p_student_id IS NULL OR p.id = p_student_id)
  GROUP BY p.id, p.full_name, p.grade_level
  ORDER BY average_accuracy DESC;
END;
$$;

-- Function to get class performance trends
CREATE OR REPLACE FUNCTION get_class_performance_trends(
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  date_bucket DATE,
  total_sessions BIGINT,
  average_accuracy DECIMAL,
  unique_students BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(qs.started_at) as date_bucket,
    COUNT(*) as total_sessions,
    CASE 
      WHEN SUM(qs.questions_answered) > 0 
      THEN ROUND((SUM(qs.correct_answers)::DECIMAL / SUM(qs.questions_answered)) * 100, 2)
      ELSE 0.0 
    END as average_accuracy,
    COUNT(DISTINCT qs.student_id) as unique_students
  FROM quiz_sessions qs
  WHERE qs.started_at >= NOW() - INTERVAL '1 day' * p_days
  GROUP BY DATE(qs.started_at)
  ORDER BY date_bucket DESC;
END;
$$;

-- Function to identify students needing attention
CREATE OR REPLACE FUNCTION get_students_needing_attention()
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  grade_level INTEGER,
  issue_type TEXT,
  issue_description TEXT,
  last_activity DATE,
  recommendation TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  -- Students with low accuracy
  SELECT 
    p.id,
    p.full_name,
    p.grade_level,
    'low_accuracy'::TEXT,
    'Consistently scoring below 60%'::TEXT,
    MAX(DATE(qs.started_at)),
    'Consider reviewing fundamentals or reducing difficulty'::TEXT
  FROM profiles p
  JOIN quiz_sessions qs ON p.id = qs.student_id
  WHERE p.role = 'student'
    AND qs.started_at >= NOW() - INTERVAL '14 days'
    AND qs.questions_answered > 0
  GROUP BY p.id, p.full_name, p.grade_level
  HAVING AVG(qs.correct_answers::DECIMAL / qs.questions_answered) < 0.6

  UNION ALL

  -- Students who haven't practiced recently
  SELECT 
    p.id,
    p.full_name,
    p.grade_level,
    'inactive'::TEXT,
    'No activity in the past week'::TEXT,
    MAX(DATE(qs.started_at)),
    'Encourage regular practice sessions'::TEXT
  FROM profiles p
  LEFT JOIN quiz_sessions qs ON p.id = qs.student_id
  WHERE p.role = 'student'
  GROUP BY p.id, p.full_name, p.grade_level
  HAVING MAX(qs.started_at) < NOW() - INTERVAL '7 days' OR MAX(qs.started_at) IS NULL

  ORDER BY last_activity DESC NULLS LAST;
END;
$$;
