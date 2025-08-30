interface StudentPerformance {
  sessionId: string
  studentId: string
  topicId: string
  currentDifficulty: number
  questionsAnswered: number
  correctAnswers: number
  averageResponseTime: number
  recentAccuracy: number
  masteryLevel: number
}

interface QuestionMetrics {
  id: string
  difficulty: number
  averageTime: number
  successRate: number
  discriminationIndex: number
}

interface AdaptiveRecommendation {
  nextDifficulty: number
  questionSelectionStrategy: "random" | "targeted" | "review" | "challenge"
  confidenceLevel: number
  reasoning: string
}

export class AdaptiveQuizEngine {
  // Calculate next difficulty level based on comprehensive performance analysis
  static calculateNextDifficulty(
    currentDifficulty: number,
    isCorrect: boolean,
    responseTime: number,
    recentPerformance: number[],
    masteryLevel: number,
  ): AdaptiveRecommendation {
    let difficultyChange = 0
    let strategy: AdaptiveRecommendation["questionSelectionStrategy"] = "random"
    let confidence = 0.5
    let reasoning = ""

    // Base difficulty adjustment
    if (isCorrect) {
      // Quick correct answers suggest readiness for harder questions
      if (responseTime < 10) {
        difficultyChange = 1
        reasoning = "Quick correct answer - increasing difficulty"
      } else if (responseTime < 20) {
        difficultyChange = 0.5
        reasoning = "Correct answer at good pace - slight increase"
      } else {
        difficultyChange = 0.2
        reasoning = "Correct but slow - minimal increase"
      }
    } else {
      // Incorrect answers suggest need for easier questions
      if (responseTime < 5) {
        difficultyChange = -1.5
        reasoning = "Quick incorrect answer - significant decrease"
      } else if (responseTime > 30) {
        difficultyChange = -1
        reasoning = "Slow incorrect answer - decrease difficulty"
      } else {
        difficultyChange = -0.7
        reasoning = "Incorrect answer - moderate decrease"
      }
    }

    // Adjust based on recent performance trend
    const recentAccuracy =
      recentPerformance.length > 0
        ? recentPerformance.reduce((sum, val) => sum + val, 0) / recentPerformance.length
        : 0.5

    if (recentAccuracy > 0.8) {
      difficultyChange += 0.3
      strategy = "challenge"
      confidence = 0.8
      reasoning += " | Strong recent performance - challenging student"
    } else if (recentAccuracy < 0.4) {
      difficultyChange -= 0.5
      strategy = "review"
      confidence = 0.9
      reasoning += " | Weak recent performance - reviewing fundamentals"
    } else {
      strategy = "targeted"
      confidence = 0.6
    }

    // Consider mastery level
    if (masteryLevel > 0.8) {
      difficultyChange += 0.2
      reasoning += " | High mastery - pushing boundaries"
    } else if (masteryLevel < 0.3) {
      difficultyChange -= 0.3
      reasoning += " | Low mastery - building foundation"
    }

    // Apply bounds and calculate final difficulty
    const newDifficulty = Math.max(1, Math.min(5, currentDifficulty + difficultyChange))

    return {
      nextDifficulty: Math.round(newDifficulty * 10) / 10, // Round to 1 decimal
      questionSelectionStrategy: strategy,
      confidenceLevel: confidence,
      reasoning,
    }
  }

  // Select optimal question based on student profile and learning objectives
  static selectOptimalQuestion(
    availableQuestions: QuestionMetrics[],
    targetDifficulty: number,
    strategy: AdaptiveRecommendation["questionSelectionStrategy"],
    studentHistory: string[], // Previously answered question IDs
  ): string | null {
    // Filter out already answered questions
    const unAnsweredQuestions = availableQuestions.filter((q) => !studentHistory.includes(q.id))

    if (unAnsweredQuestions.length === 0) {
      return null
    }

    switch (strategy) {
      case "targeted":
        // Select questions close to target difficulty with good discrimination
        return this.selectTargetedQuestion(unAnsweredQuestions, targetDifficulty)

      case "challenge":
        // Select slightly harder questions to push student
        return this.selectChallengeQuestion(unAnsweredQuestions, targetDifficulty)

      case "review":
        // Select easier questions to build confidence
        return this.selectReviewQuestion(unAnsweredQuestions, targetDifficulty)

      default:
        // Random selection from appropriate difficulty range
        return this.selectRandomQuestion(unAnsweredQuestions, targetDifficulty)
    }
  }

  private static selectTargetedQuestion(questions: QuestionMetrics[], targetDifficulty: number): string {
    // Find questions within 0.5 difficulty points of target
    const targetQuestions = questions.filter((q) => Math.abs(q.difficulty - targetDifficulty) <= 0.5)

    if (targetQuestions.length === 0) {
      return questions[Math.floor(Math.random() * questions.length)].id
    }

    // Prefer questions with higher discrimination index (better at distinguishing ability)
    const sortedByDiscrimination = targetQuestions.sort((a, b) => b.discriminationIndex - a.discriminationIndex)
    return sortedByDiscrimination[0].id
  }

  private static selectChallengeQuestion(questions: QuestionMetrics[], targetDifficulty: number): string {
    // Select questions 0.5-1.0 points above target difficulty
    const challengeQuestions = questions.filter(
      (q) => q.difficulty > targetDifficulty && q.difficulty <= targetDifficulty + 1.0,
    )

    if (challengeQuestions.length === 0) {
      // Fall back to hardest available questions
      const sortedByDifficulty = questions.sort((a, b) => b.difficulty - a.difficulty)
      return sortedByDifficulty[0].id
    }

    return challengeQuestions[Math.floor(Math.random() * challengeQuestions.length)].id
  }

