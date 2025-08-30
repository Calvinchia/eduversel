-- Insert Singapore MOE subjects for primary school
INSERT INTO public.subjects (name, description, grade_levels) VALUES
('English Language', 'English Language curriculum following Singapore MOE standards', ARRAY[1,2,3,4,5,6]),
('Mathematics', 'Mathematics curriculum following Singapore MOE standards', ARRAY[1,2,3,4,5,6]),
('Science', 'Science curriculum for upper primary levels', ARRAY[3,4,5,6]),
('Mother Tongue', 'Chinese/Malay/Tamil language curriculum', ARRAY[1,2,3,4,5,6]),
('Social Studies', 'Social Studies curriculum for upper primary levels', ARRAY[4,5,6])
ON CONFLICT (name) DO NOTHING;

-- Insert sample topics for Mathematics (Primary 3)
INSERT INTO public.topics (subject_id, name, description, difficulty_level, grade_level)
SELECT 
  s.id,
  topic_name,
  topic_desc,
  difficulty,
  3
FROM public.subjects s,
(VALUES 
  ('Addition and Subtraction', 'Basic arithmetic operations with numbers up to 10,000', 2),
  ('Multiplication Tables', 'Times tables from 2 to 10', 3),
  ('Division', 'Division with and without remainders', 3),
  ('Fractions', 'Understanding halves, quarters, and thirds', 4),
  ('Money', 'Counting money and making change', 2),
  ('Time', 'Reading clocks and understanding duration', 3),
  ('Length and Mass', 'Measuring using standard units', 2),
  ('Shapes and Patterns', 'Identifying 2D and 3D shapes', 2)
) AS topics(topic_name, topic_desc, difficulty)
WHERE s.name = 'Mathematics';

-- Insert sample questions for Addition and Subtraction
INSERT INTO public.questions (topic_id, question_text, question_type, options, correct_answer, explanation, difficulty_level)
SELECT 
  t.id,
  q.question_text,
  q.question_type,
  q.options,
  q.correct_answer,
  q.explanation,
  q.difficulty_level
FROM public.topics t,
(VALUES 
  ('What is 25 + 17?', 'multiple_choice', '{"A": "32", "B": "42", "C": "52", "D": "62"}', 'B', 'Add the ones: 5 + 7 = 12. Add the tens: 2 + 1 = 3, plus 1 carried over = 4. Answer: 42', 2),
  ('What is 84 - 29?', 'multiple_choice', '{"A": "55", "B": "65", "C": "45", "D": "75"}', 'A', 'Subtract: 84 - 29. Borrow from tens place: 14 - 9 = 5, 7 - 2 = 5. Answer: 55', 3),
  ('True or False: 15 + 8 = 23', 'true_false', '{"True": "True", "False": "False"}', 'True', '15 + 8 = 23 is correct', 1),
  ('Fill in the blank: 36 + ___ = 50', 'fill_blank', '{}', '14', '50 - 36 = 14', 2),
  ('What is 156 + 278?', 'multiple_choice', '{"A": "434", "B": "424", "C": "444", "D": "414"}', 'A', 'Add column by column: 6+8=14 (write 4, carry 1), 5+7+1=13 (write 3, carry 1), 1+2+1=4. Answer: 434', 4)
) AS q(question_text, question_type, options, correct_answer, explanation, difficulty_level)
WHERE t.name = 'Addition and Subtraction';
