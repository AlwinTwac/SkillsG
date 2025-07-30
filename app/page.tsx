'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously, signOut, User as FirebaseAuthUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, Building2, Briefcase, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { ThemeSwitcher } from '@/components/theme-switcher';
import AuthComponent from '@/components/login';
import AIInterviewer from '@/components/interviewerai';
import StudentDashboard from '@/components/studentdash';
import CompanyDashboard from '@/components/companydash';
import RecruiterDashboard from '@/components/recruiter';

// --- Interfaces ---
interface UserProfile {
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
  authProvider: string;
  profileCompleted: boolean;
  role: 'student' | 'company' | 'recruiter';
  name?: string;
}

interface TempReportData {
    studentName: string;
    studentEmail: string;
    interviewDate: string;
    reportSummary: string;
    experience?: string;
    skills?: string[];
    interests?: string[];
    goals?: string;
}

export default function Home() {
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  // A single state to manage the entire user flow
  const [flowState, setFlowState] = useState<'roleSelection' | 'learnerChoice' | 'interviewing' | 'interviewComplete' | 'auth' | 'dashboard'>('roleSelection');
  
  const [initialRoleSelection, setInitialRoleSelection] = useState<'learner' | 'company' | 'recruiter'>('learner');

  // Main effect to handle authentication and user state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && !currentUser.isAnonymous) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
            setFlowState('dashboard');
          } else {
            signOut(auth);
          }
          setLoading(false);
        });
        return () => unsubscribeFirestore();
      } else if (currentUser && currentUser.isAnonymous) {
        setFlowState('interviewing');
        setLoading(false);
      } else {
        setUserProfile(null);
        setFlowState('roleSelection');
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Handler for a new student starting the interview process
  const handleNewStudentStart = async () => {
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Anonymous sign-in failed:", error);
      setLoading(false);
    }
  };

  // Called from AIInterviewer when the interview is finished
  const handleInterviewComplete = () => {
    setFlowState('interviewComplete'); // Move to the "Thank You" screen
  };

  const handleAuthSuccess = (loggedInUser: FirebaseAuthUser) => {
    // This handles a regular login, not a post-interview signup
    setFlowState('dashboard');
  };
  
  // Resets the state before showing the login form for Company or Recruiter
  const handlePortalSelection = (role: 'company' | 'recruiter') => {
    if (user && user.isAnonymous) {
        signOut(auth);
    }
    setInitialRoleSelection(role);
    setFlowState('auth');
  };

  // --- THIS IS THE NEW HANDLER FOR THE RETURN BUTTON ---
  const handleReturnHome = () => {
    if (user && user.isAnonymous) {
      signOut(auth);
    }
    setFlowState('roleSelection');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // --- Main Render Logic ---
  let contentToRender;

  switch (flowState) {
    case 'dashboard':
      if (user && userProfile) {
        switch (userProfile.role) {
          case 'student': contentToRender = <StudentDashboard userDisplayName={userProfile.name || user.displayName} userEmail={user.email} userUid={user.uid} />; break;
          case 'company': contentToRender = <CompanyDashboard userDisplayName={userProfile.displayName ?? null} userEmail={user.email} userUid={user.uid} />; break;
          case 'recruiter': contentToRender = <RecruiterDashboard userDisplayName={userProfile.name || user.displayName} userEmail={user.email} />; break;
        }
      }
      break;

    case 'interviewing':
      if (user) {
        contentToRender = <AIInterviewer user={user} onInterviewComplete={handleInterviewComplete} onGoBack={handleReturnHome} />;
      }
      break;

    case 'interviewComplete':
      contentToRender = (
        <div className="max-w-md mx-auto text-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4"/>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Interview Complete!</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your report has been submitted for review. If your application is approved, you will receive an email with a link to set your password. Please remember to check your spam folder.
            </p>
            <button 
              onClick={handleReturnHome} 
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition"
            >
              Return Home
            </button>
        </div>
      );
      break;

    case 'auth':
      contentToRender = (
        <AuthComponent 
          onAuthSuccess={handleAuthSuccess} 
          defaultRole={initialRoleSelection} 
          onBack={handleReturnHome}  // This enables the back button
        />
      );
      break;

    case 'learnerChoice':
      contentToRender = (
        <div className="max-w-md mx-auto text-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-2xl">
            <button onClick={() => setFlowState('roleSelection')} className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:underline mb-6"><ArrowLeft className="w-4 h-4 mr-1"/> Back</button>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Welcome, Learner!</h2>
            <div className="space-y-4">
                <button onClick={handleNewStudentStart} className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition">I'm a New Student (Start AI Interview)</button>
                <button onClick={() => { setInitialRoleSelection('learner'); setFlowState('auth'); }} className="w-full px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold text-lg hover:bg-gray-300 transition">I Already Have an Account (Login)</button>
            </div>
        </div>
      );
      break;
      
    default: // 'roleSelection'
      contentToRender = (
        <div className="max-w-6xl mx-auto text-center relative">
          <div className="absolute top-4 right-4 z-10"><ThemeSwitcher /></div>
          <div className="bg-blue-100 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-2xl mb-12">
            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-6">Welcome to KG Learning Platform</h1>
            <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">Discover your perfect learning journey with us</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div onClick={() => setFlowState('learnerChoice')} className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col items-center justify-center border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-700 group">
              <div className="bg-blue-100 dark:bg-blue-800 p-4 rounded-full mb-4 group-hover:bg-blue-200 dark:group-hover:bg-blue-700 transition">
                <User className="w-8 h-8 text-blue-600 dark:text-blue-300" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Learner</h3>
              <p className="text-gray-600 dark:text-gray-300">Start your learning journey with our AI-powered platform</p>
              <button className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">Get Started</button>
            </div>
            <div onClick={() => handlePortalSelection('company')} className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col items-center justify-center border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-700 group">
              <div className="bg-blue-100 dark:bg-blue-800 p-4 rounded-full mb-4 group-hover:bg-blue-200 dark:group-hover:bg-blue-700 transition">
                <Building2 className="w-8 h-8 text-blue-600 dark:text-blue-300" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Company</h3>
              <p className="text-gray-600 dark:text-gray-300">Access talent and manage your organization's learning programs</p>
              <button className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">Company Portal</button>
            </div>
            <div onClick={() => handlePortalSelection('recruiter')} className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col items-center justify-center border-2 border-transparent hover:border-blue-300 dark:hover:border-blue-700 group">
              <div className="bg-blue-100 dark:bg-blue-800 p-4 rounded-full mb-4 group-hover:bg-blue-200 dark:group-hover:bg-blue-700 transition">
                <Briefcase className="w-8 h-8 text-blue-600 dark:text-blue-300" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Recruiter</h3>
              <p className="text-gray-600 dark:text-gray-300">Find and connect with top talent in our network</p>
              <button className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">Recruiter Portal</button>
            </div>
          </div>
        </div>
      );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-100 via-blue-200 to-blue-300 dark:from-blue-800 dark:via-blue-700 dark:to-blue-600 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-500">
      <div className="max-w-7xl mx-auto">
        {contentToRender}
      </div>
    </main>
  );
}