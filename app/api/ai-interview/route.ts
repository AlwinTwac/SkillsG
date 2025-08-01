import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { adminDb } from '@/lib/firebase-admin'; // Changed from getAdminDb to adminDb

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

// --- API Route Handler ---
export async function POST(request: Request) {
  try {
    const { conversationHistory, studentProfile, action }: ClientRequestData = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured.');
    }
    
    // Directly use adminDb instead of getAdminDb()
    const coursesSnapshot = await adminDb.collection('courses').get();
    const availableCourses = coursesSnapshot.docs.map(doc => doc.data().name as string);

    const systemPrompt = `You are an AI interviewer for Kimtronix Global. Your goal is to gather specific information from a potential student in a concise, conversational manner. Ask one question at a time.

    You MUST collect the following FOUR pieces of information:
    1. Full Name and Email Address (you can ask for these together).
    2. Current Experience Level AND any relevant Technical Skills (ask for these together).
    3. Primary Learning Interests AND Career Goals (ask for these together).
    4. A confirmation that you have all the information you need.

    After you have collected ALL the required information, your VERY NEXT RESPONSE must be your final conversational message, immediately followed by the special JSON block. Do not say anything else after the JSON block. The JSON block is the signal that the interview is complete.

    CRITICAL INSTRUCTION: Analyze the student's profile to create a 'recommendedLearningPath'. This path MUST be an array containing one or more course names chosen STRICTLY from this list: ${availableCourses.join(', ')}.

    The JSON object MUST follow this exact format, enclosed in triple backticks and prefixed with 'REPORT_DATA_JSON:::':
    \`\`\`REPORT_DATA_JSON:::
    {
      "studentName": "Extracted Full Name",
      "studentEmail": "Extracted Email Address",
      "interviewDate": "${new Date().toISOString()}",
      "reportSummary": "A concise, professional summary of the student's profile.",
      "recommendedLearningPath": ["Introduction to Industrial Systems"],
      "interviewScore": 75,
      "strengths": ["Identified Strength 1"],
      "weaknesses": ["Identified Weakness 1"],
      "experience": "Extracted Experience Level",
      "skills": ["Skill A", "Skill B"],
      "interests": ["Interest X", "Interest Y"],
      "goals": "Extracted Career Goals"
    }
    \`\`\`
    `;

    let messagesForOpenAI: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [{ role: 'system', content: systemPrompt }];
    messagesForOpenAI = messagesForOpenAI.concat(conversationHistory);

    if (action === 'start_interview' && conversationHistory.length === 0) {
      messagesForOpenAI.push({ role: 'user', content: 'Begin the interview by asking the first question.' });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messagesForOpenAI,
      temperature: 0.7,
      max_tokens: 1500,
    });

    const aiResponseContent = completion.choices[0].message.content || "";
    const jsonMatch = aiResponseContent.match(/```REPORT_DATA_JSON:::(.*?)```/s);
    
    let finalAiResponse = aiResponseContent;
    let reportData;
    let interviewStatus = 'ongoing';

    if (jsonMatch && jsonMatch[1]) {
      try {
        reportData = JSON.parse(jsonMatch[1].trim());
        interviewStatus = 'completed';
        finalAiResponse = aiResponseContent.replace(jsonMatch[0], '').trim() || "Thank you! I have gathered all the necessary information.";
      } catch (e) {
        console.error("Failed to parse AI JSON response:", e);
      }
    }

    return NextResponse.json({ aiResponse: finalAiResponse, interviewStatus, reportData });

  } catch (error: any) {
    console.error('API Error:', error.message);
    return NextResponse.json({ error: `API Error: ${error.message}` }, { status: 500 });
  }
}