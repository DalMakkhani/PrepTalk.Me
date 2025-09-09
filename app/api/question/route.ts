import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const OLLAMA_URL = "http://localhost:11434/api/generate";
const OLLAMA_MODEL = "mistral"; // or your preferred model

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = (searchParams.get("category") || "behavioral").toLowerCase();

  // Read the sample questions JSON
  const questionsPath = path.resolve(process.cwd(), "backend/data/questions.json");
  const questionsJson = JSON.parse(await fs.readFile(questionsPath, "utf-8"));

  // --- Get jobDomain and difficulty from query params ---
  const jobDomain = searchParams.get("jobDomain") || "Data Scientist";
  const difficulty = searchParams.get("difficulty") || "Easy";

  // --- Build the enhanced prompt ---
  const examples = (questionsJson[category] || questionsJson["behavioral"]).slice(0, 3);
  // Remove any leading numbers from example questions
  const cleanExamples = examples.map((q: string) => q.replace(/^\s*\d+\.?\s*/, ""));
  const prompt = `
You are an expert interview coach. Here are some example ${category} interview questions for the job domain: ${jobDomain} at ${difficulty} level:
${cleanExamples.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")}
Generate a new, unique ${category} interview question for a ${jobDomain} at ${difficulty} difficulty that is not in the list above. Do not include any leading numbers in your question.
Just output the question, nothing else.
`;

  // Call the Ollama API
  const ollamaRes = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: false
    }),
  });

  if (!ollamaRes.ok) {
    return NextResponse.json({ error: "Failed to generate question" }, { status: 500 });
  }

  const ollamaData = await ollamaRes.json();
  // The response from Ollama is usually in ollamaData.response or ollamaData.generated_text
  const question = ollamaData.response?.trim() || ollamaData.generated_text?.trim() || "Could not generate question.";

  return NextResponse.json({ question });
}