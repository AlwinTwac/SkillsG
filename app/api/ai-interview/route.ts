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
Your job is to collect the following details from the student:
1. Full Name and Email Address
2. Current Experience Level and Technical Skills
3. Primary Learning Interests and Career Goals
4. Work Suit Size
5. A confirmation that you have all required information.

INTERVIEW STYLE:
- Ask 2 related questions at a time when possible, to make the process faster.
- If the student answers only one of the two questions, politely ask for the missing one before moving on.
- Keep questions short, friendly, and conversational.
- Confirm when you have all required info, then call 'save_interview_data'.

IMPORTANT:
- Never show any JSON or structured data to the student.
- When you have collected all required information, respond with:
  "Thank you! I have gathered all the necessary information."
- After that, call the function 'save_interview_data' with the structured data.
`;

    let messagesForOpenAI: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt }
    ];
    messagesForOpenAI = messagesForOpenAI.concat(conversationHistory);

    if (action === 'start_interview' && conversationHistory.length === 0) {
      messagesForOpenAI.push({ role: 'user', content: 'Begin the interview by asking the first questions.' });
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
                goals: { type: "string" },
                workSuitSize: { type: "string" }
              },
              required: [
                "studentName",
                "studentEmail",
                "reportSummary",
                "recommendedLearningPath",
                "workSuitSize"
              ]
            }
          }
        }
      ]
    });

    const choice = completion.choices[0];
    let finalAiResponse = choice.message?.content || "";
    let interviewStatus: 'ongoing' | 'completed' = 'ongoing';
    let reportData: any = null;

    // ---- HANDLE TOOL CALL RESULT (FIXED) ----
    if (choice.finish_reason === "tool_calls" && choice.message?.tool_calls?.length) {
      const toolCall = choice.message.tool_calls[0];

      // Declare outside of blocks so it's available to the try/catch below
      let argsRaw: unknown = null;

      if (toolCall?.type === "function" && "function" in toolCall) {
        argsRaw = toolCall.function.arguments;
      }

      if (argsRaw) {
        try {
          // arguments are usually a JSON string; handle both string/object safely
          reportData = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;

          interviewStatus = 'completed';
          finalAiResponse = "Thank you! I have gathered all the necessary information.";
        } catch (e) {
          console.error("Error parsing function arguments:", e);
        }
      }
    }

    return NextResponse.json({ aiResponse: finalAiResponse, interviewStatus, reportData });

  } catch (error: any) {
    console.error('API Error:', error.message);
    return NextResponse.json({ error: `API Error: ${error.message}` }, { status: 500 });
  }
}
