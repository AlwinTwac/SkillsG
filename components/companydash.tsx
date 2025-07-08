'use client';

import React, { useEffect, useState } from 'react';
import { Building2, User, FileText, Upload, LogOut } from 'lucide-react';
import { collection, query, getDocs } from 'firebase/firestore'; 
import { auth, db } from '@/lib/firebase'; 
import ReportViewer from '@/components/reports'; 

interface CompanyDashboardProps {
  userDisplayName: string | null;
  userEmail: string | null;
}

interface StudentReportSummary {
  uid: string;
  name: string;
  email: string;
  assessmentLevel: string;
  recommendedPath: string;
  reportId: string;
  enrollmentDate: string;
  fullReport: any; // Store the full report data
}

export default function CompanyDashboard({ userDisplayName, userEmail }: CompanyDashboardProps) {
  const [studentReports, setStudentReports] = useState<StudentReportSummary[]>([]);
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudentReports = async () => {
      setLoadingReports(true);
      setError(null);
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef); // You might add filters later, e.g., where('role', '==', 'student')
        const querySnapshot = await getDocs(q);

        const reports: StudentReportSummary[] = [];
        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          if (userData.role === 'student' && userData.profileCompleted && userData.interviewReport) {
            reports.push({
              uid: doc.id,
              name: userData.name || userData.displayName || userData.email?.split('@')[0],
              email: userData.email,
              assessmentLevel: userData.interviewReport.assessmentLevel,
              recommendedPath: userData.interviewReport.recommendedPath,
              reportId: userData.interviewReport.reportId,
              enrollmentDate: userData.interviewReport.enrollmentDate,
              fullReport: userData.interviewReport,
            });
          }
        });
        setStudentReports(reports);
      } catch (err) {
        console.error("Error fetching student reports:", err);
        setError("Failed to load student reports.");
      } finally {
        setLoadingReports(false);
      }
    };

    fetchStudentReports();
  }, []);

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
    <div className="max-w-6xl mx-auto p-8 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
        <h2 className="text-3xl font-bold text-gray-800 flex items-center">
          <Building2 className="w-8 h-8 text-indigo-600 mr-3" />
          Company Dashboard
        </h2>
        <div className="flex items-center">
          <span className="text-gray-600 mr-4">
            Hello, {userDisplayName || userEmail?.split('@')[0] || 'Company Admin'}!
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
        Manage your students' learning journeys and view their progress.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-yellow-50 p-6 rounded-lg shadow-sm flex items-start">
          <FileText className="w-8 h-8 text-yellow-600 mr-4 mt-1" />
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Student Enrollment Reports</h3>
            <p className="text-gray-600">
              View detailed reports from AI interviews for all students.
            </p>
          </div>
        </div>

        <div className="bg-green-50 p-6 rounded-lg shadow-sm flex items-start">
          <Upload className="w-8 h-8 text-green-600 mr-4 mt-1" />
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Manage Learning Content</h3>
            <p className="text-gray-600">
              Upload and organize weekly training materials for your students.
            </p>
          </div>
        </div>
        
        {/* Add more company-specific modules here */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-sm flex items-start">
          <Building2 className="w-8 h-8 text-gray-600 mr-4 mt-1" />
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Student Progress Tracking</h3>
            <p className="text-gray-600">
              Monitor student engagement and completion rates.
            </p>
          </div>
        </div>
      </div>

      <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
        <FileText className="w-6 h-6 mr-2 text-indigo-600" /> All Student Reports
      </h3>

      {loadingReports ? (
        <div className="text-center text-gray-600 py-8">Loading student reports...</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p>{error}</p>
        </div>
      ) : studentReports.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
          <p>No student reports found yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-1 bg-gray-50 p-4 rounded-lg shadow-inner max-h-[600px] overflow-y-auto">
            <h4 className="text-xl font-semibold mb-4 text-gray-700">Select a Report</h4>
            {studentReports.map((report) => (
              <div
                key={report.uid}
                onClick={() => setSelectedReport(report.fullReport)}
                className={`cursor-pointer p-4 mb-2 rounded-lg transition-colors duration-200 border ${
                  selectedReport?.reportId === report.reportId
                    ? 'bg-indigo-100 border-indigo-500 shadow'
                    : 'bg-white border-gray-200 hover:bg-gray-100'
                }`}
              >
                <p className="font-semibold text-gray-800">{report.name}</p>
                <p className="text-sm text-gray-600">{report.email}</p>
                <p className="text-xs text-gray-500 mt-1">Level: {report.assessmentLevel} | Path: {report.recommendedPath}</p>
              </div>
            ))}
          </div>
          <div className="lg:col-span-1">
            {selectedReport ? (
              <ReportViewer report={selectedReport} userEmail={selectedReport.studentInfo?.email || ''} />
            ) : (
              <div className="bg-gray-100 p-8 rounded-lg shadow-inner h-full flex items-center justify-center text-gray-500">
                Select a student from the list to view their full report.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}