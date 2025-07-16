
import { NextResponse } from 'next/server';

import OpenAI from 'openai';



// Initialize OpenAI client with your API key

// Ensure OPENAI_API_KEY is correctly set in your .env.local file

const openai = new OpenAI({

  apiKey: process.env.OPENAI_API_KEY,

});



// Define the expected structure of a message in the conversation history

interface ConversationMessage {

  role: 'user' | 'assistant';

  content: string;

}



// Define the expected structure of the student profile for context

interface StudentProfile {

  uid: string;

  name: string;

  email: string;

  experience?: string;

  skills?: string[];

  interests?: string[];

  goals?: string;

}



// Define the structure of the data expected from the client

interface ClientRequestData {

  conversationHistory: ConversationMessage[];

  studentProfile: StudentProfile;

  action: 'start_interview' | 'continue_interview';

}



// Define the structure of the data sent back to the client

interface ServerResponseData {

  aiResponse: string;

  interviewStatus: 'ongoing' | 'completed';

  reportData?: { // This will contain the generated enrollment report details

    studentName: string;

    studentEmail: string;

    interviewDate: string;

    reportSummary: string;

    recommendedLearningPath?: string[];

    interviewScore?: number;

    strengths?: string[];

    weaknesses?: string[];

    experience?: string; // Potentially parsed by AI

    skills?: string[];

    interests?: string[];

    goals?: string;

  };

}



export async function POST(request: Request) {

  try {

    const { conversationHistory, studentProfile, action }: ClientRequestData = await request.json();



    // Check if the OpenAI API key is configured

    if (!process.env.OPENAI_API_KEY) {

      console.error('OpenAI API key not configured in environment variables.');

      return NextResponse.json({ error: 'OpenAI API key not configured.' }, { status: 500 });

    }



    let messagesForOpenAI: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    let interviewStatus: 'ongoing' | 'completed' = 'ongoing';

    let reportData: ServerResponseData['reportData'] | undefined;



    // System message to guide the AI's persona and objective

    // This prompt is critical for guiding the AI's behavior and output format.

    const systemPrompt = `You are an AI interviewer for a learning platform. Your goal is to conduct a conversational interview to gather information about a student's full name, current experience level, technical skills, learning interests, and career goals. Keep your questions concise and ask one question at a time.



Once you have definitively collected ALL of the following information:

- Full Name

- Current Experience Level (e.g., Beginner, Intermediate, Advanced, or a brief description)

- Key Technical Skills (list, even if few, comma-separated)

- Primary Learning Interests (list, comma-separated)

- Career Goals/Aspirations



...you MUST respond with a special JSON object after your final conversational message. The JSON object should be a valid stringified JSON.



Your final conversational message should clearly state that you have gathered all necessary information and are ready to finalize their personalized enrollment report.



The JSON object MUST follow this exact format, enclosed in triple backticks and prefixed with 'REPORT_DATA_JSON:::':

\`\`\`REPORT_DATA_JSON:::

{

  "studentName": "Extracted Student Full Name",

  "studentEmail": "Extracted Student Email",

  "interviewDate": "${new Date().toISOString()}", // Auto-filled current date

  "reportSummary": "A concise summary of the student's profile, including their experience, skills, interests, and goals, phrased professionally and objectively.",

  "recommendedLearningPath": ["Path 1", "Path 2"], // Based on interests/goals (e.g., "Web Development Fundamentals", "Advanced Data Science", "Cloud Architecture")

  "interviewScore": 1 to 100, // A score reflecting the completeness and depth of the provided information, e.g., 75

  "strengths": ["Strength 1", "Strength 2"], // Identified strengths (e.g., "Clear career objectives", "Strong foundational skills in X")

  "weaknesses": ["Weakness 1", "Weakness 2"], // Areas for improvement (e.g., "Limited practical experience in Y", "Goals could be more specific")

  "experience": "Extracted Experience Level", // e.g., "Intermediate", "5 years in software development"

  "skills": ["Skill A", "Skill B"], // Extracted list of skills (e.g., "JavaScript", "Python", "Cloud Computing")

  "interests": ["Interest X", "Interest Y"], // Extracted list of interests (e.g., "AI/ML", "Cybersecurity", "Frontend Development")

  "goals": "Extracted Career Goals" // The student's stated career goals

}

\`\`\`



If you haven't collected all required information, continue asking follow-up questions politely and encouragingly. Do not generate the JSON until all required fields are sufficiently covered.



Current Student Profile Context (use this to guide your questions and report generation, but prioritize information directly from the conversation):

${JSON.stringify(studentProfile, null, 2)}

`;



    // Add system message to the beginning of the messages array

    messagesForOpenAI.push({

      role: 'system',

      content: systemPrompt,

    });



    // Add previous conversation history from the client

    messagesForOpenAI = messagesForOpenAI.concat(conversationHistory);



    // If starting a new interview, add an initial user message to prompt the AI

    if (action === 'start_interview' && conversationHistory.length === 0) {

        messagesForOpenAI.push({

            role: 'user',

            content: `Begin the interview. Start with the first question to collect information about the student. Their name is pre-filled as ${studentProfile.name || 'not yet provided'} and email as ${studentProfile.email || 'not yet provided'}.`,

        });

    }



    // Call OpenAI API

    const completion = await openai.chat.completions.create({

      model: "gpt-3.5-turbo", // Consider "gpt-4" for higher quality if available and cost allows

      messages: messagesForOpenAI,

      max_tokens: 1000, // Increased max_tokens to allow for longer responses and report JSON

      temperature: 0.7, // Controls creativity (0.0 for deterministic, 1.0 for very creative)

    });



    const aiResponseContent = completion.choices[0].message.content || "An unexpected error occurred.";



    // Attempt to extract the special JSON string from the AI's response

    const jsonMatch = aiResponseContent.match(/```REPORT_DATA_JSON:::(.*?)```/s);



    let finalAiResponse = aiResponseContent; // Default to full AI response

    let parsedReportData: ServerResponseData['reportData'] | undefined; // Declare parsedReportData here



    if (jsonMatch && jsonMatch[1]) {

      try {

        const jsonString = jsonMatch[1].trim();

        parsedReportData = JSON.parse(jsonString); // Parse into local variable



        // Validate essential fields in the parsed data

        if (!parsedReportData || !parsedReportData.studentName || !parsedReportData.studentEmail || !parsedReportData.reportSummary) {

          throw new Error("Missing essential fields in AI generated report data or invalid JSON structure.");

        }



        // If validation passes, set the reportData for the final response

        reportData = parsedReportData;

        interviewStatus = 'completed';

       

        // Remove the JSON block from the AI's message before sending to the client

        finalAiResponse = aiResponseContent.replace(jsonMatch[0], '').trim();

        // Fallback conversational message if AI's original message was only the JSON

        if (!finalAiResponse) {

          finalAiResponse = "Thank you! I have gathered all the necessary information and your personalized report is ready.";

        }



      } catch (parseError) {

        console.error("Error parsing AI generated report data:", parseError);

        // If parsing or validation fails, keep interview ongoing and inform the user

        interviewStatus = 'ongoing';

        finalAiResponse = "I encountered an issue processing your information. Could you please re-confirm your details or provide more clarity?";

        reportData = undefined; // Clear potentially corrupted data

      }

    }



    const responseData: ServerResponseData = {

      aiResponse: finalAiResponse,

      interviewStatus: interviewStatus,

      reportData: reportData,

    };



    return NextResponse.json(responseData);



  } catch (error: any) {

    console.error('API Error:', error.response ? error.response.data : error.message);

    // Return a generic error message to the client for security

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