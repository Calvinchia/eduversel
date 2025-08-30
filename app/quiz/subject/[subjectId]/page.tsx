import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default async function SubjectQuizPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params
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

  // Get subject details
  const { data: subject } = await supabase.from("subjects").select("*").eq("id", subjectId).single()

  if (!subject) {
    redirect("/dashboard")
  }

  // Get topics for this subject and grade level
  const { data: topics } = await supabase
    .from("topics")
    .select("*")
    .eq("subject_id", subjectId)
    .eq("grade_level", profile.grade_level || 3)
    .order("difficulty_level", { ascending: true })

  // Get student progress for these topics
  const { data: progress } = await supabase
    .from("student_progress")
    .select("*")
    .eq("student_id", user.id)
    .eq("subject_id", subjectId)

  const progressMap = new Map(progress?.map((p) => [p.topic_id, p]) || [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">← Back</Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{subject.name}</h1>
              <p className="text-sm text-gray-600">Choose a topic to practice</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">Primary {profile.grade_level}</p>
            <p className="text-xs text-gray-600">{profile.full_name}</p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Subject Overview */}
          <Card className="mb-8 border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-4">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${
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
                  <span className="text-2xl">
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
                  <CardTitle className="text-2xl">{subject.name}</CardTitle>
                  <CardDescription className="text-base">{subject.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Topics Grid */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Available Topics</h2>

            {topics && topics.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {topics.map((topic) => {
                  const topicProgress = progressMap.get(topic.id)
                  const masteryLevel = topicProgress?.mastery_level || 0
                  const questionsAttempted = topicProgress?.questions_attempted || 0

                  return (
                    <Card key={topic.id} className="hover:shadow-lg transition-shadow border-0 shadow-md">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg mb-2">{topic.name}</CardTitle>
                            <CardDescription className="text-sm mb-3">{topic.description}</CardDescription>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="text-xs">
                                Level {topic.difficulty_level}
                              </Badge>
                              {masteryLevel > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(masteryLevel * 100)}% mastery
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          {questionsAttempted > 0 && (
                            <div className="text-sm text-gray-600">{questionsAttempted} questions attempted</div>
                          )}
                          <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                            <Link href={`/quiz/topic/${topic.id}`}>
                              {questionsAttempted > 0 ? "Continue Practice" : "Start Topic"}
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card className="border-0 shadow-md">
                <CardContent className="text-center py-12">
                  <div className="text-4xl mb-4">📚</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No topics available</h3>
                  <p className="text-gray-600">
                    Topics for Primary {profile.grade_level} {subject.name} are coming soon!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-8 flex justify-center">
            <Button variant="outline" asChild>
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
