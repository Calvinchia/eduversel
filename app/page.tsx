import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">Q</span>
            </div>
            <span className="text-xl font-bold text-gray-900">QuizSG</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link href="/auth/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 text-balance">
            Smart Learning for
            <span className="text-blue-600"> Singapore Students</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 text-pretty max-w-2xl mx-auto">
            An adaptive quiz system designed for Primary 1-6 students following the Singapore MOE curriculum. Learn at
            your own pace with personalized difficulty adjustment.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3">
              <Link href="/auth/signup">Start Learning Free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8 py-3 bg-transparent">
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose QuizSG?</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Built specifically for Singapore's education system with features that adapt to each student's learning
            needs.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 text-xl">🎯</span>
              </div>
              <CardTitle className="text-xl">Adaptive Learning</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Questions automatically adjust to your skill level, ensuring optimal challenge and learning progression.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 text-xl">📚</span>
              </div>
              <CardTitle className="text-xl">MOE Curriculum</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Aligned with Singapore's Ministry of Education curriculum for Primary 1-6 across all major subjects.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-purple-600 text-xl">📊</span>
              </div>
              <CardTitle className="text-xl">Progress Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Detailed analytics help students and teachers track learning progress and identify areas for
                improvement.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Subjects Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Subjects Available</h2>
            <p className="text-gray-600">Comprehensive coverage of Singapore primary school subjects</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-4xl mx-auto">
            {[
              { name: "English", icon: "📝", color: "bg-red-100 text-red-600" },
              { name: "Mathematics", icon: "🔢", color: "bg-blue-100 text-blue-600" },
              { name: "Science", icon: "🔬", color: "bg-green-100 text-green-600" },
              { name: "Mother Tongue", icon: "🗣️", color: "bg-yellow-100 text-yellow-600" },
              { name: "Social Studies", icon: "🌍", color: "bg-purple-100 text-purple-600" },
            ].map((subject) => (
              <div key={subject.name} className="text-center p-4">
                <div
                  className={`w-16 h-16 ${subject.color} rounded-full flex items-center justify-center mx-auto mb-3`}
                >
                  <span className="text-2xl">{subject.icon}</span>
                </div>
                <h3 className="font-medium text-gray-900">{subject.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Start Learning?</h2>
          <p className="text-gray-600 mb-8">
            Join thousands of Singapore students already improving their grades with QuizSG.
          </p>
          <Button size="lg" asChild className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3">
            <Link href="/auth/signup">Create Free Account</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">Q</span>
            </div>
            <span className="font-bold">QuizSG</span>
          </div>
          <p className="text-gray-400 text-sm">© 2024 QuizSG. Designed for Singapore primary school students.</p>
        </div>
      </footer>
    </div>
  )
}
