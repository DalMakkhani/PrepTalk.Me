"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CalendarDays, FileText, BarChart3, Clock } from "lucide-react"
import Link from "next/link"
import LayoutWithSidebar from "@/components/LayoutWithSidebar"

type SessionGroup = {
  session_group_id: string
  user_id: string
  session_name: string
  session_ids: string[]
  created_at: string
  question_count: number
  is_completed: boolean
  average_scores: {
    fluency: number
    grammar: number
    confidence: number
    overall: number
  }
}

export default function Reports() {
  const [sessionGroups, setSessionGroups] = useState<SessionGroup[]>([])
  const [legacySessions, setLegacySessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchAllSessions()
  }, [])

  const fetchAllSessions = async () => {
    try {
      const user_id = typeof window !== 'undefined' ? (localStorage.getItem("preptalk_user") || "demo-user") : "demo-user"
      
      // Fetch session groups (new format)
      const groupsResponse = await fetch(`/api/session_groups?user_id=${encodeURIComponent(user_id)}`)
      let groups: SessionGroup[] = []
      if (groupsResponse.ok) {
        groups = await groupsResponse.json()
        setSessionGroups(groups)
      }

      // Fetch legacy sessions (old format) - sessions without session_group_id
      const legacyResponse = await fetch(`/api/progress?user_id=${encodeURIComponent(user_id)}`)
      let legacyData: any[] = []
      if (legacyResponse.ok) {
        const allSessions = await legacyResponse.json()
        // Filter out sessions that are already part of a group
        legacyData = allSessions.filter((session: any) => !session.session_group_id)
        setLegacySessions(legacyData)
      }

      if (!groupsResponse.ok && !legacyResponse.ok) {
        setError("Failed to fetch session reports")
      }
    } catch (err) {
      setError("Network error while fetching reports")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 4) return "text-green-600"
    if (score >= 3) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 4) return "default"
    if (score >= 3) return "secondary"
    return "destructive"
  }

  if (loading) {
    return (
      <LayoutWithSidebar>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your session reports...</p>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  }

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Interview Session Reports</h1>
            <p className="text-muted-foreground">
              View detailed feedback and analysis for all your practice sessions
            </p>
          </div>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {sessionGroups.length === 0 && legacySessions.length === 0 && !error ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Sessions Found</h3>
              <p className="text-muted-foreground mb-4">
                You haven't completed any practice sessions yet. Start practicing to see your reports here.
              </p>
              <Button asChild>
                <Link href="/practice">Start Practice Session</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {/* Session Groups (New Format) */}
            {sessionGroups.map((session) => (
              <Card key={session.session_group_id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{session.session_name}</CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-4 w-4" />
                          {formatDate(session.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {session.question_count} questions
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Complete Session
                        </span>
                      </CardDescription>
                    </div>
                    <Badge 
                      variant={getScoreBadgeVariant(session.average_scores.overall)}
                      className="text-sm px-3 py-1"
                    >
                      {session.average_scores.overall.toFixed(1)}/5.0
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Score Overview */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(session.average_scores.fluency)}`}>
                          {session.average_scores.fluency.toFixed(1)}
                        </div>
                        <div className="text-sm text-muted-foreground">Fluency</div>
                        <Progress 
                          value={session.average_scores.fluency * 20} 
                          className="h-2 mt-1" 
                        />
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(session.average_scores.grammar)}`}>
                          {session.average_scores.grammar.toFixed(1)}
                        </div>
                        <div className="text-sm text-muted-foreground">Grammar</div>
                        <Progress 
                          value={session.average_scores.grammar * 20} 
                          className="h-2 mt-1" 
                        />
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(session.average_scores.confidence)}`}>
                          {session.average_scores.confidence.toFixed(1)}
                        </div>
                        <div className="text-sm text-muted-foreground">Confidence</div>
                        <Progress 
                          value={session.average_scores.confidence * 20} 
                          className="h-2 mt-1" 
                        />
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(session.average_scores.overall)}`}>
                          {session.average_scores.overall.toFixed(1)}
                        </div>
                        <div className="text-sm text-muted-foreground">Overall</div>
                        <Progress 
                          value={session.average_scores.overall * 20} 
                          className="h-2 mt-1" 
                        />
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex justify-end pt-2">
                      <Button asChild variant="outline">
                        <Link href={`/reports/session/${session.session_group_id}`}>
                          <BarChart3 className="h-4 w-4 mr-2" />
                          View Detailed Report
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Legacy Sessions (Old Format) */}
            {legacySessions.map((session, index) => {
              const scores = session.feedback?.scores || { fluency: 0, grammar: 0, confidence: 0, overall: 0 }
              return (
                <Card key={session.session_id || index} className="hover:shadow-md transition-shadow border-orange-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-xl">Individual Question</CardTitle>
                        <CardDescription className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-4 w-4" />
                            {formatDate(session.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {session.category} question
                          </span>
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            Legacy Format
                          </Badge>
                        </CardDescription>
                      </div>
                      <Badge 
                        variant={getScoreBadgeVariant(scores.overall)}
                        className="text-sm px-3 py-1"
                      >
                        {scores.overall?.toFixed(1) || "0.0"}/5.0
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Question Preview */}
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <strong>Question:</strong> {session.question?.substring(0, 100)}
                        {session.question?.length > 100 && "..."}
                      </div>

                      {/* Score Overview */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className={`text-xl font-bold ${getScoreColor(scores.fluency)}`}>
                            {scores.fluency?.toFixed(1) || "0.0"}
                          </div>
                          <div className="text-sm text-muted-foreground">Fluency</div>
                          <Progress 
                            value={(scores.fluency || 0) * 20} 
                            className="h-2 mt-1" 
                          />
                        </div>
                        <div className="text-center">
                          <div className={`text-xl font-bold ${getScoreColor(scores.grammar)}`}>
                            {scores.grammar?.toFixed(1) || "0.0"}
                          </div>
                          <div className="text-sm text-muted-foreground">Grammar</div>
                          <Progress 
                            value={(scores.grammar || 0) * 20} 
                            className="h-2 mt-1" 
                          />
                        </div>
                        <div className="text-center">
                          <div className={`text-xl font-bold ${getScoreColor(scores.confidence)}`}>
                            {scores.confidence?.toFixed(1) || "0.0"}
                          </div>
                          <div className="text-sm text-muted-foreground">Confidence</div>
                          <Progress 
                            value={(scores.confidence || 0) * 20} 
                            className="h-2 mt-1" 
                          />
                        </div>
                        <div className="text-center">
                          <div className={`text-xl font-bold ${getScoreColor(scores.overall)}`}>
                            {scores.overall?.toFixed(1) || "0.0"}
                          </div>
                          <div className="text-sm text-muted-foreground">Overall</div>
                          <Progress 
                            value={(scores.overall || 0) * 20} 
                            className="h-2 mt-1" 
                          />
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex justify-end pt-2">
                        <Button asChild variant="outline">
                          <Link href="/reports/latest">
                            <BarChart3 className="h-4 w-4 mr-2" />
                            View in Legacy Format
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </LayoutWithSidebar>
  )
}
