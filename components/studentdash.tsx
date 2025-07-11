'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Edit, Award, LayoutDashboard, LogOut, FileText, Video, ArrowLeftCircle, Loader2 } from 'lucide-react';
import { auth, db } from '@/lib/firebase'; 
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface StudentDashboardProps {
  userDisplayName: string | null;
  userEmail: string | null;
  userUid: string; 
}

interface LearningMaterial {
  id: string; 
  companyUid: string;
  title: string;
  description: string;
  type: 'video' | 'pdf' | 'image' | 'other';
  fileUrl: string;
  uploadedAt: string; 
  accessibleStudentUids: string[];
}

export default function StudentDashboard({ userDisplayName, userEmail, userUid }: StudentDashboardProps) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<'overview' | 'learning'>('overview');
  const [learningMaterials, setLearningMaterials] = useState<LearningMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [materialsError, setMaterialsError] = useState<string | null>(null);

  useEffect(() => {
    if (activeView === 'learning' && userUid) {
      setLoadingMaterials(true);
      setMaterialsError(null);
      const materialsRef = collection(db, 'learningContent');

      const q = query(
        materialsRef,
        where('accessibleStudentUids', 'array-contains', userUid)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedMaterials: LearningMaterial[] = [];
        snapshot.forEach(docSnap => {
          fetchedMaterials.push({ id: docSnap.id, ...(docSnap.data() as Omit<LearningMaterial, 'id'>) });
        });
        setLearningMaterials(fetchedMaterials);
        setLoadingMaterials(false);
      }, (error) => {
        console.error("Error fetching learning materials:", error);
        setMaterialsError("Failed to load learning materials. Please try again.");
        setLoadingMaterials(false);
      });

      return () => unsubscribe();
    }
  }, [activeView, userUid]); 

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      router.push('/'); 
    } catch (error) {
      console.error("Error signing out:", error);
      alert("Failed to sign out. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
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
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center transition-colors duration-300"
            >
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </button>
          </div>
        </div>

        {activeView === 'overview' && (
          <>
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
                  <button
                    onClick={() => setActiveView('learning')}
                    className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300"
                  >
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
                  <button className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-300">
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
                  <button className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-300">
                    View Progress
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {activeView === 'learning' && (
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <h3 className="text-2xl font-semibold text-gray-800 flex items-center">
                <BookOpen className="w-7 h-7 mr-2 text-blue-600" />
                My Learning Materials
              </h3>
              <button
                onClick={() => setActiveView('overview')}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 flex items-center transition-colors duration-300"
              >
                <ArrowLeftCircle className="w-4 h-4 mr-2" /> Back to Dashboard
              </button>
            </div>

            {materialsError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-6">
                {materialsError}
              </div>
            )}

            {loadingMaterials ? (
              <div className="text-center py-12">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Loading your learning materials...</p>
              </div>
            ) : learningMaterials.length === 0 ? (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-md text-center">
                <p>No learning materials are currently visible to you. Please check back later or contact your company administrator.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {learningMaterials.map((material) => (
                  <div key={material.id} className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-300">
                    <div className="flex items-center mb-3">
                      {material.type === 'pdf' && <FileText className="w-7 h-7 mr-3 text-red-500" />}
                      {material.type === 'video' && <Video className="w-7 h-7 mr-3 text-blue-500" />}
                      {material.type === 'image' && <img src={material.fileUrl} alt="Thumbnail" className="w-7 h-7 mr-3 object-cover rounded" />}
                      {material.type === 'other' && <BookOpen className="w-7 h-7 mr-3 text-gray-500" />}
                      <h4 className="text-xl font-semibold text-gray-800 truncate">{material.title}</h4>
                    </div>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{material.description || 'No description provided.'}</p>
                    <p className="text-xs text-gray-500 mb-4">
                      Type: {material.type.toUpperCase()} | Uploaded: {new Date(material.uploadedAt).toLocaleDateString()}
                    </p>
                    <a
                      href={material.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-300"
                    >
                      Access Material
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}