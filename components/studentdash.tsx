'use client';

import React from 'react';
import { BookOpen, Edit, Award, LayoutDashboard, LogOut } from 'lucide-react';
import { auth } from '@/lib/firebase'; // Import auth for sign out

interface StudentDashboardProps {
  userDisplayName: string | null;
  userEmail: string | null;
}

export default function StudentDashboard({ userDisplayName, userEmail }: StudentDashboardProps) {
  const handleSignOut = async () => {
    try {
      await auth.signOut();
      // Firebase onAuthStateChanged listener in page.tsx will handle redirection
    } catch (error) {
      console.error("Error signing out:", error);
      alert("Failed to sign out. Please try again.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
        <h2 className="text-3xl font-bold text-gray-800 flex items-center">
          <LayoutDashboard className="w-8 h-8 text-green-600 mr-3" />
          Student Dashboard
        </h2>
        <div className="flex items-center">
          <span className="text-gray-600 mr-4">
            Hello, {userDisplayName || userEmail?.split('@')[0] || 'Student'}!
          </span>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center"
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </button>
        </div>
      </div>

      <p className="text-xl text-gray-700 mb-6">
        Welcome to your personalized learning space. Here you can access your weekly materials, create tutorials, and track your progress.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 p-6 rounded-lg shadow-sm flex items-start">
          <BookOpen className="w-8 h-8 text-blue-600 mr-4 mt-1" />
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Weekly Learning Materials</h3>
            <p className="text-gray-600 mb-3">
              Access the company-sponsored training content. These are provided by your company to help you grow.
            </p>
            <button className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Go to Learning
            </button>
          </div>
        </div>

        <div className="bg-purple-50 p-6 rounded-lg shadow-sm flex items-start">
          <Edit className="w-8 h-8 text-purple-600 mr-4 mt-1" />
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Create Your Own Tutorials</h3>
            <p className="text-gray-600 mb-3">
              Share your knowledge! Create tutorials on what you've learned each week.
            </p>
            <button className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              Start a Tutorial
            </button>
          </div>
        </div>

        <div className="bg-green-50 p-6 rounded-lg shadow-sm flex items-start col-span-1 md:col-span-2">
          <Award className="w-8 h-8 text-green-600 mr-4 mt-1" />
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Certifications & Progress</h3>
            <p className="text-gray-600 mb-3">
              Track your learning progress and earn certifications upon completion of courses.
            </p>
            <button className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              View Progress
            </button>
          </div>
        </div>
      </div>

      {/* Future sections: Learning Path, Recent Activities, Notifications */}
    </div>
  );
}