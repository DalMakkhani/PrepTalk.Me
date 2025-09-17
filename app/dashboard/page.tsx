"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, Line, BarChart, LineChart } from "recharts"
import LayoutWithSidebar from "@/components/LayoutWithSidebar"

interface Session {
  session_id: string
  user_id: string
  date?: string
  category?: string
  question?: string
  scores?: {
    fluency: number
    grammar: number
    confidence: number
    overall: number
  }
  feedback?: {
    scores: {
      fluency: number
      grammar: number
      confidence: number
      overall: number
    }
  }
}

export default function Dashboard() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchData() {
      setError("")
      setLoading(true)
      try {
        const user_id = localStorage.getItem("preptalk_user") || "demo-user"
        const res = await fetch(`/api/progress?user_id=${user_id}`)
        if (!res.ok) throw new Error("Failed to fetch progress data")
        const data = await res.json()
        setSessions(Array.isArray(data) ? data : [])
      } catch (err) {
        setError("Failed to load progress data.")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Helper to get scores from either location
  const getScores = (s: any) => s.scores || (s.feedback && s.feedback.scores) || {};

  // Calculate aggregate stats
  const totalInterviews = sessions.length
  const averageScore = totalInterviews
    ? (
        sessions.reduce((sum, s) => sum + (getScores(s).overall ?? 0), 0) / totalInterviews
      ).toFixed(2)
    : "-"

  // Group by category for analytics
  const categoryStats = sessions.reduce((acc, s) => {
    if (!s.category) return acc
    const scores = getScores(s);
    if (!acc[s.category]) acc[s.category] = { count: 0, total: 0 }
    acc[s.category].count++
    acc[s.category].total += scores.overall ?? 0
    return acc
  }, {} as Record<string, { count: number; total: number }>)
  const mostImproved = Object.entries(categoryStats).sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count))[0]?.[0] || "-"

  // Chart data: progress over time (by month)
  const progressByMonthMap: Record<string, { month: string; fluency: number; grammar: number; confidence: number; count: number }> = {}
  sessions.forEach((s) => {
    const scores = getScores(s);
    if (!s.date || !scores) return
    // Ensure date is in ISO string or Date format
    let dateObj: Date
    try {
      dateObj = typeof s.date === 'string' ? new Date(s.date) : s.date
      if (isNaN(dateObj.getTime())) throw new Error('Invalid date')
    } catch {
      return
    }
    const month = dateObj.toLocaleString("default", { month: "short", year: "2-digit" })
    if (!progressByMonthMap[month]) {
      progressByMonthMap[month] = { month, fluency: 0, grammar: 0, confidence: 0, count: 0 }
    }
    progressByMonthMap[month].fluency += scores.fluency ?? 0
    progressByMonthMap[month].grammar += scores.grammar ?? 0
    progressByMonthMap[month].confidence += scores.confidence ?? 0
    progressByMonthMap[month].count++
  })
  const progressData = Object.values(progressByMonthMap).map((d) => ({
    month: d.month,
    fluency: d.count ? d.fluency / d.count : 0,
    grammar: d.count ? d.grammar / d.count : 0,
    confidence: d.count ? d.confidence / d.count : 0,
  }))

  // Chart data: performance by category
  const categoryData = Object.entries(categoryStats).map(([name, val]) => ({
    name,
    interviews: val.count,
    avgScore: val.count ? val.total / val.count : 0,
  }))

  // Debug: Log chart data
  if (typeof window !== 'undefined') {
    console.log('progressData', progressData)
    console.log('categoryData', categoryData)
    console.log('sessions', sessions)
  }

  // Show message if no data for charts
  const noProgressData = !progressData.length
  const noCategoryData = !categoryData.length

  // Recent interviews (show 5 most recent)
  const interviewHistory = sessions.slice(0, 5).map((s) => ({
    id: s.session_id,
    date: s.date,
    category: s.category,
    question: s.question,
    score: getScores(s).overall ?? 0,
  }))

  return (
    <LayoutWithSidebar>
      <div className="max-w-6xl mx-auto mt-16">
        <h1 className="text-3xl font-bold mb-6">Progress Dashboard</h1>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Total Interviews</CardTitle>
                <CardDescription>Your practice sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{totalInterviews}</div>
                <p className="text-sm text-muted-foreground">Recent sessions included</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Average Score</CardTitle>
                <CardDescription>Overall performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{averageScore}</div>
                <p className="text-sm text-muted-foreground">Across all sessions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Most Improved</CardTitle>
                <CardDescription>Your best category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{mostImproved}</div>
                <p className="text-sm text-muted-foreground">Based on recent progress</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="progress" className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="progress">Progress Over Time</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
            </TabsList>

            <TabsContent value="progress">
              <Card>
                <CardHeader>
                  <CardTitle>Skills Progress</CardTitle>
                  <CardDescription>Track your improvement in key interview skills</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    {noProgressData ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">No data for progress chart.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={progressData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis domain={[0, 5]} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="fluency" stroke="#8884d8" name="Fluency" />
                          <Line type="monotone" dataKey="grammar" stroke="#82ca9d" name="Grammar" />
                          <Line type="monotone" dataKey="confidence" stroke="#ffc658" name="Confidence" />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories">
              <Card>
                <CardHeader>
                  <CardTitle>Performance by Category</CardTitle>
                  <CardDescription>Compare your performance across different question types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    {noCategoryData ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">No data for category chart.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" domain={[0, 5]} />
                          <Tooltip />
                          <Legend />
                          <Bar yAxisId="left" dataKey="interviews" fill="#8884d8" name="Interviews" />
                          <Bar yAxisId="right" dataKey="avgScore" fill="#82ca9d" name="Avg Score" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle>Recent Interviews</CardTitle>
              <CardDescription>Your last 5 practice sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">Date</th>
                      <th className="text-left py-3 px-2">Category</th>
                      <th className="text-left py-3 px-2">Question</th>
                      <th className="text-right py-3 px-2">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interviewHistory.map((interview) => (
                      <tr key={interview.id} className="border-b">
                        <td className="py-3 px-2">{interview.date ? new Date(interview.date).toLocaleDateString() : "-"}</td>
                        <td className="py-3 px-2">{interview.category}</td>
                        <td className="py-3 px-2">{interview.question}</td>
                        <td className="py-3 px-2 text-right font-medium">{interview.score.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      </div>
    </LayoutWithSidebar>
  )
}
