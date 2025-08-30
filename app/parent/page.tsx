import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, Mail } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ParentDashboard() {
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  // Get children linked to this parent account
  const { data: children } = await supabase
    .from("parent_child_links")
    .select(`
      child_id,
      profiles!parent_child_links_child_id_fkey (
        id,
        full_name,
        grade_level
      )
    `)
    .eq("parent_id", user.id)

  // Get progress data for each child
  const childrenProgress = await Promise.all(
    children?.map(async (child: any) => {
      const { data: progress } = await supabase.rpc("get_student_progress", { student_id: child.child_id })

      const { data: recentAchievements } = await supabase
        .from("student_achievements")
        .select(`
          *,
          achievement_types (name, icon, points)
        `)
        .eq("student_id", child.child_id)
        .order("earned_at", { ascending: false })
        .limit(3)

      return {
        ...child.profiles,
        progress,
        recentAchievements,
      }
    }) || [],
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">Parent Dashboard</h1>
          <p className="text-muted-foreground">Monitor your children's learning progress</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4 mr-2" />
            Email Summary
          </Button>
        </div>
      </div>

      {/* Children Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {childrenProgress.map((child: any) => (
          <Card key={child.id} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{child.full_name}</CardTitle>
                <Badge variant="secondary">Grade {child.grade_level}</Badge>
              </div>
              <CardDescription>Learning Progress Overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Overall Stats */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(child.progress?.average_score || 0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Score</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{child.progress?.current_streak || 0}</div>
                  <div className="text-xs text-muted-foreground">Day Streak</div>
                </div>
              </div>

              {/* Subject Progress */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Subject Mastery</h4>
                {child.progress?.subject_progress?.slice(0, 3).map((subject: any) => (
                  <div key={subject.subject_id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{subject.subject_name}</span>
                      <span>{Math.round(subject.mastery_level)}%</span>
                    </div>
                    <Progress value={subject.mastery_level} className="h-1" />
                  </div>
                ))}
              </div>

              {/* Recent Achievements */}
              {child.recentAchievements && child.recentAchievements.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Recent Achievements</h4>
                  <div className="flex gap-1 flex-wrap">
                    {child.recentAchievements.map((achievement: any) => (
                      <div key={achievement.id} className="text-lg" title={achievement.achievement_types.name}>
                        {achievement.achievement_types.icon}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button className="w-full" size="sm">
                View Detailed Report
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weekly Summary */}
      <Card>
        <CardHeader>
          <CardTitle>This Week's Summary</CardTitle>
          <CardDescription>Combined progress across all children</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {childrenProgress.reduce((sum, child) => sum + (child.progress?.quizzes_this_week || 0), 0)}
              </div>
              <div className="text-sm text-muted-foreground">Quizzes Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Math.round(
                  childrenProgress.reduce((sum, child) => sum + (child.progress?.average_score || 0), 0) /
                    childrenProgress.length,
                )}
                %
              </div>
              <div className="text-sm text-muted-foreground">Average Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Math.max(...childrenProgress.map((child) => child.progress?.current_streak || 0))}
              </div>
              <div className="text-sm text-muted-foreground">Best Streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {childrenProgress.reduce((sum, child) => sum + (child.recentAchievements?.length || 0), 0)}
              </div>
              <div className="text-sm text-muted-foreground">New Achievements</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
