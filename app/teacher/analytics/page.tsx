import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"

export default async function AnalyticsPage() {
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

  // Get student progress data
  const { data: studentProgress } = await supabase
    .from("student_progress")
    .select(`
      *,
      profiles:student_id(full_name, grade_level),
      subjects:subject_id(name),
      topics:topic_id(name)
    `)
    .order("last_practiced_at", { ascending: false })
    .limit(50)

  // Get quiz session statistics
  const { data: sessionStats } = await supabase
    .from("quiz_sessions")
    .select(`
      *,
      profiles:student_id(full_name, grade_level),
      subjects:subject_id(name)
    `)
    .order("started_at", { ascending: false })
    .limit(100)

  // Calculate class-wide statistics
  const totalSessions = sessionStats?.length || 0
  const completedSessions = sessionStats?.filter((s) => s.status === "completed").length || 0
  const averageAccuracy =
    sessionStats && sessionStats.length > 0
      ? Math.round(
          sessionStats
            .filter((s) => s.questions_answered > 0)
            .reduce((sum, s) => sum + (s.correct_answers / s.questions_answered) * 100, 0) /
            sessionStats.filter((s) => s.questions_answered > 0).length,
        )
      : 0

  // Get unique students
  const uniqueStudents = new Set(sessionStats?.map((s) => s.student_id)).size

  // Group progress by subject
  const progressBySubject = studentProgress?.reduce(
    (acc, progress) => {
      const subjectName = progress.subjects?.name || "Unknown"
      if (!acc[subjectName]) {
        acc[subjectName] = []
      }
      acc[subjectName].push(progress)
      return acc
    },
    {} as Record<string, typeof studentProgress>,
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/teacher">← Back to Dashboard</Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Student Analytics</h1>
              <p className="text-sm text-gray-600">Comprehensive learning analytics and insights</p>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href="/teacher/reports">Export Reports</Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Overview Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardDescription>Total Students</CardDescription>
              <CardTitle className="text-2xl text-blue-600">{uniqueStudents}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600">Active learners</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardDescription>Quiz Sessions</CardDescription>
              <CardTitle className="text-2xl text-green-600">{totalSessions}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600">{completedSessions} completed</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardDescription>Class Average</CardDescription>
              <CardTitle className="text-2xl text-purple-600">{averageAccuracy}%</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600">Overall accuracy</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-2">
              <CardDescription>Progress Entries</CardDescription>
              <CardTitle className="text-2xl text-orange-600">{studentProgress?.length || 0}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-600">Learning records</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Student Progress by Subject */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Progress by Subject</h2>
              <div className="space-y-6">
                {progressBySubject &&
                  Object.entries(progressBySubject).map(([subjectName, progresses]) => (
                    <Card key={subjectName} className="border-0 shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-lg">{subjectName}</CardTitle>
                        <CardDescription>{progresses.length} student progress records</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {progresses.slice(0, 5).map((progress) => (
                            <div key={progress.id} className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600 text-sm font-medium">
                                    {progress.profiles?.full_name?.charAt(0) || "S"}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{progress.profiles?.full_name}</p>
                                  <p className="text-sm text-gray-600">{progress.topics?.name}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline">P{progress.profiles?.grade_level}</Badge>
                                  <div className="text-sm font-medium text-green-600">
                                    {Math.round(progress.mastery_level * 100)}%
                                  </div>
                                </div>
                                <div className="w-24 mt-1">
                                  <Progress value={progress.mastery_level * 100} className="h-2" />
                                </div>
                              </div>
                            </div>
                          ))}
                          {progresses.length > 5 && (
                            <div className="text-center pt-2">
                              <Button variant="ghost" size="sm">
                                View all {progresses.length} records
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </section>

            {/* Recent Quiz Sessions */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Quiz Sessions</h2>
              <Card className="border-0 shadow-lg">
                <CardContent className="p-0">
                  {sessionStats && sessionStats.length > 0 ? (
                    <div className="divide-y">
                      {sessionStats.slice(0, 10).map((session) => (
                        <div key={session.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 text-sm font-medium">
                                  {session.profiles?.full_name?.charAt(0) || "S"}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{session.profiles?.full_name}</p>
                                <p className="text-sm text-gray-600">{session.subjects?.name}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">P{session.profiles?.grade_level}</Badge>
                                <Badge
                                  variant={session.status === "completed" ? "default" : "secondary"}
                                  className={
                                    session.status === "completed"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-yellow-100 text-yellow-700"
                                  }
                                >
                                  {session.status}
                                </Badge>
                                <div className="text-sm font-medium text-blue-600">
                                  {session.questions_answered > 0
                                    ? Math.round((session.correct_answers / session.questions_answered) * 100)
                                    : 0}
                                  %
                                </div>
                              </div>
                              <p className="text-xs text-gray-500">
                                {session.questions_answered} questions • {session.correct_answers} correct
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      <p>No quiz sessions found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Sidebar Analytics */}
          <div className="space-y-6">
            {/* Performance Distribution */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Performance Distribution</CardTitle>
                <CardDescription>Student accuracy ranges</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { range: "90-100%", color: "bg-green-600", count: 0 },
                  { range: "80-89%", color: "bg-blue-600", count: 0 },
                  { range: "70-79%", color: "bg-yellow-600", count: 0 },
                  { range: "60-69%", color: "bg-orange-600", count: 0 },
                  { range: "Below 60%", color: "bg-red-600", count: 0 },
                ].map((item) => (
                  <div key={item.range} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{item.range}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full`} style={{ width: "20%" }} />
                      </div>
                      <span className="text-sm font-medium">{item.count}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Top Performers</CardTitle>
                <CardDescription>Highest mastery levels</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {studentProgress
                  ?.sort((a, b) => b.mastery_level - a.mastery_level)
                  .slice(0, 5)
                  .map((progress, index) => (
                    <div key={progress.id} className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-yellow-600 text-xs font-bold">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{progress.profiles?.full_name}</p>
                        <p className="text-xs text-gray-600">{progress.topics?.name}</p>
                      </div>
                      <div className="text-sm font-medium text-green-600">
                        {Math.round(progress.mastery_level * 100)}%
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="ghost" size="sm" asChild className="w-full justify-start">
                  <Link href="/teacher/reports">Generate Report</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="w-full justify-start">
                  <Link href="/teacher/questions">Manage Questions</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="w-full justify-start">
                  <Link href="/teacher/topics">Manage Topics</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
