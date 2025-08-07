import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { adminDb } from '@/lib/firebase-admin';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StudentProfile {
  uid: string;
  name: string;
  email: string;
}

interface ClientRequestData {
  conversationHistory: ConversationMessage[];
  studentProfile: StudentProfile;
  action: 'start_interview' | 'continue_interview';
}

export async function POST(request: Request) {
  try {
    const { conversationHistory, studentProfile, action }: ClientRequestData = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured.');
    }

    const coursesSnapshot = await adminDb.collection('courses').get();
    const availableCourses = coursesSnapshot.docs.map(doc => doc.data().name as string);

    // ---- SYSTEM PROMPT ----
    const systemPrompt = `
You are an AI interviewer for Kimtronix Global. 
Your goal is to collect:
1. Full Name and Email Address
2. Current Experience Level and Technical Skills
3. Primary Learning Interests and Career Goals
4. A confirmation that you have all required information.

Ask one question at a time in a concise and conversational way.

IMPORTANT:
- Never show any JSON or structured data to the user.
- When you have collected all required information, respond with:
  "Thank you! I have gathered all the necessary information."
- Then call the function 'save_interview_data' with the structured data.
`;

    let messagesForOpenAI: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt }
    ];
    messagesForOpenAI = messagesForOpenAI.concat(conversationHistory);

    if (action === 'start_interview' && conversationHistory.length === 0) {
      messagesForOpenAI.push({ role: 'user', content: 'Begin the interview by asking the first question.' });
    }

    // ---- OPENAI FUNCTION CALL ----
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: messagesForOpenAI,
      temperature: 0.7,
      max_tokens: 1500,
      tools: [
        {
          type: "function",
          function: {
            name: "save_interview_data",
            description: "Structured interview data for database saving",
            parameters: {
              type: "object",
              properties: {
                studentName: { type: "string" },
                studentEmail: { type: "string" },
                interviewDate: { type: "string" },
                reportSummary: { type: "string" },
                recommendedLearningPath: {
                  type: "array",
                  items: { type: "string" },
                  description: `Select only from: ${availableCourses.join(', ')}`
                },
                interviewScore: { type: "number" },
                strengths: { type: "array", items: { type: "string" } },
                weaknesses: { type: "array", items: { type: "string" } },
                experience: { type: "string" },
                skills: { type: "array", items: { type: "string" } },
                interests: { type: "array", items: { type: "string" } },
                goals: { type: "string" }
              },
              required: ["studentName", "studentEmail", "reportSummary", "recommendedLearningPath"]
            }
          }
        }
      ]
    });

    const choice = completion.choices[0];
    let finalAiResponse = choice.message?.content || "";
    let interviewStatus: 'ongoing' | 'completed' = 'ongoing';
    let reportData = null;

    // ---- CHECK IF FUNCTION CALL OCCURRED ----
    if (choice.finish_reason === "tool_calls" && choice.message?.tool_calls?.length) {
      const args = choice.message.tool_calls[0].function.arguments;
      try {
        reportData = JSON.parse(args);
        interviewStatus = 'completed';
        finalAiResponse = "Thank you! I have gathered all the necessary information.";
      } catch (e) {
        console.error("Error parsing function arguments:", e);
      }
    }

    return NextResponse.json({ aiResponse: finalAiResponse, interviewStatus, reportData });

  } catch (error: any) {
    console.error('API Error:', error.message);
    return NextResponse.json({ error: `API Error: ${error.message}` }, { status: 500 });
  }
}
