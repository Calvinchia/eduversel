-- Create parent-child relationship table
CREATE TABLE IF NOT EXISTS parent_child_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    child_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    relationship_type TEXT DEFAULT 'parent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(parent_id, child_id)
);

-- Create achievement types table
CREATE TABLE IF NOT EXISTS achievement_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '🏆',
    points INTEGER DEFAULT 10,
    criteria JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create student achievements table
CREATE TABLE IF NOT EXISTS student_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_type_id UUID REFERENCES achievement_types(id) ON DELETE CASCADE,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    UNIQUE(student_id, achievement_type_id)
);

-- Create learning milestones table
CREATE TABLE IF NOT EXISTS learning_milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    milestone_type TEXT NOT NULL, -- 'topic_mastery', 'streak', 'improvement', etc.
    milestone_value NUMERIC,
    achieved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Insert default achievement types
INSERT INTO achievement_types (name, description, icon, points, criteria) VALUES
('First Quiz', 'Complete your first quiz', '🎯', 10, '{"type": "quiz_count", "value": 1}'),
('Perfect Score', 'Get 100% on a quiz', '⭐', 25, '{"type": "perfect_score", "value": 100}'),
('Quick Learner', 'Complete 5 quizzes in one day', '⚡', 20, '{"type": "daily_quizzes", "value": 5}'),
('Consistent Learner', 'Maintain a 7-day learning streak', '🔥', 30, '{"type": "streak", "value": 7}'),
('Subject Master', 'Achieve 90% mastery in a subject', '👑', 50, '{"type": "subject_mastery", "value": 90}'),
('Improvement Star', 'Improve average score by 20%', '📈', 35, '{"type": "score_improvement", "value": 20}'),
('Quiz Champion', 'Complete 50 quizzes', '🏆', 40, '{"type": "quiz_count", "value": 50}'),
('Knowledge Seeker', 'Answer 500 questions correctly', '🧠', 45, '{"type": "correct_answers", "value": 500}')
ON CONFLICT DO NOTHING;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_achievements(student_uuid UUID)
RETURNS VOID AS $$
DECLARE
    achievement_record RECORD;
    student_stats RECORD;
BEGIN
    -- Get student statistics
    SELECT 
        COUNT(DISTINCT qs.id) as total_quizzes,
        COUNT(CASE WHEN qr.is_correct THEN 1 END) as correct_answers,
        AVG(qs.score) as average_score,
        MAX(qs.score) as max_score
    INTO student_stats
    FROM quiz_sessions qs
    LEFT JOIN quiz_responses qr ON qs.id = qr.session_id
    WHERE qs.student_id = student_uuid;

    -- Check each achievement type
    FOR achievement_record IN 
        SELECT * FROM achievement_types 
        WHERE id NOT IN (
            SELECT achievement_type_id 
            FROM student_achievements 
            WHERE student_id = student_uuid
        )
    LOOP
        -- Check quiz count achievements
        IF achievement_record.criteria->>'type' = 'quiz_count' AND 
           student_stats.total_quizzes >= (achievement_record.criteria->>'value')::INTEGER THEN
            INSERT INTO student_achievements (student_id, achievement_type_id)
            VALUES (student_uuid, achievement_record.id);
        END IF;

        -- Check perfect score achievement
        IF achievement_record.criteria->>'type' = 'perfect_score' AND 
           student_stats.max_score >= (achievement_record.criteria->>'value')::INTEGER THEN
            INSERT INTO student_achievements (student_id, achievement_type_id)
            VALUES (student_uuid, achievement_record.id);
        END IF;

        -- Check correct answers achievement
        IF achievement_record.criteria->>'type' = 'correct_answers' AND 
           student_stats.correct_answers >= (achievement_record.criteria->>'value')::INTEGER THEN
            INSERT INTO student_achievements (student_id, achievement_type_id)
            VALUES (student_uuid, achievement_record.id);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced progress function with achievements
