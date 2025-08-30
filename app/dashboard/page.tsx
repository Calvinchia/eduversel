import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile) {
    redirect("/auth/login")
  }

  // Get subjects available for the student's grade level
  const { data: subjects } = await supabase
    .from("subjects")
    .select("*")
    .contains("grade_levels", [profile.grade_level || 3])

  // Get recent progress for the student
  const { data: recentProgress } = await supabase
    .from("student_progress")
    .select(`
      *,
      subjects:subject_id(name),
      topics:topic_id(name)
    `)
    .eq("student_id", user.id)
    .order("last_practiced_at", { ascending: false })
    .limit(5)

  // Get recent quiz sessions
  const { data: recentSessions } = await supabase
    .from("quiz_sessions")
    .select(`
      *,
      subjects:subject_id(name)
    `)
    .eq("student_id", user.id)
    .order("started_at", { ascending: false })
    .limit(3)

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
              <h1 className="text-xl font-bold text-gray-900">QuizSG</h1>
              <p className="text-sm text-gray-600">Welcome back, {profile.full_name}!</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">Primary {profile.grade_level}</p>
              <p className="text-xs text-gray-600">{profile.school_name || "Student"}</p>
            </div>
            <form action="/auth/signout" method="post">
              <Button variant="outline" size="sm">
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Quick Start Section */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Choose a Subject to Practice</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {subjects?.map((subject) => (
                  <Card
                    key={subject.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer border-0 shadow-md"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            subject.name === "Mathematics"
                              ? "bg-blue-100 text-blue-600"
                              : subject.name === "English Language"
                                ? "bg-red-100 text-red-600"
                                : subject.name === "Science"
                                  ? "bg-green-100 text-green-600"
                                  : subject.name === "Mother Tongue"
                                    ? "bg-yellow-100 text-yellow-600"
                                    : "bg-purple-100 text-purple-600"
                          }`}
                        >
                          <span className="text-xl">
                            {subject.name === "Mathematics"
                              ? "🔢"
                              : subject.name === "English Language"
                                ? "📝"
                                : subject.name === "Science"
                                  ? "🔬"
                                  : subject.name === "Mother Tongue"
                                    ? "🗣️"
                                    : "🌍"}
                          </span>
                        </div>
                        <div>
                          <CardTitle className="text-lg">{subject.name}</CardTitle>
                          <CardDescription className="text-sm">{subject.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                        <Link href={`/quiz/subject/${subject.id}`}>Start Quiz</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Recent Sessions */}
            {recentSessions && recentSessions.length > 0 && (
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Quiz Sessions</h2>
                <div className="space-y-3">
                  {recentSessions.map((session) => (
                    <Card key={session.id} className="border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{session.subjects?.name}</h3>
                            <p className="text-sm text-gray-600">
                              {session.questions_answered} questions • {session.correct_answers} correct
                            </p>
                            <p className="text-xs text-gray-500">{new Date(session.started_at).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-blue-600">
                              {session.questions_answered > 0
                                ? Math.round((session.correct_answers / session.questions_answered) * 100)
                                : 0}
                              %
                            </div>
                            <div
                              className={`text-xs px-2 py-1 rounded-full ${
                                session.status === "completed"
                                  ? "bg-green-100 text-green-700"
                                  : session.status === "active"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {session.status}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress Overview */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Your Progress</CardTitle>
                <CardDescription>Keep up the great work!</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentProgress && recentProgress.length > 0 ? (
                  recentProgress.slice(0, 3).map((progress) => (
                    <div key={progress.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{progress.topics?.name}</span>
                        <span className="text-gray-600">{Math.round(progress.mastery_level * 100)}%</span>
                      </div>
                      <Progress value={progress.mastery_level * 100} className="h-2" />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">Start a quiz to see your progress!</p>
                )}
              </CardContent>
            </Card>

            {/* Study Streak */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Study Streak</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-2">🔥</div>
                  <div className="text-2xl font-bold text-gray-900">0 days</div>
                  <p className="text-sm text-gray-600">Complete a quiz to start your streak!</p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Questions</span>
                  <span className="font-medium">
                    {recentSessions?.reduce((sum, session) => sum + session.questions_answered, 0) || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Correct Answers</span>
                  <span className="font-medium text-green-600">
                    {recentSessions?.reduce((sum, session) => sum + session.correct_answers, 0) || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Average Score</span>
                  <span className="font-medium text-blue-600">
                    {recentSessions && recentSessions.length > 0
                      ? Math.round(
                          recentSessions.reduce(
                            (sum, session) =>
                              sum +
                              (session.questions_answered > 0
                                ? (session.correct_answers / session.questions_answered) * 100
                                : 0),
                            0,
                          ) / recentSessions.length,
                        )
                      : 0}
                    %
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
