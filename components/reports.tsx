'use client';

import React from 'react';
import { BookOpen, Award, TrendingUp } from 'lucide-react';

interface ReportData {
  studentInfo: {
    name: string;
    email: string;
    experience: string;
    skills: string[];
    interests: string[];
    goals: string;
  };
  enrollmentDate: string;
  assessmentLevel: string;
  recommendedPath: string;
  reportId: string;
  // Potentially add a rawGeminiReport if you want to store and display detailed AI output
  // rawGeminiReport?: string; 
}

interface ReportViewerProps {
  report: ReportData;
  userEmail: string; // To display who the report is for
}

export default function ReportViewer({ report, userEmail }: ReportViewerProps) {
  if (!report || !report.studentInfo) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">
        <h2 className="text-2xl font-bold mb-4">No Report Available</h2>
        <p>It looks like your enrollment report has not been generated yet. Please complete the AI interview.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-gray-800 flex items-center">
          <BookOpen className="w-8 h-8 text-indigo-600 mr-3" />
          Enrollment Report
        </h2>
        <span className="text-sm text-gray-500">Report ID: {report.reportId}</span>
      </div>

      <div className="mb-6 border-b pb-4 border-gray-200">
        <h3 className="text-xl font-semibold text-gray-700 mb-3">Student Information</h3>
        <p className="text-gray-700 mb-1">
          <span className="font-medium">Name:</span> {report.studentInfo.name || userEmail.split('@')[0]}
        </p>
        <p className="text-gray-700 mb-1">
          <span className="font-medium">Email:</span> {report.studentInfo.email || userEmail}
        </p>
        <p className="text-gray-700 mb-1">
          <span className="font-medium">Experience Level:</span> {report.studentInfo.experience}
        </p>
        <p className="text-gray-700 mb-1">
          <span className="font-medium">Skills:</span> {report.studentInfo.skills?.join(', ') || 'N/A'}
        </p>
        <p className="text-gray-700 mb-1">
          <span className="font-medium">Interests:</span> {report.studentInfo.interests?.join(', ') || 'N/A'}
        </p>
        <p className="text-gray-700 mb-1">
          <span className="font-medium">Goals:</span> {report.studentInfo.goals}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-lg font-semibold text-blue-800 mb-2 flex items-center">
            <Award className="w-5 h-5 mr-2" />
            Assessed Level
          </h4>
          <p className="text-blue-700 text-2xl font-bold">{report.assessmentLevel}</p>
          <p className="text-blue-600 text-sm mt-1">
            (Determined from your experience and skills)
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="text-lg font-semibold text-green-800 mb-2 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Recommended Learning Path
          </h4>
          <p className="text-green-700 text-2xl font-bold">{report.recommendedPath}</p>
          <p className="text-green-600 text-sm mt-1">
            (Based on your stated interests and goals)
          </p>
        </div>
      </div>

      <div className="text-sm text-gray-500 mt-6 pt-4 border-t border-gray-200">
        <p>Report Generated On: {new Date(report.enrollmentDate).toLocaleString()}</p>
        <p>This report helps us tailor your learning experience.</p>
        {/* {report.rawGeminiReport && (
          <div className="mt-4 p-3 bg-gray-100 rounded-md text-xs whitespace-pre-wrap">
            <h5 className="font-semibold text-gray-700 mb-1">Raw AI Insights:</h5>
            <p>{report.rawGeminiReport}</p>
          </div>
        )} */}
      </div>
    </div>
  );
}