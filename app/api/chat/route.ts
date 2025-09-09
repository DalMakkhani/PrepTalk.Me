import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json()
    
    // Check if GROQ API key exists
    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY not found in environment variables")
      return NextResponse.json(
        { error: "GROQ API key not configured" },
        { status: 500 }
      )
    }

    console.log("Making request to GROQ API with message:", message)
    
    // Current GROQ Production Models (as of 2025)
    const models = [
      "llama-3.3-70b-versatile",  // Current Llama 3 70B production model
      "llama-3.1-8b-instant",     // Faster alternative
      "openai/gpt-oss-120b",      // OpenAI model alternative
      "openai/gpt-oss-20b"        // Smaller OpenAI model
    ]
    
    for (const model of models) {
      try {
        const requestBody = {
          model: model,
          messages: [
            {
              role: "system",
              content: "You are PrepTalk AI Assistant, an expert interview coach helping Indian job seekers. Provide practical, actionable advice for interview preparation. Be concise but comprehensive. Focus on Indian job market context when relevant."
            },
            {
              role: "user", 
              content: message
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        }

        console.log(`Trying model: ${model}`)
        
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        })

        console.log(`Model ${model} response status:`, response.status)

        if (response.ok) {
          const data = await response.json()
          console.log("GROQ API response successful with model:", model)
          
          if (data.choices && data.choices[0] && data.choices[0].message) {
            return NextResponse.json({
              response: data.choices[0].message.content
            })
          }
        } else {
          const errorText = await response.text()
          console.log(`Model ${model} failed:`, response.status, errorText)
        }
      } catch (modelError) {
        console.log(`Model ${model} error:`, modelError)
      }
    }
    
    // If all models fail, return a helpful response
    console.log("All GROQ models failed, returning fallback response")
    return NextResponse.json({
      response: "I'm PrepTalk AI Assistant! I'm here to help you with interview preparation. While I'm experiencing some connectivity issues right now, I can still provide some general advice:\n\n1. Research the company thoroughly\n2. Practice common interview questions\n3. Prepare STAR method examples\n4. Dress appropriately and arrive early\n5. Ask thoughtful questions about the role\n\nPlease try sending your message again in a moment, or check with the development team about the API configuration."
    })

  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: `Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
