'use client';

import React from 'react';
import { LogOut, Search, Lightbulb } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation'; // Import useRouter

interface RecruiterDashboardProps {
  userDisplayName: string | null;
  userEmail: string | null;
}

export default function RecruiterDashboard({ userDisplayName, userEmail }: RecruiterDashboardProps) {
  const router = useRouter(); // Initialize useRouter

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      // Next.js will handle redirection via onAuthStateChanged in pages/index.tsx
    } catch (error) {
      console.error("Error signing out:", error);
      alert("Failed to sign out. Please try again.");
    }
  };

  const navigateToStudentBrowser = () => {
    router.push('/recruiter/browse-students'); // Navigate to the new page
  };

  const navigateToAIRecommender = () => {
    router.push('/recruiter/ai-recommendations'); // Navigate to the AI recommendations page
  };

  return (
    <div className="max-w-6xl mx-auto p-8 bg-white rounded-lg shadow-xl">
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
        <h2 className="text-3xl font-bold text-gray-800 flex items-center">
          <Lightbulb className="w-8 h-8 text-purple-600 mr-3" />
          Recruiter Dashboard
        </h2>
        <div className="flex items-center">
          <span className="text-gray-600 mr-4">
            Hello, {userDisplayName || userEmail?.split('@')[0] || 'Recruiter'}!
          </span>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center transition-colors duration-300"
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </button>
        </div>
      </div>

      <p className="text-xl text-gray-700 mb-8">
        Welcome to your recruitment hub. Discover talent and find the perfect match for your roles.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Option 1: Browse All Public Students */}
        <div
          onClick={navigateToStudentBrowser}
          className="bg-purple-50 border border-purple-200 p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col items-center text-center"
        >
          <Search className="w-16 h-16 text-purple-600 mb-4" />
          <h3 className="text-xl font-semibold text-purple-800 mb-2">Browse Student Profiles</h3>
          <p className="text-gray-600">View all public profiles of students who have completed their courses.</p>
          <button className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-300">
            Start Browse
          </button>
        </div>

        {/* Option 2: AI Recommended Candidates */}
        <div
          onClick={navigateToAIRecommender}
          className="bg-teal-50 border border-teal-200 p-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col items-center text-center"
        >
          <Lightbulb className="w-16 h-16 text-teal-600 mb-4" />
          <h3 className="text-xl font-semibold text-teal-800 mb-2">AI Recommended Candidates</h3>
          <p className="text-gray-600">Get a shortlist of candidates that best match your specific role requirements.</p>
          <button className="mt-4 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors duration-300">
            Get Recommendations
          </button>
        </div>
      </div>
    </div>
  );
}