import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default async function QuestionsManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; topic?: string; difficulty?: string; search?: string }>
}) {
  const params = await searchParams
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

  // Build query for questions
  let questionsQuery = supabase.from("questions").select(`
    *,
    topics:topic_id(
      name,
      subjects:subject_id(name)
    )
  `)

  // Apply filters
  if (params.search) {
    questionsQuery = questionsQuery.ilike("question_text", `%${params.search}%`)
  }

  if (params.difficulty) {
    questionsQuery = questionsQuery.eq("difficulty_level", Number.parseInt(params.difficulty))
  }

  const { data: questions } = await questionsQuery.order("created_at", { ascending: false }).limit(50)

  // Get subjects and topics for filters
  const { data: subjects } = await supabase.from("subjects").select("*").order("name")
  const { data: topics } = await supabase.from("topics").select("*").order("name")

  // Get question statistics
  const { data: questionStats } = await supabase.rpc("get_question_statistics")

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
              <h1 className="text-xl font-bold text-gray-900">Question Management</h1>
              <p className="text-sm text-gray-600">Manage quiz questions and content</p>
            </div>
          </div>
          <Button asChild className="bg-purple-600 hover:bg-purple-700">
            <Link href="/teacher/questions/new">Add New Question</Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Search Questions</label>
                  <Input placeholder="Search question text..." defaultValue={params.search} />
                </div>

                {/* Subject Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Subject</label>
                  <select className="w-full p-2 border rounded-md" defaultValue={params.subject}>
                    <option value="">All Subjects</option>
                    {subjects?.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Difficulty Filter */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Difficulty</label>
                  <select className="w-full p-2 border rounded-md" defaultValue={params.difficulty}>
                    <option value="">All Levels</option>
                    <option value="1">Level 1 (Easy)</option>
                    <option value="2">Level 2</option>
                    <option value="3">Level 3 (Medium)</option>
                    <option value="4">Level 4</option>
                    <option value="5">Level 5 (Hard)</option>
                  </select>
                </div>

                <Button className="w-full">Apply Filters</Button>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Question Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Questions</span>
                  <span className="font-medium">{questions?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Multiple Choice</span>
                  <span className="font-medium">
                    {questions?.filter((q) => q.question_type === "multiple_choice").length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">True/False</span>
                  <span className="font-medium">
                    {questions?.filter((q) => q.question_type === "true_false").length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Fill in Blank</span>
                  <span className="font-medium">
                    {questions?.filter((q) => q.question_type === "fill_blank").length || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Questions List */}
          <div className="lg:col-span-3">
            <div className="space-y-4">
              {questions && questions.length > 0 ? (
                questions.map((question) => (
                  <Card key={question.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2 text-balance">{question.question_text}</CardTitle>
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant="outline">{question.topics?.subjects?.name}</Badge>
                            <Badge variant="outline">{question.topics?.name}</Badge>
                            <Badge
                              variant="secondary"
                              className={
                                question.difficulty_level <= 2
                                  ? "bg-green-100 text-green-700"
                                  : question.difficulty_level <= 3
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                              }
                            >
                              Level {question.difficulty_level}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {question.question_type.replace("_", " ")}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/teacher/questions/${question.id}/edit`}>Edit</Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 bg-transparent"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* Show options for multiple choice */}
                      {question.question_type === "multiple_choice" && question.options && (
                        <div className="space-y-1 mb-3">
                          {Object.entries(question.options).map(([key, value]) => (
                            <div
                              key={key}
                              className={`text-sm p-2 rounded ${
                                value === question.correct_answer ? "bg-green-50 text-green-700" : "text-gray-600"
                              }`}
                            >
                              <span className="font-medium">{key}.</span> {value}
                              {value === question.correct_answer && <span className="ml-2 text-green-600">✓</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Show correct answer for other types */}
                      {question.question_type !== "multiple_choice" && (
                        <div className="mb-3">
                          <span className="text-sm text-gray-600">Correct Answer: </span>
                          <span className="text-sm font-medium text-green-700">{question.correct_answer}</span>
                        </div>
                      )}

                      {/* Explanation */}
                      {question.explanation && (
                        <div className="bg-blue-50 p-3 rounded border border-blue-200">
                          <span className="text-sm font-medium text-blue-800">Explanation: </span>
                          <span className="text-sm text-blue-700">{question.explanation}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="border-0 shadow-md">
                  <CardContent className="text-center py-12">
                    <div className="text-4xl mb-4">📝</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No questions found</h3>
                    <p className="text-gray-600 mb-4">Start by creating your first question</p>
                    <Button asChild className="bg-purple-600 hover:bg-purple-700">
                      <Link href="/teacher/questions/new">Add New Question</Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Pagination */}
            {questions && questions.length >= 50 && (
              <div className="mt-8 flex justify-center">
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">Page 1 of 1</span>
                  <Button variant="outline" size="sm">
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
