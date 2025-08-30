import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Trophy, Target, TrendingUp, Calendar, Award } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ProgressPage() {
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Get user profile and progress data
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  const { data: progressData } = await supabase.rpc("get_student_progress", { student_id: user.id })

  const { data: achievements } = await supabase
    .from("student_achievements")
    .select(`
      *,
      achievement_types (
        name,
        description,
        icon,
        points
      )
    `)
    .eq("student_id", user.id)
    .order("earned_at", { ascending: false })

  const { data: recentSessions } = await supabase
    .from("quiz_sessions")
    .select(`
      *,
      topics (
        name,
        subjects (name)
      )
    `)
    .eq("student_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(5)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">My Learning Progress</h1>
          <p className="text-muted-foreground">Track your learning journey and achievements</p>
        </div>
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          <span className="text-2xl font-bold">{progressData?.total_points || 0}</span>
          <span className="text-sm text-muted-foreground">points</span>
        </div>
      </div>

      {/* Overall Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quizzes Completed</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressData?.total_quizzes || 0}</div>
            <p className="text-xs text-muted-foreground">+{progressData?.quizzes_this_week || 0} this week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(progressData?.average_score || 0)}%</div>
            <p className="text-xs text-muted-foreground">
              {progressData?.score_trend > 0 ? "+" : ""}
              {Math.round(progressData?.score_trend || 0)}% from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Streak</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressData?.current_streak || 0}</div>
            <p className="text-xs text-muted-foreground">days in a row</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Achievements</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{achievements?.length || 0}</div>
            <p className="text-xs text-muted-foreground">badges earned</p>
          </CardContent>
        </Card>
      </div>

      {/* Subject Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Subject Mastery</CardTitle>
          <CardDescription>Your progress across different subjects</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {progressData?.subject_progress?.map((subject: any) => (
            <div key={subject.subject_id} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">{subject.subject_name}</span>
                <span className="text-sm text-muted-foreground">{Math.round(subject.mastery_level)}% mastery</span>
              </div>
              <Progress value={subject.mastery_level} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {subject.topics_completed} of {subject.total_topics} topics
                </span>
                <span>{subject.questions_answered} questions answered</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent Achievements */}
      {achievements && achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Achievements</CardTitle>
            <CardDescription>Your latest badges and milestones</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.slice(0, 6).map((achievement: any) => (
                <div key={achievement.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="text-2xl">{achievement.achievement_types.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-medium">{achievement.achievement_types.name}</h4>
                    <p className="text-sm text-muted-foreground">{achievement.achievement_types.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">+{achievement.achievement_types.points} points</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(achievement.earned_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Quiz Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Quiz Sessions</CardTitle>
          <CardDescription>Your latest quiz attempts and scores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentSessions?.map((session: any) => (
              <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">
                    {session.topics.subjects.name} - {session.topics.name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {session.questions_answered} questions • {new Date(session.completed_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{Math.round(session.score)}%</div>
                  <Badge variant={session.score >= 80 ? "default" : session.score >= 60 ? "secondary" : "destructive"}>
                    {session.score >= 80 ? "Excellent" : session.score >= 60 ? "Good" : "Needs Practice"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
