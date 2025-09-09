"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, ThumbsUp, ThumbsDown, BarChart2, MessageSquare } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import LayoutWithSidebar from "@/components/LayoutWithSidebar"

export default function LatestReport() {
  const [feedback, setFeedback] = useState<any>(null)

  useEffect(() => {
    // Fetch the latest session for the current user
    async function fetchLatest() {
      const user_id = typeof window !== 'undefined' ? (localStorage.getItem("preptalk_user") || "demo-user") : "demo-user"
      const res = await fetch(`/api/progress?user_id=${user_id}`)
      const data = await res.json()
      if (data && data.length > 0) {
        setFeedback(data[0]) // newest session first
      }
    }
    fetchLatest()
  }, [])

  // Prepare PDF download URL
  const userId = typeof window !== 'undefined'
    ? (localStorage.getItem("preptalk_user") || "demo-user")
    : "demo-user";
  const pdfUrl = `/api/feedback?user_id=${userId}&session_id=${feedback?.session_id}`;

  // Download PDF programmatically without redirect
  const downloadPdf = async () => {
    try {
      const res = await fetch(pdfUrl);
      if (!res.ok) {
        // Show server error details
        const ct = res.headers.get("content-type") || "";
        let msg = `HTTP ${res.status}`;
        if (ct.includes("application/json")) {
          const err = await res.json();
          console.error("PDF API error:", err);
          msg += `: ${err.error || JSON.stringify(err)}`;
        } else {
          const text = await res.text();
          console.error("PDF API error text:", text);
          msg += `: ${text}`;
        }
        alert(msg);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'feedback.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  // Function to render score with appropriate color
  const renderScore = (score: number) => { 
    let color = "bg-red-500"
    if (score >= 4) color = "bg-green-500"
    else if (score >= 3) color = "bg-yellow-500"

    return (
      <div className="flex items-center gap-2">
        <div className="text-2xl font-bold">{score?.toFixed(1)}</div>
        <Progress value={score * 20} className={`h-2 w-24 ${color}`} />
      </div>
    )
  }

  if (!feedback) {
    return <div className="text-center p-8">Loading latest feedback...</div>
  }

  // Defensive: check for required fields
  if (!feedback.question || !feedback.transcript) {
    return (
      <div className="text-center p-8 text-red-500">
        Error: The latest feedback data is incomplete. Please try another session or contact support.
      </div>
    )
  }

  // Defensive: support both old and new feedback keys
  const scores = feedback.scores || (feedback.feedback && feedback.feedback.scores)
  const analysis = feedback.analysis || (feedback.feedback && feedback.feedback.analysis)
  const tips = feedback.tips || (feedback.feedback && feedback.feedback.tips)
  // LLM v2 keys
  const strongPoints = feedback.strong_points || (feedback.feedback && feedback.feedback.strong_points)
  const weakPoints = feedback.weak_points || (feedback.feedback && feedback.feedback.weak_points)
  const suggestions = feedback.suggestions || (feedback.feedback && feedback.feedback.suggestions)

  // Defensive: check for scores
  if (!scores) {
    return (
      <div className="text-center p-8 text-red-500">
        Error: No scores available for this report. Please try another session.
      </div>
    )
  }

  return (
    <LayoutWithSidebar>
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-3xl font-bold">Interview Feedback</h1>
        <div className="flex gap-2 mt-2 md:mt-0">
          <Button variant="outline" size="sm" onClick={downloadPdf}>
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Interview Summary</CardTitle>
          <CardDescription>{feedback.category ? feedback.category.charAt(0).toUpperCase() + feedback.category.slice(1) : ""} Question • {feedback.date ? new Date(feedback.date).toLocaleDateString() : new Date().toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-1">Question:</h3>
              <p className="text-lg p-3 bg-muted rounded-md">{feedback.question}</p>
            </div>
            <div>
              <h3 className="font-medium mb-1">Your Response:</h3>
              <p className="p-3 border rounded-md">{feedback.transcript}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Fluency</h3>
                {renderScore(scores.fluency)}
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Grammar</h3>
                {renderScore(scores.grammar)}
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Confidence</h3>
                {renderScore(scores.confidence)}
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Overall</h3>
                {renderScore(scores.overall)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="analysis" className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analysis">Detailed Analysis</TabsTrigger>
          <TabsTrigger value="tips">Suggestions</TabsTrigger>
          <TabsTrigger value="transcript">Full Transcript</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Analysis</CardTitle>
              <CardDescription>AI-powered analysis of your interview response</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Show new LLM keys if present */}
              {strongPoints && Array.isArray(strongPoints) && strongPoints.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2 flex items-center">
                    <ThumbsUp className="mr-2 h-4 w-4 text-green-500" /> Strong Points
                  </h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {strongPoints.map((point: string, index: number) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
              {weakPoints && Array.isArray(weakPoints) && weakPoints.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2 flex items-center">
                    <ThumbsDown className="mr-2 h-4 w-4 text-yellow-500" /> Weak Points
                  </h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {weakPoints.map((point: string, index: number) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
              {/* Fallback to old keys if present */}
              {analysis && analysis.strengths && (
                <div>
                  <h3 className="font-medium mb-2 flex items-center">
                    <ThumbsUp className="mr-2 h-4 w-4 text-green-500" /> Strengths
                  </h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {analysis.strengths.map((point: string, index: number) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis && analysis.improvements && (
                <div>
                  <h3 className="font-medium mb-2 flex items-center">
                    <ThumbsDown className="mr-2 h-4 w-4 text-yellow-500" /> Areas for Improvement
                  </h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {analysis.improvements.map((point: string, index: number) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
              {/* Show filler words and tone if present */}
              {analysis && analysis.fillerWords && (
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-medium mb-2">Filler Words</h3>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {analysis.fillerWords.words.map((word: string, index: number) => (
                      <Badge key={index} variant="outline">
                        {word}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You used {analysis.fillerWords.count} filler words in your response.
                  </p>
                </div>
              )}
              {analysis && (analysis.sentiment || analysis.tone) && (
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-medium mb-2">Tone Analysis</h3>
                  {analysis.sentiment && (
                    <p className="mb-1">
                      <span className="font-medium">Sentiment:</span> {analysis.sentiment}
                    </p>
                  )}
                  {analysis.tone && (
                    <p>
                      <span className="font-medium">Tone:</span> {analysis.tone}
                    </p>
                  )}
                </div>
              )}
              {/* Show overall_feedback if present */}
              {feedback.overall_feedback && (
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-medium mb-2">Overall Feedback</h3>
                  <p>{feedback.overall_feedback}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="tips">
          <Card>
            <CardHeader>
              <CardTitle>Suggestions</CardTitle>
              <CardDescription>Personalized suggestions to enhance your interview skills</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Show new LLM suggestions if present */}
              {suggestions && Array.isArray(suggestions) && suggestions.length > 0 ? (
                <ul className="space-y-4">
                  {suggestions.map((tip: string, index: number) => (
                    <li key={index} className="flex items-start gap-3 p-3 border rounded-md">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <span className="text-primary font-bold">{index + 1}</span>
                      </div>
                      <div>{tip}</div>
                    </li>
                  ))}
                </ul>
              ) : tips && Array.isArray(tips) && tips.length > 0 ? (
                <ul className="space-y-4">
                  {tips.map((tip: string, index: number) => (
                    <li key={index} className="flex items-start gap-3 p-3 border rounded-md">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <span className="text-primary font-bold">{index + 1}</span>
                      </div>
                      <div>{tip}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-red-500">No suggestions available for this report.</div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" asChild>
                <Link href="/practice">Practice Again</Link>
              </Button>
              <Button asChild>
                <Link href="/dashboard">
                  <BarChart2 className="mr-2 h-4 w-4" /> View Progress
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="transcript">
          <Card>
            <CardHeader>
              <CardTitle>Full Transcript</CardTitle>
              <CardDescription>Complete transcript of your interview response</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 border rounded-lg whitespace-pre-line">{feedback.transcript}</div>
            </CardContent>
            <CardFooter>
              {/* Download Transcript button removed as requested */}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="text-center mt-8">
        <p className="mb-4">Need more help with this question?</p>
        <Button asChild>
          <Link href="/assistant">
            <MessageSquare className="mr-2 h-4 w-4" /> Ask AI Assistant
          </Link>
        </Button>
      </div>
      </div>
    </LayoutWithSidebar>
  )
}
