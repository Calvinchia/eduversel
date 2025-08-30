-- Function to calculate question analytics
CREATE OR REPLACE FUNCTION calculate_question_analytics()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  question_record RECORD;
  success_rate DECIMAL;
  avg_time DECIMAL;
  response_count INTEGER;
BEGIN
  -- Update analytics for all questions with sufficient response data
  FOR question_record IN 
    SELECT q.id, COUNT(qr.id) as response_count
    FROM questions q
    LEFT JOIN quiz_responses qr ON q.id = qr.question_id
    GROUP BY q.id
    HAVING COUNT(qr.id) >= 5
  LOOP
    -- Calculate success rate
    SELECT 
      COALESCE(AVG(CASE WHEN is_correct THEN 1.0 ELSE 0.0 END), 0.5),
      COALESCE(AVG(time_taken_seconds), 15.0),
      COUNT(*)
    INTO success_rate, avg_time, response_count
    FROM quiz_responses
    WHERE question_id = question_record.id;

    -- Update question difficulty based on success rate
    -- 90% success = difficulty 1, 50% success = difficulty 3, 10% success = difficulty 5
    UPDATE questions
    SET difficulty_level = GREATEST(1, LEAST(5, ROUND((6 - (success_rate * 5)) * 10) / 10))
    WHERE id = question_record.id;

    -- Log the update for monitoring
    INSERT INTO question_analytics_log (question_id, success_rate, avg_time, response_count, updated_at)
    VALUES (question_record.id, success_rate, avg_time, response_count, NOW())
    ON CONFLICT (question_id) DO UPDATE SET
      success_rate = EXCLUDED.success_rate,
      avg_time = EXCLUDED.avg_time,
      response_count = EXCLUDED.response_count,
      updated_at = EXCLUDED.updated_at;
  END LOOP;
END;
$$;

-- Create analytics log table
CREATE TABLE IF NOT EXISTS question_analytics_log (
  question_id UUID PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  success_rate DECIMAL(4,3) NOT NULL,
  avg_time DECIMAL(6,2) NOT NULL,
  response_count INTEGER NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to get student learning velocity
CREATE OR REPLACE FUNCTION get_learning_velocity(
  p_student_id UUID,
  p_topic_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  velocity DECIMAL,
  trend TEXT,
  current_mastery DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  oldest_mastery DECIMAL;
  newest_mastery DECIMAL;
  days_diff INTEGER;
  calculated_velocity DECIMAL;
BEGIN
  -- Get mastery levels from the specified timeframe
  SELECT 
    FIRST_VALUE(mastery_level) OVER (ORDER BY updated_at ASC) as first_mastery,
    FIRST_VALUE(mastery_level) OVER (ORDER BY updated_at DESC) as last_mastery,
    EXTRACT(DAYS FROM (MAX(updated_at) - MIN(updated_at))) as day_difference
  INTO oldest_mastery, newest_mastery, days_diff
  FROM student_progress
  WHERE student_id = p_student_id 
    AND topic_id = p_topic_id
    AND updated_at >= NOW() - INTERVAL '1 day' * p_days;

  -- Calculate velocity (mastery change per day)
  IF days_diff > 0 THEN
    calculated_velocity := (newest_mastery - oldest_mastery) / days_diff;
  ELSE
    calculated_velocity := 0;
  END IF;

  -- Determine trend
  RETURN QUERY SELECT 
    calculated_velocity as velocity,
    CASE 
      WHEN calculated_velocity > 0.02 THEN 'improving'
      WHEN calculated_velocity < -0.02 THEN 'declining'
      ELSE 'stable'
    END as trend,
    COALESCE(newest_mastery, 0.0) as current_mastery;
END;
$$;

-- Scheduled job to update question analytics (would be run periodically)
-- This is a placeholder - in production, you'd set up a cron job or scheduled function
CREATE OR REPLACE FUNCTION schedule_analytics_update()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update question analytics
  PERFORM calculate_question_analytics();
  
  -- Log the scheduled update
  INSERT INTO system_logs (event_type, message, created_at)
  VALUES ('analytics_update', 'Question analytics updated successfully', NOW());
END;
$$;

-- Create system logs table for monitoring
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
