import { NextRequest, NextResponse } from "next/server"
import { getApiBaseUrl } from "@/lib/api";
export const runtime = 'nodejs'; 
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Replace unsupported hyphens with ASCII
function sanitize(text: string): string {
  return text.replace(/[\u2011\u2013]/g, '-');
}

export async function POST(request: NextRequest) {
  try {
    const { conversation, user_id } = await request.json()
    
    if (!conversation) {
      return NextResponse.json(
        { error: 'No conversation provided' },
        { status: 400 }
      );
    }
    
    console.log(`Generating feedback for user ${user_id}`);
    
    // Call your real backend AI/analysis service instead of mock
    const feedbackRes = await fetch(`${getApiBaseUrl()}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ conversation, user_id }),
    });
    if (!feedbackRes.ok) {
      throw new Error(`Backend responded with status: ${feedbackRes.status}`);
    }
    const feedback = await feedbackRes.json();

    // save the interview session 
  await fetch(`${getApiBaseUrl()}/save_interview`, {
       method: "POST",
       headers: { "Content-Type": "application/x-www-form-urlencoded" },
       body: new URLSearchParams({
         conversation,
         feedback: JSON.stringify(feedback),
         user_id: user_id || "",
       }),
   });

    return NextResponse.json(feedback);
    
  } catch (error) {
    let message = "Unknown error";
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === "string") {
      message = error;
    }
    console.error('Error generating feedback:', error);
    return NextResponse.json(
      { error: `Failed to generate feedback: ${message}` },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const user_id = url.searchParams.get("user_id") || "";
    const session_id = url.searchParams.get("session_id");
    const session_group_id = url.searchParams.get("session_group_id");

    let sessions: any[] = [];
    let sessionName = "Interview Session";

    if (session_group_id) {
      // Fetch session group details
      const groupRes = await fetch(`${getApiBaseUrl()}/session_group/${session_group_id}`);
      if (!groupRes.ok) {
        return NextResponse.json({ error: `Failed to fetch session group: ${groupRes.status}` }, { status: groupRes.status });
      }
      const sessionGroup = await groupRes.json();
      sessions = sessionGroup.sessions || [];
      sessionName = sessionGroup.session_name || "Interview Session";
    } else {
      // Fetch individual session (legacy support)
      const progressRes = await fetch(`${getApiBaseUrl()}/progress?user_id=${user_id}`);
      if (!progressRes.ok) {
        return NextResponse.json({ error: `Failed to fetch sessions: ${progressRes.status}` }, { status: progressRes.status });
      }
      const allSessions = await progressRes.json();
      const session = session_id
        ? allSessions.find((s: any) => s.session_id === session_id)
        : allSessions[0];
      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      sessions = [session];
    }

    if (sessions.length === 0) {
      return NextResponse.json({ error: "No sessions found" }, { status: 404 });
    }

    // Generate PDF using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Function to add a new page if needed
    const addPageIfNeeded = (currentY: number, requiredSpace: number = 100) => {
      if (currentY < requiredSpace) {
        const newPage = pdfDoc.addPage();
        return { page: newPage, y: newPage.getSize().height - 40 };
      }
      return null;
    };
    
    let page = pdfDoc.addPage();
    let { width, height } = page.getSize();
    let y = height - 40;

    // Title
    page.drawText(sessionName, { x: 50, y, size: 20, font: helveticaBold, color: rgb(0, 0, 0) });
    y -= 25;
    page.drawText(`Generated: ${new Date().toLocaleDateString()}`, { x: 50, y, size: 10, font: helveticaFont, color: rgb(0.5, 0.5, 0.5) });
    y -= 30;

    // Calculate overall session statistics
    if (sessions.length > 1) {
      const totalScores = sessions.reduce((acc, session) => {
        const scores = session.feedback?.scores || { fluency: 0, grammar: 0, confidence: 0, overall: 0 };
        acc.fluency += scores.fluency;
        acc.grammar += scores.grammar;
        acc.confidence += scores.confidence;
        acc.overall += scores.overall;
        return acc;
      }, { fluency: 0, grammar: 0, confidence: 0, overall: 0 });

      const avgScores = {
        fluency: (totalScores.fluency / sessions.length).toFixed(1),
        grammar: (totalScores.grammar / sessions.length).toFixed(1),
        confidence: (totalScores.confidence / sessions.length).toFixed(1),
        overall: (totalScores.overall / sessions.length).toFixed(1),
      };

      // Session Overview
      page.drawText("Session Overview", { x: 50, y, size: 16, font: helveticaBold });
      y -= 20;
      page.drawText(`Total Questions: ${sessions.length}`, { x: 50, y, size: 12, font: helveticaFont });
      y -= 15;
      page.drawText("Average Scores:", { x: 50, y, size: 12, font: helveticaBold });
      y -= 15;
      page.drawText(`Fluency: ${avgScores.fluency}/5.0`, { x: 70, y, size: 10, font: helveticaFont });
      y -= 12;
      page.drawText(`Grammar: ${avgScores.grammar}/5.0`, { x: 70, y, size: 10, font: helveticaFont });
      y -= 12;
      page.drawText(`Confidence: ${avgScores.confidence}/5.0`, { x: 70, y, size: 10, font: helveticaFont });
      y -= 12;
      page.drawText(`Overall: ${avgScores.overall}/5.0`, { x: 70, y, size: 10, font: helveticaFont });
      y -= 25;
    }

    // Individual questions
    sessions.forEach((session, index) => {
      // Check if we need a new page
      const newPageInfo = addPageIfNeeded(y, 200);
      if (newPageInfo) {
        page = newPageInfo.page;
        y = newPageInfo.y;
      }

      // Question header
      const questionTitle = sessions.length > 1 ? `Question ${index + 1}` : "Interview Question";
      page.drawText(questionTitle, { x: 50, y, size: 14, font: helveticaBold });
      y -= 18;
      
      if (session.category) {
        page.drawText(`Category: ${session.category}`, { x: 50, y, size: 10, font: helveticaFont, color: rgb(0.6, 0.6, 0.6) });
        y -= 15;
      }

      // Question text
      const questionText = sanitize(session.question || "No question available");
      const questionLines = questionText.match(/.{1,80}/g) || [questionText];
      questionLines.forEach(line => {
        page.drawText(line, { x: 50, y, size: 11, font: helveticaFont });
        y -= 13;
      });
      y -= 5;

      // Scores
      page.drawText("Scores:", { x: 50, y, size: 12, font: helveticaBold });
      y -= 15;
      const scores = session.feedback?.scores || { fluency: 0, grammar: 0, confidence: 0, overall: 0 };
      page.drawText(`Fluency: ${scores.fluency?.toFixed(1) || '0.0'}/5.0`, { x: 60, y, size: 10, font: helveticaFont });
      y -= 12;
      page.drawText(`Grammar: ${scores.grammar?.toFixed(1) || '0.0'}/5.0`, { x: 60, y, size: 10, font: helveticaFont });
      y -= 12;
      page.drawText(`Confidence: ${scores.confidence?.toFixed(1) || '0.0'}/5.0`, { x: 60, y, size: 10, font: helveticaFont });
      y -= 12;
      page.drawText(`Overall: ${scores.overall?.toFixed(1) || '0.0'}/5.0`, { x: 60, y, size: 10, font: helveticaFont });
      y -= 18;

      // Transcript (limited length)
      if (session.transcript) {
        page.drawText("Your Response:", { x: 50, y, size: 12, font: helveticaBold });
        y -= 15;
        const transcript = sanitize(session.transcript);
        const transcriptLines = transcript.substring(0, 300).match(/.{1,75}/g) || [transcript.substring(0, 300)];
        transcriptLines.forEach(line => {
          page.drawText(line, { x: 60, y, size: 9, font: helveticaFont });
          y -= 11;
        });
        if (transcript.length > 300) {
          page.drawText("... (truncated)", { x: 60, y, size: 9, font: helveticaFont, color: rgb(0.6, 0.6, 0.6) });
          y -= 11;
        }
        y -= 10;
      }

      // Feedback sections
      const analysis = session.feedback?.analysis;
      if (analysis?.strengths && analysis.strengths.length > 0) {
        page.drawText("Strengths:", { x: 50, y, size: 12, font: helveticaBold, color: rgb(0, 0.6, 0) });
        y -= 15;
        analysis.strengths.slice(0, 3).forEach((strength: string) => {
          const strengthText = sanitize(strength);
          const strengthLines = strengthText.match(/.{1,70}/g) || [strengthText];
          strengthLines.forEach(line => {
            page.drawText(`• ${line}`, { x: 60, y, size: 9, font: helveticaFont });
            y -= 11;
          });
        });
        y -= 8;
      }

      if (analysis?.improvements && analysis.improvements.length > 0) {
        const newPageInfo = addPageIfNeeded(y, 80);
        if (newPageInfo) {
          page = newPageInfo.page;
          y = newPageInfo.y;
        }
        
        page.drawText("Areas for Improvement:", { x: 50, y, size: 12, font: helveticaBold, color: rgb(0.8, 0.4, 0) });
        y -= 15;
        analysis.improvements.slice(0, 3).forEach((improvement: string) => {
          const improvementText = sanitize(improvement);
          const improvementLines = improvementText.match(/.{1,70}/g) || [improvementText];
          improvementLines.forEach(line => {
            page.drawText(`• ${line}`, { x: 60, y, size: 9, font: helveticaFont });
            y -= 11;
          });
        });
        y -= 8;
      }

      if (session.feedback?.tips && session.feedback.tips.length > 0) {
        const newPageInfo = addPageIfNeeded(y, 80);
        if (newPageInfo) {
          page = newPageInfo.page;
          y = newPageInfo.y;
        }
        
        page.drawText("Tips:", { x: 50, y, size: 12, font: helveticaBold, color: rgb(0, 0.4, 0.8) });
        y -= 15;
        session.feedback.tips.slice(0, 3).forEach((tip: string) => {
          const tipText = sanitize(tip);
          const tipLines = tipText.match(/.{1,70}/g) || [tipText];
          tipLines.forEach(line => {
            page.drawText(`• ${line}`, { x: 60, y, size: 9, font: helveticaFont });
            y -= 11;
          });
        });
        y -= 8;
      }

      // Add separator between questions
      if (index < sessions.length - 1) {
        y -= 15;
        page.drawLine({
          start: { x: 50, y: y },
          end: { x: width - 50, y: y },
          thickness: 1,
          color: rgb(0.8, 0.8, 0.8),
        });
        y -= 20;
      }
    });

    const pdfBytes = await pdfDoc.save();
    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${sessionName.replace(/[^a-zA-Z0-9]/g, '_')}_report.pdf"`,
      },
    });
  } catch (error) {
    console.error("[PDF generation error]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
