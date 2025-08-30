import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import QuizInterface from "@/components/quiz-interface"

export default async function TopicQuizPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params
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

  // Get topic details with subject
  const { data: topic } = await supabase
    .from("topics")
    .select(`
      *,
      subjects:subject_id(*)
    `)
    .eq("id", topicId)
    .single()

  if (!topic) {
    redirect("/dashboard")
  }

  // Check if there's an active quiz session for this topic
  const { data: activeSession } = await supabase
    .from("quiz_sessions")
    .select("*")
    .eq("student_id", user.id)
    .eq("topic_id", topicId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .single()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <QuizInterface topic={topic} profile={profile} activeSession={activeSession} />
    </div>
  )
}
