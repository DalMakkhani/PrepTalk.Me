"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Download, Edit2, Check, X, ThumbsUp, ThumbsDown, MessageSquare, BarChart2 } from "lucide-react"
import Link from "next/link"
import LayoutWithSidebar from "@/components/LayoutWithSidebar"

type SessionData = {
  session_group_id: string
  user_id: string
  session_name: string
  created_at: string
  question_count: number
  sessions: Array<{
    session_id: string
    user_id: string
    date: string
    category: string
    question: string
    transcript: string
    feedback: {
      scores: {
        fluency: number
        grammar: number
        confidence: number
        overall: number
      }
      analysis: {
        strengths: string[]
        improvements: string[]
        fillerWords: {
          count: number
          words: string[]
        }
        sentiment: string
        tone: string
      }
      tips: string[]
    }
  }>
}

export default function SessionReportPage() {
  const params = useParams()
  const router = useRouter()
  const sessionGroupId = params.session_group_id as string
  
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState("")
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    fetchSessionData()
  }, [sessionGroupId])

  const fetchSessionData = async () => {
    try {
      const response = await fetch(`/api/session_group/${sessionGroupId}`)
      
      if (response.ok) {
        const data = await response.json()
        setSessionData(data)
        setEditedName(data.session_name)
      } else {
        setError("Failed to fetch session details")
      }
    } catch (err) {
      setError("Network error while fetching session details")
    } finally {
      setLoading(false)
    }
  }

  const handleNameEdit = async () => {
    if (!editedName.trim()) {
      setEditedName(sessionData?.session_name || "")
      setIsEditingName(false)
      return
    }

    try {
      const response = await fetch(`/api/session_group/${sessionGroupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_name: editedName.trim() }),
      })

      if (response.ok) {
        if (sessionData) {
          setSessionData({ ...sessionData, session_name: editedName.trim() })
        }
        setIsEditingName(false)
      } else {
        setError("Failed to update session name")
      }
    } catch (err) {
      setError("Network error while updating session name")
    }
  }

  const calculateAverageScores = () => {
    if (!sessionData || sessionData.sessions.length === 0) {
      return { fluency: 0, grammar: 0, confidence: 0, overall: 0 }
    }

    const totals = sessionData.sessions.reduce(
      (acc, session) => {
        const scores = session.feedback?.scores || { fluency: 0, grammar: 0, confidence: 0, overall: 0 }
        acc.fluency += scores.fluency
        acc.grammar += scores.grammar
        acc.confidence += scores.confidence
        acc.overall += scores.overall
        return acc
      },
      { fluency: 0, grammar: 0, confidence: 0, overall: 0 }
    )

    const count = sessionData.sessions.length
    return {
      fluency: totals.fluency / count,
      grammar: totals.grammar / count,
      confidence: totals.confidence / count,
      overall: totals.overall / count,
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

  const downloadPdf = async () => {
    try {
      const userId = localStorage.getItem("preptalk_user") || "demo-user"
      const res = await fetch(`/api/feedback?user_id=${userId}&session_group_id=${sessionGroupId}`)
      
      if (!res.ok) {
        alert("Failed to generate PDF report")
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${sessionData?.session_name || 'session'}-report.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download failed', err)
      alert("Failed to download PDF report")
    }
  }

  if (loading) {
    return (
      <LayoutWithSidebar>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading session details...</p>
          </div>
        </div>
      </LayoutWithSidebar>
    )
  }

  if (error || !sessionData) {
    return (
      <LayoutWithSidebar>
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-600">{error || "Session not found"}</p>
            </CardContent>
          </Card>
        </div>
      </LayoutWithSidebar>
    )
  }

  const averageScores = calculateAverageScores()

  return (
    <LayoutWithSidebar>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Button>
            <div>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="text-2xl font-bold h-auto px-2 py-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleNameEdit()
                      if (e.key === 'Escape') {
                        setEditedName(sessionData.session_name)
                        setIsEditingName(false)
                      }
                    }}
                    autoFocus
                  />
                  <Button size="sm" onClick={handleNameEdit}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => {
                      setEditedName(sessionData.session_name)
                      setIsEditingName(false)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold">{sessionData.session_name}</h1>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setIsEditingName(true)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <p className="text-muted-foreground">
                {formatDate(sessionData.created_at)} • {sessionData.question_count} questions
              </p>
            </div>
          </div>
          <Button onClick={downloadPdf}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>

        {/* Session Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Session Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className={`text-3xl font-bold ${getScoreColor(averageScores.fluency)}`}>
                  {averageScores.fluency.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground mb-2">Fluency</div>
                <Progress value={averageScores.fluency * 20} className="h-2" />
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${getScoreColor(averageScores.grammar)}`}>
                  {averageScores.grammar.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground mb-2">Grammar</div>
                <Progress value={averageScores.grammar * 20} className="h-2" />
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${getScoreColor(averageScores.confidence)}`}>
                  {averageScores.confidence.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground mb-2">Confidence</div>
                <Progress value={averageScores.confidence * 20} className="h-2" />
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${getScoreColor(averageScores.overall)}`}>
                  {averageScores.overall.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground mb-2">Overall</div>
                <Progress value={averageScores.overall * 20} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions Detail */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Question-by-Question Analysis</h2>
          {sessionData.sessions.map((session, index) => (
            <Card key={session.session_id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                    <Badge variant="outline" className="mt-1">
                      {session.category}
                    </Badge>
                  </div>
                  <Badge variant={session.feedback?.scores?.overall >= 4 ? "default" : session.feedback?.scores?.overall >= 3 ? "secondary" : "destructive"}>
                    {session.feedback?.scores?.overall?.toFixed(1) || "0.0"}/5.0
                  </Badge>
                </div>
                <CardDescription className="text-base font-medium">
                  {session.question}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="scores" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="scores">Scores</TabsTrigger>
                    <TabsTrigger value="analysis">Analysis</TabsTrigger>
                    <TabsTrigger value="tips">Tips</TabsTrigger>
                    <TabsTrigger value="transcript">Transcript</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="scores" className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(session.feedback?.scores?.fluency || 0)}`}>
                          {session.feedback?.scores?.fluency?.toFixed(1) || "0.0"}
                        </div>
                        <div className="text-sm text-muted-foreground">Fluency</div>
                        <Progress value={(session.feedback?.scores?.fluency || 0) * 20} className="h-2 mt-1" />
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(session.feedback?.scores?.grammar || 0)}`}>
                          {session.feedback?.scores?.grammar?.toFixed(1) || "0.0"}
                        </div>
                        <div className="text-sm text-muted-foreground">Grammar</div>
                        <Progress value={(session.feedback?.scores?.grammar || 0) * 20} className="h-2 mt-1" />
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(session.feedback?.scores?.confidence || 0)}`}>
                          {session.feedback?.scores?.confidence?.toFixed(1) || "0.0"}
                        </div>
                        <div className="text-sm text-muted-foreground">Confidence</div>
                        <Progress value={(session.feedback?.scores?.confidence || 0) * 20} className="h-2 mt-1" />
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(session.feedback?.scores?.overall || 0)}`}>
                          {session.feedback?.scores?.overall?.toFixed(1) || "0.0"}
                        </div>
                        <div className="text-sm text-muted-foreground">Overall</div>
                        <Progress value={(session.feedback?.scores?.overall || 0) * 20} className="h-2 mt-1" />
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="analysis" className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-green-700 mb-2 flex items-center">
                          <ThumbsUp className="h-4 w-4 mr-2" />
                          Strengths
                        </h4>
                        <ul className="space-y-1">
                          {session.feedback?.analysis?.strengths?.map((strength, i) => (
                            <li key={i} className="text-sm">• {strength}</li>
                          )) || <li className="text-sm text-muted-foreground">No strengths identified</li>}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-orange-700 mb-2 flex items-center">
                          <ThumbsDown className="h-4 w-4 mr-2" />
                          Areas for Improvement
                        </h4>
                        <ul className="space-y-1">
                          {session.feedback?.analysis?.improvements?.map((improvement, i) => (
                            <li key={i} className="text-sm">• {improvement}</li>
                          )) || <li className="text-sm text-muted-foreground">No improvements suggested</li>}
                        </ul>
                      </div>
                    </div>
                    {session.feedback?.analysis?.fillerWords && session.feedback.analysis.fillerWords.count > 0 && (
                      <div>
                        <h4 className="font-semibold text-blue-700 mb-2">Filler Words</h4>
                        <p className="text-sm">
                          Count: {session.feedback.analysis.fillerWords.count} | 
                          Words: {session.feedback.analysis.fillerWords.words?.join(", ") || "None"}
                        </p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="tips" className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-blue-700 mb-2 flex items-center">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Improvement Tips
                      </h4>
                      <ul className="space-y-2">
                        {session.feedback?.tips?.map((tip, i) => (
                          <li key={i} className="text-sm bg-blue-50 p-3 rounded">• {tip}</li>
                        )) || <li className="text-sm text-muted-foreground">No specific tips available</li>}
                      </ul>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="transcript" className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Your Response</h4>
                      <div className="bg-gray-50 p-4 rounded text-sm whitespace-pre-wrap">
                        {session.transcript || "Transcript not available"}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </LayoutWithSidebar>
  )
}
