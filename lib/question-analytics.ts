import { createClient } from "@/lib/supabase/server"

export class QuestionAnalytics {
  // Calculate question difficulty based on student responses
  static async calculateQuestionDifficulty(questionId: string): Promise<number> {
    const supabase = await createClient()

    const { data: responses } = await supabase
      .from("quiz_responses")
      .select("is_correct, difficulty_at_time")
      .eq("question_id", questionId)

    if (!responses || responses.length < 5) {
      return 3 // Default difficulty if insufficient data
    }

    const correctRate = responses.filter((r) => r.is_correct).length / responses.length

    // Convert success rate to difficulty (lower success = higher difficulty)
    // 90% success = difficulty 1, 50% success = difficulty 3, 10% success = difficulty 5
    const calculatedDifficulty = 6 - correctRate * 5

    return Math.max(1, Math.min(5, Math.round(calculatedDifficulty * 10) / 10))
  }

  // Calculate discrimination index (how well question distinguishes between high/low performers)
  static async calculateDiscriminationIndex(questionId: string): Promise<number> {
    const supabase = await createClient()

    // Get responses with student performance context
    const { data: responses } = await supabase
      .from("quiz_responses")
      .select(`
        is_correct,
        quiz_sessions!inner(
          student_id,
          correct_answers,
          questions_answered
        )
      `)
      .eq("question_id", questionId)

    if (!responses || responses.length < 10) {
      return 0.5 // Default discrimination if insufficient data
    }

    // Calculate each student's overall performance
    const studentPerformance = responses.map((r) => ({
      isCorrect: r.is_correct,
      overallAccuracy:
        r.quiz_sessions.questions_answered > 0
          ? r.quiz_sessions.correct_answers / r.quiz_sessions.questions_answered
          : 0,
    }))

    // Split into high and low performers
    const sorted = studentPerformance.sort((a, b) => b.overallAccuracy - a.overallAccuracy)
    const topThird = sorted.slice(0, Math.floor(sorted.length / 3))
    const bottomThird = sorted.slice(-Math.floor(sorted.length / 3))

    // Calculate success rates for each group
    const topSuccessRate = topThird.filter((s) => s.isCorrect).length / topThird.length
    const bottomSuccessRate = bottomThird.filter((s) => s.isCorrect).length / bottomThird.length

    // Discrimination index is the difference
    return Math.max(0, Math.min(1, topSuccessRate - bottomSuccessRate))
  }

  // Get comprehensive question metrics for adaptive selection
  static async getQuestionMetrics(topicId: string): Promise<
    Array<{
      id: string
      difficulty: number
      averageTime: number
      successRate: number
      discriminationIndex: number
    }>
  > {
    const supabase = await createClient()

    const { data: questions } = await supabase
      .from("questions")
      .select(`
        id,
        difficulty_level,
        quiz_responses(
          is_correct,
          time_taken_seconds
        )
      `)
      .eq("topic_id", topicId)

    if (!questions) return []

    const metrics = await Promise.all(
      questions.map(async (question) => {
        const responses = question.quiz_responses || []

        // Calculate metrics
        const successRate = responses.length > 0 ? responses.filter((r) => r.is_correct).length / responses.length : 0.5

        const averageTime =
          responses.length > 0 ? responses.reduce((sum, r) => sum + r.time_taken_seconds, 0) / responses.length : 15

        const discriminationIndex = await this.calculateDiscriminationIndex(question.id)
        const calculatedDifficulty = await this.calculateQuestionDifficulty(question.id)

        return {
          id: question.id,
          difficulty: calculatedDifficulty,
          averageTime,
          successRate,
          discriminationIndex,
        }
      }),
    )

    return metrics
  }

  // Update question difficulty based on new response data
  static async updateQuestionDifficulty(questionId: string): Promise<void> {
    const newDifficulty = await this.calculateQuestionDifficulty(questionId)
    const supabase = await createClient()

    await supabase.from("questions").update({ difficulty_level: newDifficulty }).eq("id", questionId)
  }
}
