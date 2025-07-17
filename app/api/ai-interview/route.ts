// app/api/ai-interview/route.ts

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client with your API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- Interfaces (No Changes) ---
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StudentProfile {
  uid: string;
  name: string;
  email: string;
  experience?: string;
  skills?: string[];
  interests?: string[];
  goals?: string;
}

interface ClientRequestData {
  conversationHistory: ConversationMessage[];
  studentProfile: StudentProfile;
  action: 'start_interview' | 'continue_interview';
}

interface ServerResponseData {
  aiResponse: string;
  interviewStatus: 'ongoing' | 'completed';
  reportData?: {
    studentName: string;
    studentEmail: string;
    interviewDate: string;
    reportSummary: string;
    recommendedLearningPath?: string[];
    interviewScore?: number;
    strengths?: string[];
    weaknesses?: string[];
    experience?: string;
    skills?: string[];
    interests?: string[];
    goals?: string;
  };
}

// --- API Route Handler ---
export async function POST(request: Request) {
  try {
    const { conversationHistory, studentProfile, action }: ClientRequestData = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured in environment variables.');
      return NextResponse.json({ error: 'OpenAI API key not configured.' }, { status: 500 });
    }

    let messagesForOpenAI: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
    let interviewStatus: 'ongoing' | 'completed' = 'ongoing';
    let reportData: ServerResponseData['reportData'] | undefined;

    // --- MODIFICATION: Hardcoded course details for the AI ---
    const availableCoursesInfo = `
      1. "Introduction to Industrial Systems": Covers system development careers, circuit fundamentals, system design, and business intelligence. Best for beginners or those new to the field.
      2. "In-depth ISD (Monitoring and Control Systems)": Focuses on Arduino, sensors, data handling, and practical system development. Best for those with some basic knowledge looking for hands-on experience.
      3. "Software as a Tool": Teaches HMI design, database integration, and hardware-software integration. Best for students interested in the software side of industrial systems.
      4. "Product Development": Covers PCB design, AI tools, stress testing, and documentation. Best for advanced students or those who want to learn the full product lifecycle.
    `;
    const courseNames = [
        "Introduction to Industrial Systems",
        "In-depth ISD (Monitoring and Control Systems)",
        "Software as a Tool",
        "Product Development"
    ];

    // --- MODIFICATION: System prompt is now more detailed ---
    const systemPrompt = `You are an AI interviewer for a learning platform called Kimtronix Global. Your goal is to conduct a conversational interview to gather information about a student's full name, current experience level, technical skills, learning interests, and career goals. Keep your questions concise and ask one question at a time.

Once you have definitively collected ALL of the following information:
- Full Name
- Current Experience Level (e.g., Beginner, Intermediate, Advanced, or a brief description)
- Key Technical Skills (list, even if few, comma-separated)
- Primary Learning Interests (list, comma-separated)
- Career Goals/Aspirations

...you MUST respond with a special JSON object after your final conversational message.

Your final conversational message should clearly state that you have gathered all necessary information and are ready to finalize their personalized enrollment report.

CRITICAL INSTRUCTION: Analyze the student's experience, interests, and goals to determine the most suitable learning path. The "recommendedLearningPath" field in your JSON response MUST contain one or more course names chosen STRICTLY from the list of available courses provided below. Do not invent course names.

Available ISD Courses and their descriptions:
${availableCoursesInfo}

The JSON object MUST follow this exact format, enclosed in triple backticks and prefixed with 'REPORT_DATA_JSON:::':
\`\`\`REPORT_DATA_JSON:::
{
  "studentName": "Extracted Student Full Name",
  "studentEmail": "Extracted Student Email",
  "interviewDate": "${new Date().toISOString()}",
  "reportSummary": "A concise summary of the student's profile, including their experience, skills, interests, and goals, phrased professionally and objectively.",
  "recommendedLearningPath": ["${courseNames[0]}"], 
  "interviewScore": 75,
  "strengths": ["Clear career objectives", "Strong foundational skills in X"],
  "weaknesses": ["Limited practical experience in Y", "Goals could be more specific"],
  "experience": "Extracted Experience Level",
  "skills": ["JavaScript", "Python"],
  "interests": ["AI/ML", "Cybersecurity"],
  "goals": "Extracted Career Goals"
}
\`\`\`

If you haven't collected all required information, continue asking follow-up questions politely and encouragingly. Do not generate the JSON until all required fields are sufficiently covered.

Current Student Profile Context (use this to guide your questions and report generation, but prioritize information directly from the conversation):
${JSON.stringify(studentProfile, null, 2)}
`;

    messagesForOpenAI.push({
      role: 'system',
      content: systemPrompt,
    });

    messagesForOpenAI = messagesForOpenAI.concat(conversationHistory);

    if (action === 'start_interview' && conversationHistory.length === 0) {
        messagesForOpenAI.push({
            role: 'user',
            content: `Begin the interview. Start with the first question to collect information about the student. Their name is pre-filled as ${studentProfile.name || 'not yet provided'} and email as ${studentProfile.email || 'not yet provided'}.`,
        });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messagesForOpenAI,
      max_tokens: 1200,
      temperature: 0.7,
    });

    const aiResponseContent = completion.choices[0].message.content || "An unexpected error occurred.";
    const jsonMatch = aiResponseContent.match(/```REPORT_DATA_JSON:::(.*?)```/s);
    let finalAiResponse = aiResponseContent;

    if (jsonMatch && jsonMatch[1]) {
      try {
        const jsonString = jsonMatch[1].trim();
        reportData = JSON.parse(jsonString);
        interviewStatus = 'completed';
        finalAiResponse = aiResponseContent.replace(jsonMatch[0], '').trim() || "Thank you! Your report is ready.";
      } catch (parseError) {
        console.error("Error parsing AI generated report data:", parseError);
        interviewStatus = 'ongoing';
        finalAiResponse = "I encountered an issue processing your information. Could you please re-confirm your details?";
      }
    }

    return NextResponse.json({ aiResponse: finalAiResponse, interviewStatus, reportData });

  } catch (error: any) {
    console.error('API Error:', error.response ? error.response.data : error.message);
    return NextResponse.json(
      {
        aiResponse: 'An internal error occurred during the AI interview. Please try again later.',
        interviewStatus: 'ongoing',
        error: error.message,
      },
      { status: 500 }
    );
  }
}