'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Edit, Award, LayoutDashboard, LogOut, FileText, Video, ArrowLeftCircle, Loader2, Eye, EyeOff, Upload, File, Image, Download } from 'lucide-react';
import { auth, db, storage } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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

interface Tutorial {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'pdf' | 'image' | 'other';
  fileUrl: string;
  createdAt: string;
  weekNumber: number;
}

interface Certificate {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  issuedAt: string;
  issuedBy: string;
}

export default function StudentDashboard({ userDisplayName, userEmail, userUid }: StudentDashboardProps) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<'overview' | 'learning' | 'tutorials' | 'certificates' | 'settings'>('overview');
  const [learningMaterials, setLearningMaterials] = useState<LearningMaterial[]>([]);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'private'>('private');
  const [newTutorial, setNewTutorial] = useState({
    title: '',
    description: '',
    type: 'pdf' as 'video' | 'pdf' | 'image' | 'other',
    weekNumber: 1,
    file: null as File | null
  });

  // Fetch user profile and settings
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userUid));
        if (userDoc.exists()) {
          setProfileVisibility(userDoc.data().profileVisibility || 'private');
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
      }
    };

    fetchUserProfile();
  }, [userUid]);

  // Fetch learning materials
  useEffect(() => {
    if (activeView === 'learning' && userUid) {
      setLoading(true);
      setError(null);
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
        setLoading(false);
      }, (error) => {
        console.error("Error fetching learning materials:", error);
        setError("Failed to load learning materials. Please try again.");
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [activeView, userUid]);

  // Fetch tutorials
  useEffect(() => {
    if (activeView === 'tutorials' && userUid) {
      setLoading(true);
      setError(null);
      const tutorialsRef = collection(db, 'tutorials');

      const q = query(
        tutorialsRef,
        where('studentUid', '==', userUid)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedTutorials: Tutorial[] = [];
        snapshot.forEach(docSnap => {
          fetchedTutorials.push({ id: docSnap.id, ...(docSnap.data() as Omit<Tutorial, 'id'>) });
        });
        setTutorials(fetchedTutorials);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching tutorials:", error);
        setError("Failed to load tutorials. Please try again.");
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [activeView, userUid]);

  // Fetch certificates
  useEffect(() => {
    if (activeView === 'certificates' && userUid) {
      setLoading(true);
      setError(null);
      const certsRef = collection(db, 'certificates');

      const q = query(
        certsRef,
        where('studentUid', '==', userUid)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedCerts: Certificate[] = [];
        snapshot.forEach(docSnap => {
          fetchedCerts.push({ id: docSnap.id, ...(docSnap.data() as Omit<Certificate, 'id'>) });
        });
        setCertificates(fetchedCerts);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching certificates:", error);
        setError("Failed to load certificates. Please try again.");
        setLoading(false);
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
const handleTutorialSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!newTutorial.file) {
    setError('Please select a file to upload');
    return;
  }

  try {
    setLoading(true);
    // Upload file to storage
    const fileRef = ref(storage, `tutorials/${userUid}/${Date.now()}_${newTutorial.file.name}`);
    await uploadBytes(fileRef, newTutorial.file);
    const fileUrl = await getDownloadURL(fileRef);

    // Create a reference to a new document with auto-generated ID
    const tutorialRef = doc(collection(db, 'tutorials'));
    
    // Save tutorial data to Firestore
    await setDoc(tutorialRef, {
      studentUid: userUid,
      title: newTutorial.title,
      description: newTutorial.description,
      type: newTutorial.type,
      fileUrl,
      weekNumber: newTutorial.weekNumber,
      createdAt: new Date().toISOString()
    });

    // Reset form
    setNewTutorial({
      title: '',
      description: '',
      type: 'pdf',
      weekNumber: 1,
      file: null
    });
    setError(null);
  } catch (err) {
    console.error("Error uploading tutorial:", err);
    setError("Failed to upload tutorial. Please try again.");
  } finally {
    setLoading(false);
  }
};

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewTutorial({ ...newTutorial, file: e.target.files[0] });
    }
  };

  const toggleProfileVisibility = async () => {
    const newVisibility = profileVisibility === 'public' ? 'private' : 'public';
    try {
      await updateDoc(doc(db, 'users', userUid), {
        profileVisibility: newVisibility
      });
      setProfileVisibility(newVisibility);
    } catch (err) {
      console.error("Error updating profile visibility:", err);
      setError("Failed to update profile visibility. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <LayoutDashboard className="w-8 h-8 mr-3" />
              <h2 className="text-2xl font-bold">Student Dashboard</h2>
            </div>
            <div className="flex items-center space-x-4">
              <span className="hidden sm:inline">
                Hello, {userDisplayName || userEmail?.split('@')[0] || 'Student'}!
              </span>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 flex items-center transition-colors duration-300"
              >
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-gray-100 px-6 py-3 flex overflow-x-auto">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-4 py-2 mr-2 rounded-lg flex items-center ${activeView === 'overview' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-200'}`}
          >
            <LayoutDashboard className="w-4 h-4 mr-2" /> Overview
          </button>
          <button
            onClick={() => setActiveView('learning')}
            className={`px-4 py-2 mr-2 rounded-lg flex items-center ${activeView === 'learning' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-200'}`}
          >
            <BookOpen className="w-4 h-4 mr-2" /> Learning Materials
          </button>
          <button
            onClick={() => setActiveView('tutorials')}
            className={`px-4 py-2 mr-2 rounded-lg flex items-center ${activeView === 'tutorials' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-200'}`}
          >
            <Edit className="w-4 h-4 mr-2" /> My Tutorials
          </button>
          <button
            onClick={() => setActiveView('certificates')}
            className={`px-4 py-2 mr-2 rounded-lg flex items-center ${activeView === 'certificates' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-200'}`}
          >
            <Award className="w-4 h-4 mr-2" /> Certificates
          </button>
          <button
            onClick={() => setActiveView('settings')}
            className={`px-4 py-2 rounded-lg flex items-center ${activeView === 'settings' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-200'}`}
          >
            <Eye className="w-4 h-4 mr-2" /> Profile Settings
          </button>
        </div>

        {/* Main Content */}
        <div className="p-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-6">
              {error}
            </div>
          )}

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
                    <button
                      onClick={() => setActiveView('tutorials')}
                      className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-300"
                    >
                      Create Tutorial
                    </button>
                  </div>
                </div>

                <div className="bg-green-50 p-6 rounded-lg shadow-sm flex items-start">
                  <Award className="w-8 h-8 text-green-600 mr-4 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Certifications & Progress</h3>
                    <p className="text-gray-600 mb-3">
                      Track your learning progress and earn certifications upon completion of courses.
                    </p>
                    <button
                      onClick={() => setActiveView('certificates')}
                      className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-300"
                    >
                      View Certificates
                    </button>
                  </div>
                </div>

                <div className="bg-indigo-50 p-6 rounded-lg shadow-sm flex items-start">
                  <Eye className="w-8 h-8 text-indigo-600 mr-4 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Profile Visibility</h3>
                    <p className="text-gray-600 mb-3">
                      Control who can see your profile and learning materials.
                    </p>
                    <button
                      onClick={() => setActiveView('settings')}
                      className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-300"
                    >
                      Manage Settings
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

              {loading ? (
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

          {activeView === 'tutorials' && (
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <h3 className="text-2xl font-semibold text-gray-800 flex items-center">
                  <Edit className="w-7 h-7 mr-2 text-purple-600" />
                  My Tutorials
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setActiveView('overview')}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 flex items-center transition-colors duration-300"
                  >
                    <ArrowLeftCircle className="w-4 h-4 mr-2" /> Back
                  </button>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
                <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <Upload className="w-5 h-5 mr-2 text-purple-600" /> Create New Tutorial
                </h4>
                <form onSubmit={handleTutorialSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        value={newTutorial.title}
                        onChange={(e) => setNewTutorial({ ...newTutorial, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Tutorial title"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Week Number</label>
                      <input
                        type="number"
                        min="1"
                        max="52"
                        value={newTutorial.weekNumber}
                        onChange={(e) => setNewTutorial({ ...newTutorial, weekNumber: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={newTutorial.description}
                      onChange={(e) => setNewTutorial({ ...newTutorial, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      rows={3}
                      placeholder="What did you learn this week?"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={newTutorial.type}
                        onChange={(e) => setNewTutorial({ ...newTutorial, type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="pdf">PDF Document</option>
                        <option value="video">Video</option>
                        <option value="image">Image</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                      <div className="flex items-center">
                        <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg border border-gray-300 flex items-center transition-colors duration-300">
                          <Upload className="w-4 h-4 mr-2" />
                          {newTutorial.file ? newTutorial.file.name : 'Choose file'}
                          <input
                            type="file"
                            onChange={handleFileChange}
                            className="hidden"
                            required
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <Edit className="w-5 h-5 mr-2" />
                    )}
                    Upload Tutorial
                  </button>
                </form>
              </div>

              <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <File className="w-5 h-5 mr-2 text-purple-600" /> My Uploaded Tutorials
              </h4>

              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">Loading your tutorials...</p>
                </div>
              ) : tutorials.length === 0 ? (
                <div className="bg-gray-100 border border-gray-200 rounded-lg p-6 text-center">
                  <p className="text-gray-600">You haven't uploaded any tutorials yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {tutorials.map((tutorial) => (
                    <div key={tutorial.id} className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-300">
                      <div className="flex items-center mb-3">
                        {tutorial.type === 'pdf' && <FileText className="w-7 h-7 mr-3 text-red-500" />}
                        {tutorial.type === 'video' && <Video className="w-7 h-7 mr-3 text-blue-500" />}
                        {tutorial.type === 'image' && <Image className="w-7 h-7 mr-3 text-green-500" />}
                        {tutorial.type === 'other' && <File className="w-7 h-7 mr-3 text-gray-500" />}
                        <div>
                          <h4 className="text-xl font-semibold text-gray-800">{tutorial.title}</h4>
                          <p className="text-xs text-gray-500">Week {tutorial.weekNumber}</p>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-3">{tutorial.description || 'No description provided.'}</p>
                      <p className="text-xs text-gray-500 mb-4">
                        Uploaded: {new Date(tutorial.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex space-x-2">
                        <a
                          href={tutorial.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-300"
                        >
                          View Tutorial
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeView === 'certificates' && (
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <h3 className="text-2xl font-semibold text-gray-800 flex items-center">
                  <Award className="w-7 h-7 mr-2 text-green-600" />
                  My Certificates
                </h3>
                <button
                  onClick={() => setActiveView('overview')}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 flex items-center transition-colors duration-300"
                >
                  <ArrowLeftCircle className="w-4 h-4 mr-2" /> Back to Dashboard
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">Loading your certificates...</p>
                </div>
              ) : certificates.length === 0 ? (
                <div className="bg-gray-100 border border-gray-200 rounded-lg p-6 text-center">
                  <p className="text-gray-600">You haven't earned any certificates yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {certificates.map((cert) => (
                    <div key={cert.id} className="bg-gray-50 p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-300">
                      <div className="flex items-center mb-3">
                        <Award className="w-7 h-7 mr-3 text-green-500" />
                        <h4 className="text-xl font-semibold text-gray-800">{cert.title}</h4>
                      </div>
                      <p className="text-gray-600 text-sm mb-4">{cert.description || 'No description provided.'}</p>
                      <p className="text-xs text-gray-500 mb-4">
                        Issued by: {cert.issuedBy} on {new Date(cert.issuedAt).toLocaleDateString()}
                      </p>
                      <a
                        href={cert.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-300"
                      >
                        <Download className="w-4 h-4 mr-2" /> Download Certificate
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeView === 'settings' && (
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <h3 className="text-2xl font-semibold text-gray-800 flex items-center">
                  <Eye className="w-7 h-7 mr-2 text-indigo-600" />
                  Profile Settings
                </h3>
                <button
                  onClick={() => setActiveView('overview')}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 flex items-center transition-colors duration-300"
                >
                  <ArrowLeftCircle className="w-4 h-4 mr-2" /> Back to Dashboard
                </button>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Profile Visibility</h4>
                <p className="text-gray-600 mb-6">
                  Control who can see your profile and learning materials. When set to public, recruiters will be able to view your profile, tutorials, and certificates.
                </p>

                <div className="flex items-center">
                  <button
                    onClick={toggleProfileVisibility}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${profileVisibility === 'public' ? 'bg-indigo-600' : 'bg-gray-200'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${profileVisibility === 'public' ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                  </button>
                  <span className="ml-3 text-gray-700 font-medium">
                    {profileVisibility === 'public' ? 'Public Profile' : 'Private Profile'}
                  </span>
                </div>

                <div className={`mt-4 p-4 rounded-lg ${profileVisibility === 'public' ? 'bg-blue-50 text-blue-800' : 'bg-gray-50 text-gray-700'}`}>
                  {profileVisibility === 'public' ? (
                    <p>Your profile is currently visible to recruiters. They can see your tutorials, certificates, and learning progress.</p>
                  ) : (
                    <p>Your profile is currently private. Only you and your company administrators can see your information.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}