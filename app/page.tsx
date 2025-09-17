import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { BarChart2, FileText, MessageSquare, Mic } from "lucide-react"
import LayoutWithSidebar from "@/components/LayoutWithSidebar"

export default function Home() {
  const features = [
    {
      icon: Mic,
      title: "Voice-Based Practice",
      description: "Take realistic mock interviews with voice input and get instant feedback",
      href: "/practice",
      buttonText: "Start Practice",
    },
    {
      icon: FileText,
      title: "AI Feedback",
      description: "Receive detailed feedback on your tone, grammar, and content",
      href: "/reports",
      buttonText: "View Reports",
    },
    {
      icon: BarChart2,
      title: "Track Progress",
      description: "Monitor your improvement over time with visual analytics",
      href: "/dashboard",
      buttonText: "See Dashboard",
    },
    {
      icon: MessageSquare,
      title: "AI Assistant",
      description: "Get interview tips and answers to your questions from our AI assistant",
      href: "/assistant",
      buttonText: "Chat Now",
    },
  ]

  return (
    <LayoutWithSidebar>
      <div className="space-y-8">
        <section className="py-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Ace Your Next Interview with PrepTalk</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            AI-powered mock interviews tailored for Indian job seekers. Practice, get feedback, and improve your skills.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/practice">Start Practice Interview</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard">View Your Progress</Link>
            </Button>
          </div>
        </section>

        <section className="py-8">
        <h2 className="text-2xl font-bold mb-6 text-center">How PrepTalk Helps You</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="h-full flex flex-col">
              <CardHeader className="flex flex-col" style={{minHeight: '180px'}}>
                <feature.icon className="h-8 w-8 text-primary mb-2" />
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardFooter className="mt-auto flex items-end">
                <Button asChild className="w-full">
                  <Link href={feature.href}>{feature.buttonText}</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <section className="py-8 bg-muted rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-center">Why Choose PrepTalk?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4">
            <h3 className="text-lg font-semibold mb-2">Tailored for Indian Job Market</h3>
            <p>Questions and feedback specifically designed for Indian companies and culture</p>
          </div>
          <div className="text-center p-4">
            <h3 className="text-lg font-semibold mb-2">Advanced AI Analysis</h3>
            <p>Get insights on your tone, grammar, confidence, and content quality</p>
          </div>
          <div className="text-center p-4">
            <h3 className="text-lg font-semibold mb-2">Comprehensive Practice</h3>
            <p>HR, technical, and behavioral questions for various industries and roles</p>
          </div>
        </div>
      </section>

      <section className="py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Ready to Improve Your Interview Skills?</h2>
        <p className="mb-6 text-muted-foreground">
          Join thousands of job seekers who have improved their interview performance
        </p>
        <Button asChild size="lg">
          <Link href="/practice">Start Your First Interview</Link>
        </Button>
      </section>
      </div>
    </LayoutWithSidebar>
  )
}