  private static selectReviewQuestion(questions: QuestionMetrics[], targetDifficulty: number): string {
    // Select questions 0.5-1.0 points below target difficulty
    const reviewQuestions = questions.filter(
      (q) => q.difficulty < targetDifficulty && q.difficulty >= targetDifficulty - 1.0,
    )

    if (reviewQuestions.length === 0) {
      // Fall back to easiest available questions
      const sortedByDifficulty = questions.sort((a, b) => a.difficulty - b.difficulty)
      return sortedByDifficulty[0].id
    }

    return reviewQuestions[Math.floor(Math.random() * reviewQuestions.length)].id
  }

  private static selectRandomQuestion(questions: QuestionMetrics[], targetDifficulty: number): string {
    // Select from questions within 1.0 difficulty point of target
    const appropriateQuestions = questions.filter((q) => Math.abs(q.difficulty - targetDifficulty) <= 1.0)

    if (appropriateQuestions.length === 0) {
      return questions[Math.floor(Math.random() * questions.length)].id
    }

    return appropriateQuestions[Math.floor(Math.random() * appropriateQuestions.length)].id
  }

  // Calculate mastery level based on performance patterns
  static calculateMasteryLevel(
    correctAnswers: number,
    totalQuestions: number,
    averageDifficulty: number,
    consistencyScore: number,
  ): number {
    if (totalQuestions === 0) return 0

    const accuracy = correctAnswers / totalQuestions

    // Base mastery from accuracy
    let mastery = accuracy

    // Adjust for difficulty level (harder questions = higher mastery)
    const difficultyBonus = (averageDifficulty - 3) * 0.1 // 3 is baseline difficulty
    mastery += difficultyBonus

    // Adjust for consistency (consistent performance = higher mastery)
    mastery *= consistencyScore

    // Apply learning curve (more questions = more reliable mastery estimate)
    const reliabilityFactor = Math.min(1, totalQuestions / 20) // Full reliability at 20+ questions
    mastery *= reliabilityFactor

    return Math.max(0, Math.min(1, mastery))
  }

  // Calculate consistency score based on performance variance
  static calculateConsistencyScore(recentPerformance: number[]): number {
    if (recentPerformance.length < 2) return 1

    const mean = recentPerformance.reduce((sum, val) => sum + val, 0) / recentPerformance.length
    const variance = recentPerformance.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentPerformance.length
    const standardDeviation = Math.sqrt(variance)

    // Convert standard deviation to consistency score (lower deviation = higher consistency)
    return Math.max(0.1, 1 - standardDeviation)
  }

  // Predict student performance for planning purposes
  static predictPerformance(
    currentMastery: number,
    targetDifficulty: number,
    questionsPlanned: number,
  ): {
    expectedAccuracy: number
    confidenceInterval: [number, number]
    recommendedSessionLength: number
  } {
    // Base prediction on mastery vs difficulty gap
    const difficultyGap = targetDifficulty - currentMastery * 5 // Convert mastery to 1-5 scale
    let expectedAccuracy = Math.max(0.1, Math.min(0.95, currentMastery - difficultyGap * 0.1))

    // Adjust for question quantity (fatigue effect)
    if (questionsPlanned > 15) {
      expectedAccuracy *= 0.95 // Slight decrease for longer sessions
    }

    // Calculate confidence interval (±10% typically)
    const margin = 0.1
    const confidenceInterval: [number, number] = [
      Math.max(0, expectedAccuracy - margin),
      Math.min(1, expectedAccuracy + margin),
    ]

    // Recommend session length based on mastery and difficulty
    let recommendedLength = 10 // Base session length
    if (currentMastery < 0.3) {
      recommendedLength = 8 // Shorter sessions for struggling students
    } else if (currentMastery > 0.8) {
      recommendedLength = 15 // Longer sessions for advanced students
    }

    return {
      expectedAccuracy,
      confidenceInterval,
      recommendedSessionLength: recommendedLength,
    }
  }

  // Analyze learning velocity and suggest interventions
  static analyzeLearningVelocity(
    masteryHistory: { date: string; mastery: number }[],
    timeframe = 7, // days
  ): {
    velocity: number
    trend: "improving" | "stable" | "declining"
    intervention: string | null
  } {
    if (masteryHistory.length < 2) {
      return { velocity: 0, trend: "stable", intervention: null }
    }

    // Calculate recent velocity (mastery change per day)
    const recent = masteryHistory.slice(-timeframe)
    const oldestRecent = recent[0]
    const newest = recent[recent.length - 1]

    const daysDiff = (new Date(newest.date).getTime() - new Date(oldestRecent.date).getTime()) / (1000 * 60 * 60 * 24)
    const masteryDiff = newest.mastery - oldestRecent.mastery

    const velocity = daysDiff > 0 ? masteryDiff / daysDiff : 0

    // Determine trend
    let trend: "improving" | "stable" | "declining"
    if (velocity > 0.02) trend = "improving"
    else if (velocity < -0.02) trend = "declining"
    else trend = "stable"

    // Suggest interventions
    let intervention: string | null = null
    if (trend === "declining") {
      intervention = "Consider reviewing fundamentals or reducing difficulty"
    } else if (trend === "stable" && newest.mastery > 0.8) {
      intervention = "Student ready for more challenging topics"
    } else if (trend === "stable" && newest.mastery < 0.4) {
      intervention = "May need additional support or different learning approach"
    }

    return { velocity, trend, intervention }
  }
}
