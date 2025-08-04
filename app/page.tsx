'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously, signOut, User as FirebaseAuthUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, Building2, Briefcase, ArrowLeft, Loader2, CheckCircle, Rocket, School, Search } from 'lucide-react';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeSwitcher } from '@/components/theme-switcher';
import AuthComponent from '@/components/login';
import AIInterviewer from '@/components/interviewerai';
import StudentDashboard from '@/components/studentdash';
import CompanyDashboard from '@/components/companydash';
import RecruiterDashboard from '@/components/recruiter';
//import tailwindConfig from '@/tailwind.config';

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

type FlowState = 'roleSelection' | 'learnerChoice' | 'interviewing' | 'interviewComplete' | 'auth' | 'dashboard';
type InitialRole = 'learner' | 'company' | 'recruiter';

export default function Home() {
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [flowState, setFlowState] = useState<FlowState>('roleSelection');
  const [initialRoleSelection, setInitialRoleSelection] = useState<InitialRole>('learner');

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

  const handleNewStudentStart = async () => {
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Anonymous sign-in failed:", error);
      setLoading(false);
    }
  };

  const handleInterviewComplete = () => {
    setFlowState('interviewComplete');
  };

  const handleAuthSuccess = (loggedInUser: FirebaseAuthUser) => {
    setFlowState('dashboard');
  };
  
  const handlePortalSelection = (role: 'company' | 'recruiter') => {
    if (user && user.isAnonymous) {
      signOut(auth);
    }
    setInitialRoleSelection(role);
    setFlowState('auth');
  };

  const handleReturnHome = () => {
    if (user && user.isAnonymous) {
      signOut(auth);
    }
    setFlowState('roleSelection');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-spring-50">
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-spring-600 animate-spin mb-4" />
          <span className="text-lg text-spring-800">Loading your experience...</span>
        </div>
      </div>
    );
  }

  let contentToRender;

  switch (flowState) {
    case 'dashboard':
      if (user && userProfile) {
        switch (userProfile.role) {
          case 'student': 
            contentToRender = <StudentDashboard userDisplayName={userProfile.name || user.displayName || ''} userEmail={user.email || ''} userUid={user.uid} />; 
            break;
          case 'company': 
            contentToRender = <CompanyDashboard userDisplayName={userProfile.displayName || null} userEmail={user.email || ''} userUid={user.uid} />; 
            break;
          case 'recruiter': 
            contentToRender = <RecruiterDashboard userDisplayName={userProfile.name || user.displayName || ''} userEmail={user.email || ''} />; 
            break;
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
        <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-xl shadow-lg border border-spring-100">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-spring-600 mx-auto mb-4"/>
            <h2 className="text-3xl font-bold text-spring-800 mb-4">Interview Complete!</h2>
            <p className="text-spring-700 mb-6">
              Your report has been submitted for review. If your application is approved, you'll receive an email to set your password.
            </p>
            <button 
              onClick={handleReturnHome} 
              className="w-full px-6 py-3 bg-spring-600 text-white rounded-lg font-medium hover:bg-spring-700 transition-all shadow-md hover:shadow-lg"
            >
              Return Home
            </button>
          </div>
        </div>
      );
      break;

    case 'auth':
      contentToRender = (
        <AuthComponent 
          onAuthSuccess={handleAuthSuccess} 
          defaultRole={initialRoleSelection} 
          onBack={handleReturnHome}
        />
      );
      break;

    case 'learnerChoice':
      contentToRender = (
        <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-xl shadow-lg border border-teal-100">
          <button 
            onClick={() => setFlowState('roleSelection')} 
            className="flex items-center text-sm text-teal-600 hover:text-spring-800 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-1"/> Back
          </button>
          <div className="text-center">
            <School className="w-12 h-12 text-teal-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-teal-800 mb-6">Welcome, Learner!</h2>
            <div className="space-y-4">
              <button 
                onClick={handleNewStudentStart} 
                className="w-full px-6 py-3 bg-teal-600 text-teal-100 rounded-lg font-medium hover:bg-teal-700 transition-all shadow-md hover:shadow-lg"
              >
                New Student (Start AI Interview)
              </button>
              <button 
                onClick={() => { setInitialRoleSelection('learner'); setFlowState('auth'); }} 
                className="w-full px-6 py-3 bg-teal-100 text-teal-800 rounded-lg font-medium hover:bg-teal-200 transition-all shadow-sm hover:shadow-md"
              >
                Existing Account (Login)
              </button>
            </div>
          </div>
        </div>
      );
      break;
      
    default: // 'roleSelection'
      contentToRender = (
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="fixed top-4 right-4 z-50">
            <ThemeSwitcher />
          </div>
          
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center bg-spring-100 text-spring-800 px-6 py-2 rounded-full mb-4 shadow-sm">
              <Rocket className="w-5 h-5 mr-2" />
              <span className="font-medium">KG LEARNING PLATFORM</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-spring-800 mb-4">
              Discover Your <span className="text-spring-600">Perfect</span> Path
            </h1>
            <p className="text-xl text-spring-700 max-w-2xl mx-auto">
              Join our platform today to become an ISD.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div 
              onClick={() => setFlowState('learnerChoice')}
              className="bg-teal-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-spring-100 hover:border-spring-300"
            >
              <div className="bg-teal-100 p-4 rounded-full w-max mb-6">
                <User className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-2xl font-bold text-teal-800 mb-3">Learner</h3>
              <p className="text-teal-900 mb-6">
                Start your personalized learning journey with our AI-powered platform.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-teal-600">Get Started</span>
                <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 text-white rotate-180" />
                </div>
              </div>
            </div>
            
            <div 
              onClick={() => handlePortalSelection('company')}
              className="bg-teal-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-spring-100 hover:border-teal-300"
            >
              <div className="bg-teal-100 p-4 rounded-full w-max mb-6">
                <Building2 className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-2xl font-bold text-teal-800 mb-3">Company</h3>
              <p className="text-teal-900 mb-6">
                Access top talent and manage your organization's learning programs.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-teal text-teal-600">Company Portal</span>
                <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 text-white rotate-180" />
                </div>
              </div>
            </div>
            
            <div 
              onClick={() => handlePortalSelection('recruiter')}
              className="bg-teal-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-spring-100 hover:border-teal-300"
            >
              <div className="bg-teal-100 p-4 rounded-full w-max mb-6">
                <Search className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-2xl font-bold text-teal-800 mb-3">Recruiter</h3>
              <p className="text-teal-900 mb-6">
                Find and connect with exceptional talent in our growing network.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-teal-600">Recruiter Portal</span>
                <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 text-white rotate-180" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="min-h-screen flex items-center justify-center bg-spring-100">
            <p>Join thousands of learners and organizations transforming their futures</p>
          </div>
        </div>
      );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <main className="min-h-screen bg-teal-950 text-teal-100 transition-colors duration-300">
        {contentToRender}
      </main>
    </ThemeProvider>
  );
}