import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default async function QuizResultsPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect("/auth/login")
  }

  // Get quiz session details
  const { data: session } = await supabase
    .from("quiz_sessions")
    .select(`
      *,
      subjects:subject_id(name),
      topics:topic_id(name, description)
    `)
    .eq("id", sessionId)
    .eq("student_id", user.id)
    .single()

  if (!session) {
    redirect("/dashboard")
  }

  // Get quiz responses for this session
  const { data: responses } = await supabase
    .from("quiz_responses")
    .select(`
      *,
      questions:question_id(question_text, correct_answer, explanation, difficulty_level)
    `)
    .eq("session_id", sessionId)
    .order("answered_at", { ascending: true })

  // Calculate statistics
  const totalQuestions = session.questions_answered
  const correctAnswers = session.correct_answers
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
  const averageTime =
    responses?.length > 0
      ? Math.round(responses.reduce((sum, r) => sum + r.time_taken_seconds, 0) / responses.length)
      : 0

  // Performance level based on accuracy
  const getPerformanceLevel = (acc: number) => {
    if (acc >= 90) return { level: "Excellent", color: "text-green-600", bg: "bg-green-100" }
    if (acc >= 80) return { level: "Good", color: "text-blue-600", bg: "bg-blue-100" }
    if (acc >= 70) return { level: "Fair", color: "text-yellow-600", bg: "bg-yellow-100" }
    return { level: "Needs Practice", color: "text-red-600", bg: "bg-red-100" }
  }

  const performance = getPerformanceLevel(accuracy)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">Q</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Quiz Results</h1>
              <p className="text-sm text-gray-600">
                {session.subjects?.name} - {session.topics?.name}
              </p>
            </div>
          </div>
          <Button asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Results Overview */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center">
              <div className={`w-20 h-20 ${performance.bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                <span className="text-3xl">
                  {accuracy >= 90 ? "🏆" : accuracy >= 80 ? "🎉" : accuracy >= 70 ? "👍" : "📚"}
                </span>
              </div>
              <CardTitle className="text-2xl">Quiz Complete!</CardTitle>
              <CardDescription>Here's how you performed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-blue-600 mb-2">{accuracy}%</div>
                  <p className="text-sm text-gray-600">Accuracy</p>
                  <Badge className={`mt-2 ${performance.bg} ${performance.color} border-0`}>{performance.level}</Badge>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {correctAnswers}/{totalQuestions}
                  </div>
                  <p className="text-sm text-gray-600">Questions Correct</p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-600 mb-2">{averageTime}s</div>
                  <p className="text-sm text-gray-600">Avg. Time per Question</p>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Overall Progress</span>
                  <span>
                    {correctAnswers} of {totalQuestions} correct
                  </span>
                </div>
                <Progress value={accuracy} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results */}
          {responses && responses.length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Question by Question Review</CardTitle>
                <CardDescription>Review your answers and learn from mistakes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {responses.map((response, index) => (
                    <div
                      key={response.id}
                      className={`p-4 rounded-lg border ${
                        response.is_correct ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-medium text-gray-900">Question {index + 1}</span>
                            <Badge variant="outline" className="text-xs">
                              Level {response.difficulty_at_time}
                            </Badge>
                            <span className={`text-sm ${response.is_correct ? "text-green-600" : "text-red-600"}`}>
                              {response.is_correct ? "✅ Correct" : "❌ Incorrect"}
                            </span>
                          </div>
                          <p className="text-gray-800 mb-2">{response.questions?.question_text}</p>
                        </div>
                        <div className="text-right text-sm text-gray-600">{response.time_taken_seconds}s</div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Your answer: </span>
                          <span className={response.is_correct ? "text-green-700" : "text-red-700"}>
                            {response.student_answer}
                          </span>
                        </div>

                        {!response.is_correct && (
                          <div>
                            <span className="font-medium text-gray-700">Correct answer: </span>
                            <span className="text-green-700">{response.questions?.correct_answer}</span>
                          </div>
                        )}

                        {response.questions?.explanation && (
                          <div className="mt-2 p-3 bg-blue-50 rounded border border-blue-200">
                            <span className="font-medium text-blue-800">Explanation: </span>
                            <span className="text-blue-700">{response.questions.explanation}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Steps */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">What's Next?</CardTitle>
              <CardDescription>Continue your learning journey</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <Button asChild className="h-12 bg-blue-600 hover:bg-blue-700">
                  <Link href={`/quiz/topic/${session.topic_id}`}>Practice More Questions</Link>
                </Button>
                <Button asChild variant="outline" className="h-12 bg-transparent">
                  <Link href={`/quiz/subject/${session.subject_id}`}>Try Different Topic</Link>
                </Button>
              </div>

              {accuracy < 80 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-yellow-600">💡</span>
                    <span className="font-medium text-yellow-800">Study Tip</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Consider reviewing the explanations above and practicing more questions on this topic to improve
                    your understanding.
                  </p>
                </div>
              )}

              {accuracy >= 90 && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-green-600">🌟</span>
                    <span className="font-medium text-green-800">Excellent Work!</span>
                  </div>
                  <p className="text-sm text-green-700">
                    You've mastered this topic! Try exploring more challenging topics or help your classmates.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
