// app/recruiter/browse-students/page.tsx
'use client'; // This page needs client-side functionality (useState, useEffect, useRouter)

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseAuthUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation'; // Correct import for App Router

import StudentBrowser from '@/components/studentbrowser'; // Your component

interface UserProfile {
  role: string;
}

export default function BrowseStudentsPage() {
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/'); // Redirect to home if not logged in
        return;
      }
      setUser(currentUser);

      const userDocRef = doc(db, 'users', currentUser.uid);
      const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const profile = docSnap.data() as UserProfile;
          if (profile.role !== 'recruiter') {
            router.push('/'); // Redirect if not a recruiter
            return;
          }
          setUserProfile(profile);
          setLoading(false);
        } else {
          router.push('/'); // Redirect if user doc not found (e.g., deleted profile)
        }
      }, (error) => {
        console.error("Error fetching user profile:", error);
        router.push('/'); // Redirect on error
      });

      return () => unsubscribeFirestore();
    });

    return () => unsubscribeAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading recruiter access...</p>
        </div>
      </div>
    );
  }

  if (user && userProfile && userProfile.role === 'recruiter') {
    return <StudentBrowser />;
  }

  return null; // Should ideally not be reached if redirects work
}