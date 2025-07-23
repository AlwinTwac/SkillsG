'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseAuthUser, signOut } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, Building2, Briefcase } from 'lucide-react';
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
  interviewReport?: any;
  name?: string;
  experience?: string;
  skills?: string[];
  interests?: string[];
  goals?: string;
  profileVisibility?: 'private' | 'public';
  paidForPublic?: boolean;
}

export default function Home() {
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialRoleSelection, setInitialRoleSelection] = useState<'none' | 'learner' | 'company' | 'recruiter'>('none');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);

        const initialDocSnap = await getDoc(userDocRef);
        if (initialDocSnap.exists()) {
          setUserProfile(initialDocSnap.data() as UserProfile);
        } else {
          console.warn("User document not found for authenticated user.");
          setUserProfile({
            email: currentUser.email || 'unknown',
            displayName: currentUser.displayName ??undefined,
            photoURL: currentUser.photoURL ?? undefined,
            createdAt: new Date().toISOString(),
            authProvider: 'unknown',
            profileCompleted: false,
            role: 'student'
          });
        }
        setLoading(false);

        const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
          } else {
            setUserProfile(null);
            signOut(auth);
          }
        }, (error) => {
          console.error("Error listening to user profile:", error);
          setLoading(false);
        });
        return () => unsubscribeFirestore();
      } else {
        setUserProfile(null);
        setLoading(false);
        setInitialRoleSelection('none');
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleAuthSuccess = (loggedInUser: FirebaseAuthUser) => {
    setUser(loggedInUser);
  };

  const handleInterviewComplete = () => {
    console.log("AI Interview completed and profile updated.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium animate-pulse">Loading your experience...</p>
        </div>
      </div>
    );
  }

  let contentToRender;

  if (user) {
    if (!userProfile) {
      contentToRender = (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-xl text-center">
          <p className="text-xl text-purple-700 font-medium">Getting your profile ready...</p>
        </div>
      );
    } else if (userProfile.role === 'student' && !userProfile.profileCompleted) {
      contentToRender = <AIInterviewer user={user} onInterviewComplete={handleInterviewComplete} />;
    } else {
      switch (userProfile.role) {
        case 'student':
          contentToRender = <StudentDashboard userDisplayName={userProfile.name || user.displayName } userEmail={user.email} userUid={user.uid} />;
          break;
        case 'company':
          contentToRender = <CompanyDashboard userDisplayName={userProfile.displayName ?? null} userEmail={user.email} userUid={user.uid} />;
          break;
        case 'recruiter':
          contentToRender = (
          <RecruiterDashboard userDisplayName={userProfile.name || user.displayName} userEmail={user.email} />

          );
          break;        default:
          contentToRender = (
            <div className="max-w-4xl mx-auto text-center bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-2xl">
              <h2 className="text-3xl font-bold text-red-600 mb-4">Unknown Role</h2>
              <p className="text-lg text-gray-700 mb-6">Your account role is not recognized. Please contact support.</p>
              <button 
                onClick={() => signOut(auth)} 
                className="mt-4 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 font-medium"
              >
                Sign Out
              </button>
            </div>
          );
      }
    }
  } else {
    if (initialRoleSelection === 'none') {
      contentToRender = (
        <div className="max-w-6xl mx-auto text-center animate-fade-in">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-2xl mb-12">
            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-6">
              Welcome to SkillsG Learning Platform
            </h1>
            <p className="text-xl text-gray-700 mb-8">
              Discover your perfect learning journey with us
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div
              onClick={() => setInitialRoleSelection('learner')}
              className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col items-center justify-center border-2 border-blue-100 hover:border-blue-300 group"
            >
              <div className="bg-blue-100 p-4 rounded-full mb-6 group-hover:bg-blue-200 transition-colors duration-300">
                <User className="w-12 h-12 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-blue-800 mb-3">I'm a Learner</h2>
              <p className="text-gray-600 mb-4">Start your personalized learning journey with AI.</p>
              <button className="px-5 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700 transition-colors duration-300">
                Get Started
              </button>
            </div>
            
            <div
              onClick={() => setInitialRoleSelection('company')}
              className="bg-gradient-to-br from-green-50 to-teal-100 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col items-center justify-center border-2 border-green-100 hover:border-green-300 group"
            >
              <div className="bg-green-100 p-4 rounded-full mb-6 group-hover:bg-green-200 transition-colors duration-300">
                <Building2 className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-green-800 mb-3">Kimtronix Global</h2>
              <p className="text-gray-600 mb-4">Manage training and monitor student progress.</p>
              <button className="px-5 py-2 bg-green-600 text-white rounded-full text-sm font-medium hover:bg-green-700 transition-colors duration-300">
                Get Started
              </button>
            </div>
            
            <div
              onClick={() => setInitialRoleSelection('recruiter')}
              className="bg-gradient-to-br from-purple-50 to-violet-100 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col items-center justify-center border-2 border-purple-100 hover:border-purple-300 group"
            >
              <div className="bg-purple-100 p-4 rounded-full mb-6 group-hover:bg-purple-200 transition-colors duration-300">
                <Briefcase className="w-12 h-12 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-purple-800 mb-3">I'm a Recruiter</h2>
              <p className="text-gray-600 mb-4">Browse student profiles and discover talent.</p>
              <button className="px-5 py-2 bg-purple-600 text-white rounded-full text-sm font-medium hover:bg-purple-700 transition-colors duration-300">
                Get Started
              </button>
            </div>
          </div>
        </div>
      );
    } else {
      contentToRender = (
        <AuthComponent
          onAuthSuccess={handleAuthSuccess}
          defaultRole={initialRoleSelection}
        />
      );
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {contentToRender}
      </div>
    </main>
  );
}