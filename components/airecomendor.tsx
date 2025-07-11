'use client';

import React, { useState } from 'react';
import { Sparkles, Send, User, MessageSquare } from 'lucide-react';

interface StudentProfileSummary {
  uid: string;
  name: string;
  skills: string[];
  experience: string;
  interviewSummary?: string;
  //add other relevant fields that AI should consider
}

export default function AIRecommender() {
  const [jobDescription, setJobDescription] = useState('');
  const [recommendations, setRecommendations] = useState<StudentProfileSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetRecommendations = async () => {
    if (!jobDescription.trim()) {
      setError("Please provide a job description to get recommendations.");
      return;
    }

    setLoading(true);
    setError(null);
    setRecommendations(null); // Clear previous recommendations

    try {
      // --- IMPORTANT: This is a placeholder for your AI API call ---
      // In a real application, you would:
      // 1. Fetch all relevant public student profiles from Firestore (similar to StudentBrowser, but maybe with more data).
      // 2. Send these profiles AND the jobDescription to your *backend API endpoint*.
      // 3. Your backend would then use an AI model (e.g., Google's Gemini API)
      //    to compare the job description against each student's profile (skills, experience, goals, AI interview summary).
      // 4. The AI would score or rank candidates and return a shortlist.

      console.log("Simulating AI recommendation for job:", jobDescription);

      // Example of a backend API call (replace with your actual endpoint)
      const response = await fetch('/api/ai-recommend-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      setRecommendations(data.recommendedCandidates); // Assume API returns an array of candidates

      // --- Mock Data for demonstration without a backend ---
      // const mockProfiles: StudentProfileSummary[] = [
      //   { uid: 's1', name: 'Alice Smith', skills: ['Python', 'Machine Learning', 'Data Analysis'], experience: 'Completed AI & ML course with project on sentiment analysis.', interviewSummary: 'Strong analytical skills, eager to learn.' },
      //   { uid: 's2', name: 'Bob Johnson', skills: ['JavaScript', 'React', 'Node.js'], experience: 'Completed Fullstack Web Development course, built e-commerce app.', interviewSummary: 'Excellent problem-solver, collaborative team player.' },
      //   { uid: 's3', name: 'Charlie Brown', skills: ['Java', 'SQL'], experience: 'Completed Backend Development course, worked on database design.', interviewSummary: 'Detail-oriented, strong understanding of algorithms.' },
      // ];
      // setRecommendations(mockProfiles.filter(p => jobDescription.toLowerCase().includes('ai') ? p.skills.includes('Machine Learning') : p.skills.includes('React')));
      // ---------------------------------------------------

    } catch (err: any) {
      console.error("Error getting AI recommendations:", err);
      setError(`Failed to get recommendations: ${err.message || 'An unexpected error occurred.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-green-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-4xl font-extrabold text-gray-800 text-center mb-8 flex items-center justify-center">
          <Sparkles className="w-10 h-10 mr-3 text-teal-600" />
          AI Candidate Recommender
        </h1>
        <p className="text-xl text-gray-700 text-center mb-10">
          Describe the role you're recruiting for, and our AI will suggest the best-matched students.
        </p>

        <div className="mb-8">
          <label htmlFor="jobDescription" className="block text-lg font-medium text-gray-700 mb-2">
            Job Description / Required Skills:
          </label>
          <textarea
            id="jobDescription"
            rows={6}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
            placeholder="e.g., 'Looking for a junior data scientist with strong Python skills, experience in machine learning, and a passion for data analysis. Needs to be a good communicator and problem-solver.'"
          />
        </div>

        <button
          onClick={handleGetRecommendations}
          disabled={loading || !jobDescription.trim()}
          className="w-full py-3 px-6 bg-teal-600 text-white rounded-lg font-semibold text-lg hover:bg-teal-700 transition-colors duration-300 flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
              Getting Recommendations...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-3" />
              Get AI Recommendations
            </>
          )}
        </button>

        {error && (
          <div className="mt-8 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md">
            <p className="font-semibold mb-2">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {recommendations && recommendations.length > 0 && (
          <div className="mt-10">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
              <Sparkles className="w-8 h-8 mr-2 text-teal-600" />
              Recommended Candidates
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recommendations.map((profile) => (
                <div key={profile.uid} className="bg-white rounded-lg shadow-md p-6 border border-teal-200">
                  <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center">
                    <User className="w-5 h-5 mr-2 text-teal-600" />
                    {profile.name}
                  </h3>
                  <p className="text-gray-700 mb-2"><span className="font-semibold">Experience:</span> {profile.experience}</p>
                  <p className="text-gray-700 mb-2"><span className="font-semibold">Skills:</span> {profile.skills.join(', ')}</p>
                  {profile.interviewSummary && (
                    <p className="text-gray-700 mb-2 flex items-start">
                      <MessageSquare className="w-5 h-5 mr-2 flex-shrink-0 text-teal-500" />
                      <span className="font-semibold mr-1">AI Summary:</span> {profile.interviewSummary}
                    </p>
                  )}
                  <button className="mt-4 w-full px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors duration-300 shadow">
                    View Full Profile
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {recommendations && recommendations.length === 0 && !loading && !error && (
          <div className="mt-8 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-md text-center">
            <p>No candidates matched your description at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
}