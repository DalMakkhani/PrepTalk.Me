"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mic, Play, StopCircle, Loader2, ArrowRight, CheckCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import LayoutWithSidebar from "@/components/LayoutWithSidebar"
import dynamic from "next/dynamic"

// Import the polyfill dynamically to ensure it's loaded only on client side
const DynamicPolyfill = dynamic(() => import('./polyfill-mediarecorder'), { ssr: false })

type Category = "hr" | "technical" | "behavioral"

type SessionQuestion = {
  question: string
  category: Category
  index: number
}

type QuestionResponse = {
  question: string
  transcript: string
  audioBlob: Blob
  category: Category
  index: number
}

type SessionFeedback = {
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

type QuestionResult = QuestionResponse & {
  feedback: SessionFeedback
}

const jobDomains = [
  "Data Scientist",
  "Software Engineer", 
  "Product Manager",
  "Marketing Manager",
  "Sales Representative",
  "Financial Analyst",
  "Consultant",
  "Other"
]

const difficultyLevels = ["Easy", "Medium", "Hard"]

export default function PracticePage() {
  const [phase, setPhase] = useState<'setup' | 'interview' | 'summary'>('setup')
  
  // Setup phase state
  const [category, setCategory] = useState<Category>("hr")
  const [jobDomain, setJobDomain] = useState("")
  const [difficulty, setDifficulty] = useState("Easy")
  const [questionCount, setQuestionCount] = useState(5)
  
  // Interview phase state
  const [sessionQuestions, setSessionQuestions] = useState<SessionQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [responses, setResponses] = useState<QuestionResponse[]>([])
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  
  // Summary phase state
  const [sessionResults, setSessionResults] = useState<QuestionResult[]>([])

  // Generate session questions
  const generateSessionQuestions = async () => {
    setIsProcessing(true)
    setError("")
    
    try {
      const questions: SessionQuestion[] = []
      
      for (let i = 0; i < questionCount; i++) {
        const response = await fetch(`/api/question?category=${category}&jobDomain=${jobDomain}&difficulty=${difficulty}`)
        const data = await response.json()
        
        questions.push({
          question: data.question,
          category: category,
          index: i + 1
        })
      }
      
      setSessionQuestions(questions)
      setPhase('interview')
    } catch (err) {
      setError("Failed to generate questions. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  // Start recording
  const startRecording = async () => {
    try {
      setError("")
      audioChunksRef.current = []
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      setError("Could not access microphone. Please check permissions.")
    }
  }

  // Stop recording and save response
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      
      // Create audio blob and save response
      setTimeout(() => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const currentQuestion = sessionQuestions[currentQuestionIndex]
        
        const response: QuestionResponse = {
          question: currentQuestion.question,
          transcript: "", // Will be filled during analysis
          audioBlob,
          category: currentQuestion.category,
          index: currentQuestion.index
        }
        
        setResponses(prev => [...prev, response])
        
        // Move to next question or finish session
        if (currentQuestionIndex < sessionQuestions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1)
        } else {
          // All questions answered, analyze session
          analyzeSession([...responses, response])
        }
      }, 100)
    }
  }

  // Analyze entire session
  const analyzeSession = async (allResponses: QuestionResponse[]) => {
    setIsProcessing(true)
    setError("")
    
    try {
      const results: QuestionResult[] = []
      const sessionIds: string[] = []
      
      for (const response of allResponses) {
        const user_id = localStorage.getItem("preptalk_user") || "demo-user"
        const formData = new FormData()
        formData.append("audio", response.audioBlob, "audio.webm")
        formData.append("user_id", user_id)
        formData.append("question", response.question)
        formData.append("category", response.category)

        const res = await fetch("http://localhost:8000/analyze_interview", {
          method: "POST",
          body: formData
        })
        
        const data = await res.json()
        
        if (data.transcript && data.feedback && data.session_id) {
          results.push({
            ...response,
            transcript: data.transcript,
            feedback: data.feedback
          })
          sessionIds.push(data.session_id)
        }
      }
      
      // Complete the session by grouping individual question sessions
      if (sessionIds.length > 0) {
        try {
          const user_id = localStorage.getItem("preptalk_user") || "demo-user"
          const completeFormData = new FormData()
          completeFormData.append("user_id", user_id)
          completeFormData.append("session_ids", sessionIds.join(","))
          // Let backend generate the session name automatically
          
          const completeRes = await fetch("/api/complete_session", {
            method: "POST",
            body: completeFormData
          })
          
          if (completeRes.ok) {
            const completeData = await completeRes.json()
            console.log("Session completed:", completeData.session_name)
          } else {
            console.warn("Failed to complete session grouping")
          }
        } catch (err) {
          console.warn("Error completing session:", err)
        }
      }
      
      setSessionResults(results)
      setPhase('summary')
    } catch (err) {
      setError("Failed to analyze session. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const resetSession = () => {
    setPhase('setup')
    setSessionQuestions([])
    setCurrentQuestionIndex(0)
    setResponses([])
    setSessionResults([])
    setError("")
  }

  const currentQuestion = sessionQuestions[currentQuestionIndex]
  const progress = sessionQuestions.length > 0 ? ((currentQuestionIndex + 1) / sessionQuestions.length) * 100 : 0

  return (
    <LayoutWithSidebar>
      <DynamicPolyfill />
      
      <div className="max-w-4xl mx-auto space-y-6 mt-16">
        {/* Setup Phase */}
        {phase === 'setup' && (
          <Card>
            <CardHeader>
              <CardTitle>Interview Session Setup</CardTitle>
              <CardDescription>
                Configure your practice session preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Interview Round</Label>
                  <Select value={category} onValueChange={(value: Category) => setCategory(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select round type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hr">HR Round</SelectItem>
                      <SelectItem value="technical">Technical Round</SelectItem>
                      <SelectItem value="behavioral">Behavioral Round</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobDomain">Job Domain</Label>
                  <Select value={jobDomain} onValueChange={setJobDomain}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your field" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobDomains.map((domain) => (
                        <SelectItem key={domain} value={domain}>
                          {domain}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      {difficultyLevels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="questionCount">Number of Questions</Label>
                  <Input
                    type="number"
                    min="1"
                    max="15"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Math.max(1, Math.min(15, parseInt(e.target.value) || 1)))}
                  />
                  <p className="text-sm text-muted-foreground">Choose between 1-15 questions</p>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={generateSessionQuestions} 
                disabled={!jobDomain || isProcessing}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    Start Interview Session
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Interview Phase */}
        {phase === 'interview' && (
          <div className="space-y-6">
            {/* Progress */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Question {currentQuestionIndex + 1} of {sessionQuestions.length}</span>
                    <span>{Math.round(progress)}% Complete</span>
                  </div>
                  <Progress value={progress} />
                </div>
              </CardContent>
            </Card>

            {/* Current Question */}
            {currentQuestion && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Question {currentQuestion.index}</CardTitle>
                    <Badge variant="outline">{currentQuestion.category.toUpperCase()}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-lg mb-6">{currentQuestion.question}</p>
                  
                  <div className="flex justify-center">
                    {!isRecording ? (
                      <Button 
                        onClick={startRecording}
                        size="lg"
                        className="h-16 w-16 rounded-full"
                      >
                        <Mic className="h-6 w-6" />
                      </Button>
                    ) : (
                      <Button 
                        onClick={stopRecording}
                        size="lg" 
                        variant="destructive"
                        className="h-16 w-16 rounded-full"
                      >
                        <StopCircle className="h-6 w-6" />
                      </Button>
                    )}
                  </div>
                  
                  {isRecording && (
                    <p className="text-center text-sm text-muted-foreground mt-4">
                      Recording... Click to stop when finished
                    </p>
                  )}

                  {error && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Summary Phase */}
        {phase === 'summary' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Interview Session Complete
                </CardTitle>
                <CardDescription>
                  Here's your complete session analysis with all {sessionResults.length} questions
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Session Results */}
            {sessionResults.map((result, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Question {result.index}</CardTitle>
                    <Badge variant="outline">{result.category.toUpperCase()}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Question:</h4>
                    <p className="text-muted-foreground">{result.question}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Your Response:</h4>
                    <p className="text-muted-foreground italic">{result.transcript}</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{result.feedback.scores.fluency}/10</div>
                      <div className="text-sm text-muted-foreground">Fluency</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{result.feedback.scores.grammar}/10</div>
                      <div className="text-sm text-muted-foreground">Grammar</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{result.feedback.scores.confidence}/10</div>
                      <div className="text-sm text-muted-foreground">Confidence</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{result.feedback.scores.overall}/10</div>
                      <div className="text-sm text-muted-foreground">Overall</div>
                    </div>
                  </div>

                  {result.feedback.analysis.strengths.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Strengths:</h4>
                      <ul className="list-disc pl-5 text-muted-foreground">
                        {result.feedback.analysis.strengths.map((strength, i) => (
                          <li key={i}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.feedback.tips.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Improvement Tips:</h4>
                      <ul className="list-disc pl-5 text-muted-foreground">
                        {result.feedback.tips.map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardFooter className="pt-6">
                <Button onClick={resetSession} className="w-full">
                  Start New Session
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* Processing Overlay */}
        {isProcessing && phase === 'interview' && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <Card className="w-96">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-center">Analyzing your responses...</p>
                  <p className="text-sm text-muted-foreground text-center">
                    This may take a moment as we process all your answers
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </LayoutWithSidebar>
  )
}
