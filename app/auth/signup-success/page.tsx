import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-green-600 text-2xl">✉️</span>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Check Your Email!</CardTitle>
            <CardDescription className="text-gray-600">We've sent you a confirmation link</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-gray-600 mb-6">
              Please check your email and click the confirmation link to activate your account. Once confirmed, you can
              sign in and start your learning journey!
            </p>
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
              <Link href="/auth/login">Back to Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
