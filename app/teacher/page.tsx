import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default async function TeacherDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) {
    redirect("/auth/login")
  }

  // Get teacher profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile || profile.role !== "teacher") {
    redirect("/dashboard")
  }

  // Get subjects
  const { data: subjects } = await supabase.from("subjects").select("*").order("name")

  // Get recent student activity
  const { data: recentSessions } = await supabase
    .from("quiz_sessions")
    .select(`
      *,
      profiles:student_id(full_name, grade_level),
      subjects:subject_id(name),
      topics:topic_id(name)
    `)
    .order("started_at", { ascending: false })
    .limit(10)

  // Get question statistics
  const { data: questionStats } = await supabase.from("questions").select("id, topic_id, difficulty_level")

  const totalQuestions = questionStats?.length || 0
  const questionsByDifficulty = questionStats?.reduce(
    (acc, q) => {
      acc[q.difficulty_level] = (acc[q.difficulty_level] || 0) + 1
      return acc
    },
    {} as Record<number, number>,
  )

  // Get active students count
  const { data: activeStudents } = await supabase
    .from("quiz_sessions")
    .select("student_id")
    .gte("started_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

  const uniqueActiveStudents = new Set(activeStudents?.map((s) => s.student_id)).size

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">T</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Teacher Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {profile.full_name}!</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="bg-purple-50 text-purple-700">
              Teacher
            </Badge>
            <form action="/auth/signout" method="post">
              <Button variant="outline" size="sm">
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Stats Overview */}
          <div className="lg:col-span-4">
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardDescription>Total Questions</CardDescription>
                  <CardTitle className="text-2xl text-blue-600">{totalQuestions}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-600">Across all subjects</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardDescription>Active Students</CardDescription>
                  <CardTitle className="text-2xl text-green-600">{uniqueActiveStudents}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-600">This week</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardDescription>Subjects</CardDescription>
                  <CardTitle className="text-2xl text-purple-600">{subjects?.length || 0}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-600">Available subjects</p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <CardDescription>Recent Sessions</CardDescription>
                  <CardTitle className="text-2xl text-orange-600">{recentSessions?.length || 0}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-600">Latest activity</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Quick Actions */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="hover:shadow-lg transition-shadow border-0 shadow-md">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-lg">📝</span>
                      </div>
                      <div>
                        <CardTitle className="text-lg">Manage Questions</CardTitle>
                        <CardDescription>Add, edit, and organize quiz questions</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                      <Link href="/teacher/questions">Manage Questions</Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow border-0 shadow-md">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-lg">📊</span>
                      </div>
                      <div>
                        <CardTitle className="text-lg">Student Analytics</CardTitle>
                        <CardDescription>View detailed student progress and performance</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                      <Link href="/teacher/analytics">View Analytics</Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow border-0 shadow-md">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 text-lg">📚</span>
                      </div>
                      <div>
                        <CardTitle className="text-lg">Manage Topics</CardTitle>
                        <CardDescription>Organize subjects and topics</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full bg-purple-600 hover:bg-purple-700">
                      <Link href="/teacher/topics">Manage Topics</Link>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow border-0 shadow-md">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 text-lg">🎯</span>
                      </div>
                      <div>
                        <CardTitle className="text-lg">Class Reports</CardTitle>
                        <CardDescription>Generate comprehensive class reports</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full bg-orange-600 hover:bg-orange-700">
                      <Link href="/teacher/reports">View Reports</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Recent Student Activity */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Student Activity</h2>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-0">
                  {recentSessions && recentSessions.length > 0 ? (
                    <div className="divide-y">
                      {recentSessions.slice(0, 8).map((session) => (
                        <div key={session.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600 text-sm font-medium">
                                    {session.profiles?.full_name?.charAt(0) || "S"}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{session.profiles?.full_name}</p>
                                  <p className="text-sm text-gray-600">
                                    {session.subjects?.name} - {session.topics?.name}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">P{session.profiles?.grade_level}</Badge>
                                <div className="text-sm font-medium text-blue-600">
                                  {session.questions_answered > 0
                                    ? Math.round((session.correct_answers / session.questions_answered) * 100)
                                    : 0}
                                  %
                                </div>
                              </div>
                              <p className="text-xs text-gray-500">
                                {new Date(session.started_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <p>No recent student activity</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Question Distribution */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Question Distribution</CardTitle>
                <CardDescription>By difficulty level</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div key={level} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Level {level}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{
                            width: `${totalQuestions > 0 ? ((questionsByDifficulty?.[level] || 0) / totalQuestions) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium">{questionsByDifficulty?.[level] || 0}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Subjects Overview */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Subjects</CardTitle>
                <CardDescription>Available subjects</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {subjects?.map((subject) => (
                  <div key={subject.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                    <span className="text-sm font-medium">{subject.name}</span>
                    <Badge variant="outline" className="text-xs">
                      P{subject.grade_levels?.join(", P") || "1-6"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" size="sm" asChild className="w-full justify-start">
                  <Link href="/teacher/questions/new">Add New Question</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="w-full justify-start">
                  <Link href="/teacher/analytics">Student Progress</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="w-full justify-start">
                  <Link href="/teacher/reports">Export Reports</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="w-full justify-start">
                  <Link href="/dashboard">Student View</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
