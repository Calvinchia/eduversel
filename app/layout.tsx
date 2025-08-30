import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { ThemeProvider } from "next-themes"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "v0 App",
  description: "Created with v0",
  generator: "v0.app",
}

const geistSans = GeistSans
const geistMono = GeistMono

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <Suspense fallback={<div>Loading...</div>}>
            <div className="min-h-screen bg-background">
              <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 h-14 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <h1 className="font-bold text-xl">QuizSG</h1>
                    <div className="hidden md:flex items-center gap-4">
                      <a href="/dashboard" className="text-sm hover:text-primary">
                        Dashboard
                      </a>
                      <a href="/progress" className="text-sm hover:text-primary">
                        Progress
                      </a>
                      <a href="/teacher" className="text-sm hover:text-primary">
                        Teacher
                      </a>
                      <a href="/parent" className="text-sm hover:text-primary">
                        Parent
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action="/auth/signout" method="post">
                      <button type="submit" className="text-sm hover:text-primary">
                        Sign Out
                      </button>
                    </form>
                  </div>
                </div>
              </nav>
              <main>{children}</main>
            </div>
          </Suspense>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
