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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <span className="text-lg text-foreground">Loading your experience...</span>
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
        <div className="max-w-md mx-auto my-12 p-8 bg-surface rounded-xl shadow-lg border">
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-success mx-auto mb-4"/>
            <h2 className="text-3xl font-bold text-primary mb-4">Interview Complete!</h2>
            <p className="text-onSurfaceVariant mb-6">
              Your report has been submitted for review. If your application is approved, you'll receive an email to set your password.
            </p>
            <button 
              onClick={handleReturnHome} 
              className="w-full px-6 py-3 bg-primary text-onPrimary rounded-lg font-medium hover:bg-primaryDark transition elevation-2 hover:elevation-4"
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
        <div className="max-w-md mx-auto my-12 p-8 bg-surface rounded-xl shadow-lg border">
          <button 
            onClick={() => setFlowState('roleSelection')} 
            className="flex items-center text-sm text-secondary hover:text-primary mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-1"/> Back
          </button>
          <div className="text-center">
            <School className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-primary mb-6">Welcome, Learner!</h2>
            <div className="space-y-4">
              <button 
                onClick={handleNewStudentStart} 
                className="w-full px-6 py-3 bg-primary text-onPrimary rounded-lg font-medium hover:bg-primaryDark transition elevation-2 hover:elevation-4"
              >
                New Student (Start AI Interview)
              </button>
              <button 
                onClick={() => { setInitialRoleSelection('learner'); setFlowState('auth'); }} 
                className="w-full px-6 py-3 bg-secondaryContainer text-onSecondaryContainer rounded-lg font-medium hover:bg-secondaryContainerDark transition elevation-2 hover:elevation-4"
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
            <div className="inline-flex items-center justify-center bg-primary/10 text-primary px-6 py-2 rounded-full mb-4 shadow-sm">
              <Rocket className="w-5 h-5 mr-2" />
              <span className="font-medium">Future of Learning</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              Discover Your <span className="text-secondary">Perfect</span> Path
            </h1>
            <p className="text-xl text-onSurfaceVariant max-w-2xl mx-auto">
              Join our platform to unlock personalized learning experiences tailored just for you.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div 
              onClick={() => setFlowState('learnerChoice')}
              className="bg-surface rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-outline hover:border-primary"
            >
              <div className="bg-primary/10 p-4 rounded-full w-max mb-6">
                <User className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-primary mb-3">Learner</h3>
              <p className="text-onSurfaceVariant mb-6">
                Start your personalized learning journey with our AI-powered platform.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-primary">Get Started</span>
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 text-onPrimary rotate-180" />
                </div>
              </div>
            </div>
            
            <div 
              onClick={() => handlePortalSelection('company')}
              className="bg-surface rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-outline hover:border-primary"
            >
              <div className="bg-tertiary/10 p-4 rounded-full w-max mb-6">
                <Building2 className="w-8 h-8 text-tertiary" />
              </div>
              <h3 className="text-2xl font-bold text-tertiary mb-3">Company</h3>
              <p className="text-onSurfaceVariant mb-6">
                Access top talent and manage your organization's learning programs.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-tertiary">Company Portal</span>
                <div className="w-8 h-8 bg-tertiary rounded-full flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 text-onTertiary rotate-180" />
                </div>
              </div>
            </div>
            
            <div 
              onClick={() => handlePortalSelection('recruiter')}
              className="bg-surface rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-outline hover:border-primary"
            >
              <div className="bg-secondary/10 p-4 rounded-full w-max mb-6">
                <Search className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-2xl font-bold text-secondary mb-3">Recruiter</h3>
              <p className="text-onSurfaceVariant mb-6">
                Find and connect with exceptional talent in our growing network.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary">Recruiter Portal</span>
                <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 text-onSecondary rotate-180" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-16 text-onSurfaceVariant">
            <p>Join thousands of learners and organizations transforming their futures</p>
          </div>
        </div>
      );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <main className="min-h-screen bg-background text-foreground transition-colors duration-300">
        {contentToRender}
      </main>
    </ThemeProvider>
  );
}