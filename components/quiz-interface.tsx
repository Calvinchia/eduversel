"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { AdaptiveQuizEngine } from "@/lib/adaptive-engine"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Question {
  id: string
  question_text: string
  question_type: "multiple_choice" | "true_false" | "fill_blank"
  options?: Record<string, string>
  correct_answer: string
  explanation: string
  difficulty_level: number
}

interface QuizSession {
  id: string
  current_difficulty: number
  questions_answered: number
  correct_answers: number
  status: string
}

interface Topic {
  id: string
  name: string
  description: string
  difficulty_level: number
  subjects: {
    id: string
    name: string
  }
}

interface Profile {
  id: string
  full_name: string
  grade_level: number
}

interface QuizInterfaceProps {
  topic: Topic
  profile: Profile
  activeSession: QuizSession | null
}

export default function QuizInterface({ topic, profile, activeSession }: QuizInterfaceProps) {
  const [session, setSession] = useState<QuizSession | null>(activeSession)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [timeStarted, setTimeStarted] = useState<number>(Date.now())
  const [quizStarted, setQuizStarted] = useState(!!activeSession)
  const [recentPerformance, setRecentPerformance] = useState<number[]>([])
  const [questionHistory, setQuestionHistory] = useState<string[]>([])
  const [adaptiveRecommendation, setAdaptiveRecommendation] = useState<any>(null)

  const router = useRouter()
  const supabase = createClient()

  const startQuiz = async () => {
    setIsLoading(true)
    try {
      const { data: newSession, error } = await supabase
        .from("quiz_sessions")
        .insert({
          student_id: profile.id,
          subject_id: topic.subjects.id,
          topic_id: topic.id,
          current_difficulty: 3, // Start at medium difficulty
        })
        .select()
        .single()

      if (error) throw error

      setSession(newSession)
      setQuizStarted(true)
      await loadNextQuestion(newSession.current_difficulty)
    } catch (error) {
      console.error("Error starting quiz:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadNextQuestion = async (difficulty: number) => {
    try {
      const { data: questions, error } = await supabase
        .from("questions")
        .select("*")
        .eq("topic_id", topic.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      if (questions && questions.length > 0) {
        let selectedQuestion: Question

        if (recentPerformance.length > 0 && adaptiveRecommendation) {
          const questionMetrics = questions.map((q) => ({
            id: q.id,
            difficulty: q.difficulty_level,
            averageTime: 15,
            successRate: 0.5,
            discriminationIndex: 0.5,
          }))

          const optimalQuestionId = AdaptiveQuizEngine.selectOptimalQuestion(
            questionMetrics,
            adaptiveRecommendation.nextDifficulty,
            adaptiveRecommendation.questionSelectionStrategy,
            questionHistory,
          )

          selectedQuestion = questions.find((q) => q.id === optimalQuestionId) || questions[0]
        } else {
          const appropriateQuestions = questions.filter((q) => Math.abs(q.difficulty_level - difficulty) <= 1)
          selectedQuestion =
            appropriateQuestions.length > 0
              ? appropriateQuestions[Math.floor(Math.random() * appropriateQuestions.length)]
              : questions[Math.floor(Math.random() * questions.length)]
        }

        setCurrentQuestion(selectedQuestion)
        setQuestionHistory((prev) => [...prev, selectedQuestion.id])
        setSelectedAnswer("")
        setShowResult(false)
        setTimeStarted(Date.now())
      }
    } catch (error) {
      console.error("Error loading question:", error)
    }
  }

  const submitAnswer = async () => {
    if (!currentQuestion || !session || !selectedAnswer) return

    setIsLoading(true)
    const timeSpent = Math.floor((Date.now() - timeStarted) / 1000)
    const correct = selectedAnswer.toLowerCase().trim() === currentQuestion.correct_answer.toLowerCase().trim()

    setIsCorrect(correct)
    setShowResult(true)

    const newPerformance = [...recentPerformance.slice(-9), correct ? 1 : 0]
    setRecentPerformance(newPerformance)

    try {
      await supabase.from("quiz_responses").insert({
        session_id: session.id,
        question_id: currentQuestion.id,
        student_answer: selectedAnswer,
        is_correct: correct,
        time_taken_seconds: timeSpent,
        difficulty_at_time: session.current_difficulty,
      })

      const { data: progress } = await supabase
        .from("student_progress")
        .select("mastery_level")
        .eq("student_id", profile.id)
        .eq("topic_id", topic.id)
        .single()

      const currentMastery = progress?.mastery_level || 0

      const recommendation = AdaptiveQuizEngine.calculateNextDifficulty(
        session.current_difficulty,
        correct,
        timeSpent,
        newPerformance,
        currentMastery,
      )

      setAdaptiveRecommendation(recommendation)

      const newCorrectAnswers = session.correct_answers + (correct ? 1 : 0)
      const newQuestionsAnswered = session.questions_answered + 1

      const { data: updatedSession } = await supabase
        .from("quiz_sessions")
        .update({
          current_difficulty: recommendation.nextDifficulty,
          questions_answered: newQuestionsAnswered,
          correct_answers: newCorrectAnswers,
        })
        .eq("id", session.id)
        .select()
        .single()

      if (updatedSession) {
        setSession(updatedSession)
      }

      const consistencyScore = AdaptiveQuizEngine.calculateConsistencyScore(newPerformance)
      const newMasteryLevel = AdaptiveQuizEngine.calculateMasteryLevel(
        newCorrectAnswers,
        newQuestionsAnswered,
        session.current_difficulty,
        consistencyScore,
      )

      await supabase.rpc("update_student_progress", {
        p_student_id: profile.id,
        p_subject_id: topic.subjects.id,
        p_topic_id: topic.id,
        p_mastery_change: newMasteryLevel - currentMastery,
        p_questions_attempted: 1,
        p_questions_correct: correct ? 1 : 0,
      })

      console.log("[v0] Adaptive recommendation:", recommendation)
    } catch (error) {
      console.error("Error submitting answer:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const nextQuestion = async () => {
    if (!session) return
    await loadNextQuestion(session.current_difficulty)
  }

  const endQuiz = async () => {
    if (!session) return

    try {
      await supabase
        .from("quiz_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", session.id)

      router.push(`/quiz/results/${session.id}`)
    } catch (error) {
      console.error("Error ending quiz:", error)
    }
  }

  useEffect(() => {
    if (session && !currentQuestion) {
      loadNextQuestion(session.current_difficulty)
    }
  }, [session])

  if (!quizStarted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <Button variant="ghost" size="sm" asChild className="mb-4">
              <Link href={`/quiz/subject/${topic.subjects.id}`}>← Back to {topic.subjects.name}</Link>
            </Button>
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-xl">📝</span>
                  </div>
                  <div>
                    <CardTitle className="text-xl">{topic.name}</CardTitle>
                    <CardDescription>{topic.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <Badge variant="secondary">Level {topic.difficulty_level}</Badge>
                    <Badge variant="outline">Primary {profile.grade_level}</Badge>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      Adaptive AI
                    </Badge>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-900 mb-2">Adaptive Learning Features:</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Questions automatically adjust to your skill level</li>
                      <li>• AI analyzes your response patterns for optimal learning</li>
                      <li>• Personalized difficulty progression based on performance</li>
                      <li>• Smart question selection to maximize learning efficiency</li>
                    </ul>
                  </div>
                  <Button
                    onClick={startQuiz}
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
                  >
                    {isLoading ? "Starting Adaptive Quiz..." : "Start Adaptive Quiz"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading question...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-medium text-gray-900">{topic.name}</h1>
              <p className="text-sm text-gray-600">Question {session?.questions_answered + 1}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline">Level {session?.current_difficulty}</Badge>
              {adaptiveRecommendation && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                  AI: {adaptiveRecommendation.questionSelectionStrategy}
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={endQuiz}>
                End Quiz
              </Button>
            </div>
          </div>

          {session && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>
                  Accuracy:{" "}
                  {session.questions_answered > 0
                    ? Math.round((session.correct_answers / session.questions_answered) * 100)
                    : 0}
                  %
                </span>
                <span>
                  {session.correct_answers}/{session.questions_answered} correct
                </span>
              </div>
              <Progress
                value={
                  session.questions_answered > 0 ? (session.correct_answers / session.questions_answered) * 100 : 0
                }
                className="h-2"
              />
              {adaptiveRecommendation && (
                <div className="text-xs text-gray-500 mt-1">AI Insight: {adaptiveRecommendation.reasoning}</div>
              )}
            </div>
          )}
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-balance">{currentQuestion.question_text}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentQuestion.question_type === "multiple_choice" && currentQuestion.options && (
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                <div className="space-y-3">
                  {Object.entries(currentQuestion.options).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <RadioGroupItem value={value} id={key} />
                      <Label htmlFor={key} className="flex-1 cursor-pointer p-3 rounded-lg border hover:bg-gray-50">
                        <span className="font-medium text-blue-600 mr-2">{key}.</span>
                        {value}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}

            {currentQuestion.question_type === "true_false" && (
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="True" id="true" />
                    <Label htmlFor="true" className="flex-1 cursor-pointer p-3 rounded-lg border hover:bg-gray-50">
                      True
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="False" id="false" />
                    <Label htmlFor="false" className="flex-1 cursor-pointer p-3 rounded-lg border hover:bg-gray-50">
                      False
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            )}

            {currentQuestion.question_type === "fill_blank" && (
              <div className="space-y-2">
                <Label htmlFor="answer">Your Answer:</Label>
                <Input
                  id="answer"
                  value={selectedAnswer}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="text-lg p-4"
                />
              </div>
            )}

            {showResult && (
              <div
                className={`p-4 rounded-lg ${isCorrect ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`text-lg ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                    {isCorrect ? "✅" : "❌"}
                  </span>
                  <span className={`font-medium ${isCorrect ? "text-green-800" : "text-red-800"}`}>
                    {isCorrect ? "Correct!" : "Incorrect"}
                  </span>
                </div>
                {!isCorrect && (
                  <p className="text-sm text-red-700 mb-2">
                    The correct answer is: <strong>{currentQuestion.correct_answer}</strong>
                  </p>
                )}
                <p className="text-sm text-gray-700">{currentQuestion.explanation}</p>
              </div>
            )}

            <div className="flex space-x-3">
              {!showResult ? (
                <Button
                  onClick={submitAnswer}
                  disabled={!selectedAnswer || isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isLoading ? "Submitting..." : "Submit Answer"}
                </Button>
              ) : (
                <Button onClick={nextQuestion} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  Next Question
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