CREATE OR REPLACE FUNCTION get_student_progress(student_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    subject_progress JSONB[];
    subject_record RECORD;
    total_points INTEGER;
    current_streak INTEGER;
    quizzes_this_week INTEGER;
    score_trend NUMERIC;
BEGIN
    -- Calculate current streak
    WITH daily_activity AS (
        SELECT DATE(completed_at) as quiz_date
        FROM quiz_sessions 
        WHERE student_id = $1 AND completed_at IS NOT NULL
        GROUP BY DATE(completed_at)
        ORDER BY DATE(completed_at) DESC
    ),
    streak_calc AS (
        SELECT quiz_date, 
               quiz_date - INTERVAL '1 day' * (ROW_NUMBER() OVER (ORDER BY quiz_date DESC) - 1) as expected_date
        FROM daily_activity
    )
    SELECT COUNT(*) INTO current_streak
    FROM streak_calc 
    WHERE quiz_date = expected_date;

    -- Calculate quizzes this week
    SELECT COUNT(*) INTO quizzes_this_week
    FROM quiz_sessions 
    WHERE student_id = $1 
    AND completed_at >= DATE_TRUNC('week', NOW());

    -- Calculate score trend (this week vs last week)
    WITH weekly_scores AS (
        SELECT 
            CASE 
                WHEN completed_at >= DATE_TRUNC('week', NOW()) THEN 'this_week'
                WHEN completed_at >= DATE_TRUNC('week', NOW()) - INTERVAL '1 week' 
                     AND completed_at < DATE_TRUNC('week', NOW()) THEN 'last_week'
            END as week_period,
            AVG(score) as avg_score
        FROM quiz_sessions 
        WHERE student_id = $1 
        AND completed_at >= DATE_TRUNC('week', NOW()) - INTERVAL '1 week'
        GROUP BY week_period
    )
    SELECT 
        COALESCE((SELECT avg_score FROM weekly_scores WHERE week_period = 'this_week'), 0) -
        COALESCE((SELECT avg_score FROM weekly_scores WHERE week_period = 'last_week'), 0)
    INTO score_trend;

    -- Get total points from achievements
    SELECT COALESCE(SUM(at.points), 0) INTO total_points
    FROM student_achievements sa
    JOIN achievement_types at ON sa.achievement_type_id = at.id
    WHERE sa.student_id = $1;

    -- Calculate subject progress
    FOR subject_record IN 
        SELECT s.id, s.name, COUNT(t.id) as total_topics
        FROM subjects s
        LEFT JOIN topics t ON s.id = t.subject_id
        GROUP BY s.id, s.name
    LOOP
        WITH topic_mastery AS (
            SELECT 
                t.id,
                CASE 
                    WHEN AVG(qs.score) >= 80 THEN 1 
                    ELSE 0 
                END as is_mastered,
                COUNT(qs.id) as quiz_count,
                AVG(qs.score) as avg_score
            FROM topics t
            LEFT JOIN quiz_sessions qs ON t.id = qs.topic_id AND qs.student_id = $1
            WHERE t.subject_id = subject_record.id
            GROUP BY t.id
        )
        SELECT json_build_object(
            'subject_id', subject_record.id,
            'subject_name', subject_record.name,
            'total_topics', subject_record.total_topics,
            'topics_completed', COALESCE(SUM(is_mastered), 0),
            'mastery_level', CASE 
                WHEN subject_record.total_topics > 0 
                THEN (COALESCE(SUM(is_mastered), 0) * 100.0 / subject_record.total_topics)
                ELSE 0 
            END,
            'questions_answered', COALESCE(SUM(quiz_count), 0),
            'average_score', COALESCE(AVG(avg_score), 0)
        ) INTO subject_progress[array_length(subject_progress, 1) + 1]
        FROM topic_mastery;
    END LOOP;

    -- Build final result
    SELECT json_build_object(
        'total_quizzes', (
            SELECT COUNT(*) FROM quiz_sessions 
            WHERE student_id = $1 AND completed_at IS NOT NULL
        ),
        'average_score', (
            SELECT COALESCE(AVG(score), 0) FROM quiz_sessions 
            WHERE student_id = $1 AND completed_at IS NOT NULL
        ),
        'total_points', total_points,
        'current_streak', current_streak,
        'quizzes_this_week', quizzes_this_week,
        'score_trend', score_trend,
        'subject_progress', COALESCE(subject_progress, '{}')
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE parent_child_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their parent-child links" ON parent_child_links
    FOR SELECT USING (parent_id = auth.uid() OR child_id = auth.uid());

CREATE POLICY "Parents can create links to their children" ON parent_child_links
    FOR INSERT WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Achievement types are viewable by all authenticated users" ON achievement_types
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view their own achievements" ON student_achievements
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "System can insert achievements" ON student_achievements
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own milestones" ON learning_milestones
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "System can insert milestones" ON learning_milestones
    FOR INSERT WITH CHECK (true);
