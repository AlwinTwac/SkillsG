import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getAdminDb } from '../../../lib/firebase-admin';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the structure of the data expected from the client
interface RequestData {
  searchCriteria: {
    searchTerm: string;
    filterSkills: string[];
    filterExperience: string;
  };
  studentProfiles: any[]; // Array of all public student profiles
}

export async function POST(request: Request) {
  try {
    const { searchCriteria, studentProfiles }: RequestData = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured.');
    }

    // Construct a clear job description for the AI
    let jobDescription = `Job requirements: ${searchCriteria.searchTerm}.`;
    if (searchCriteria.filterSkills.length > 0) {
      jobDescription += ` Required skills include: ${searchCriteria.filterSkills.join(', ')}.`;
    }
    if (searchCriteria.filterExperience) {
      jobDescription += ` The ideal candidate should have an experience level of: ${searchCriteria.filterExperience}.`;
    }

    const systemPrompt = `You are an expert AI recruiting assistant for a tech platform. I will provide you with a job description and a list of student profiles in a JSON array. 
    Your task is to:
    1. Analyze each student's skills, experience, interests, and goals against the provided job description.
    2. Return a JSON array containing ONLY the student profiles that are a good match.
    3. The array you return MUST be sorted from the absolute best match to the least relevant match.
    4. If no students are a good match, return an empty array.
    5. Ensure the output is ONLY the JSON array of student profiles, with no extra text, explanations, or markdown. The user objects in the array must have the same structure as the input.`;

    const userMessage = `
      Job Description: "${jobDescription}"

      Student Profiles:
      ${JSON.stringify(studentProfiles)}
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106", // Use a model that is good with JSON
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" }, // Enforce JSON output
      temperature: 0.3,
    });

    const responseContent = completion.choices[0].message.content;
    if (!responseContent) {
      throw new Error("AI returned an empty response.");
    }

    // The AI might return the JSON within a parent object, so we look for an array.
    const result = JSON.parse(responseContent);
    const recommendedStudents = Array.isArray(result) ? result : result.recommendedStudents || result.students || [];

    return NextResponse.json({ recommendedStudents });

  } catch (error: any) {
    console.error('API Error in /api/ai-recommend:', error);
    return NextResponse.json(
      { error: `An internal error occurred: ${error.message}` },
      { status: 500 }
    );
  }
}
