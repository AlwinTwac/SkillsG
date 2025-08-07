'use client';

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Edit, Award, LayoutDashboard, LogOut, FileText, Video, CheckCircle, Trophy, 
  File as FileIcon, XCircle, Clock, ArrowLeftCircle, Loader2, Eye, EyeOff, Upload, File, Image, Download, GraduationCap 
} from 'lucide-react';
import { auth, db, storage } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { 
  collection, query, where, onSnapshot, doc, updateDoc, addDoc, getDoc, setDoc, 
  getDocs, documentId, deleteDoc, orderBy 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

interface LearningMaterial {
  id: string;
  companyUid: string;
  title: string;
  description: string;
  type: 'video' | 'pdf' | 'image' | 'other';
  fileUrl: string;
  uploadedAt: string;
  courseId?: string;
}
interface Achievement {
  id: string;
  studentUid: string;
  studentName: string;
  description: string;
  imageUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}
interface AttendanceRecord {
  id?: string;
  studentUid: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late';
  reason?: string;
}
interface Tutorial {
  id: string;
  studentUid: string;
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
  courseName: string;
  studentUid: string;
}
interface Course {
  id: string;
  name: string;
  description: string;
  companyUid: string;
  createdDate: string;
}
interface Enrollment {
  id: string;
  studentUid: string;
  courseId: string;
  companyUid: string;
  enrolledAt: string;
  status: string;
}
interface UserProfile {
  enrolledCourseIds?: string[];
  profileVisibility?: 'public' | 'private';
}

export default function StudentDashboard({
  userDisplayName,
  userEmail,
  userUid
}: { userDisplayName: string | null; userEmail: string | null; userUid: string }) {
  const router = useRouter();
  const [activeView, setActiveView] = useState<'overview' | 'learning' | 'tutorials' | 'certificates' | 'settings' | 'achievements'>('overview');
  const [learningMaterials, setLearningMaterials] = useState<LearningMaterial[]>([]);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [todaysAttendance, setTodaysAttendance] = useState<AttendanceRecord | null>(null);
  const [enrolledCoursesData, setEnrolledCourses] = useState<(Course & { enrollmentId?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [newAchievement, setNewAchievement] = useState({
    description: '',
    imageFile: null as File | null
  });
  const [uploadingAchievement, setUploadingAchievement] = useState(false);
  const [newTutorial, setNewTutorial] = useState({
    title: '',
    description: '',
    type: 'pdf' as 'video' | 'pdf' | 'image' | 'other',
    weekNumber: 1,
    file: null as File | null
  });

  useEffect(() => {
    if (!userUid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribers: (() => void)[] = [];

    const userDocRef = doc(db, 'users', userUid);
    const userUnsub = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const profile = docSnap.data() as UserProfile;
          setUserProfile(profile);
          const courseIds = profile.enrolledCourseIds || [];

          if (courseIds.length > 0) {
            const coursesQuery = query(collection(db, 'courses'), where(documentId(), 'in', courseIds));
            const coursesUnsub = onSnapshot(coursesQuery, (snapshot) => {
              setEnrolledCourses(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Course)));
            });
            unsubscribers.push(coursesUnsub);

            const materialsQuery = query(collection(db, 'learningContent'), where('courseId', 'in', courseIds));
            const materialsUnsub = onSnapshot(materialsQuery, (snapshot) => {
              setLearningMaterials(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as LearningMaterial)));
            });
            unsubscribers.push(materialsUnsub);
          } else {
            setEnrolledCourses([]);
            setLearningMaterials([]);
          }
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error listening to user profile:', err);
        setError('Failed to load user data');
        setLoading(false);
      }
    );
    unsubscribers.push(userUnsub);

    const tutorialsQuery = query(collection(db, 'tutorials'), where('studentUid', '==', userUid));
    const tutorialsUnsub = onSnapshot(tutorialsQuery, (snapshot) => {
      setTutorials(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Tutorial)));
    });
    unsubscribers.push(tutorialsUnsub);

    const certsQuery = query(collection(db, 'certificates'), where('studentUid', '==', userUid));
    const certsUnsub = onSnapshot(certsQuery, (snapshot) => {
      setCertificates(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Certificate)));
    });
    unsubscribers.push(certsUnsub);

    const achievementsQuery = query(
      collection(db, 'achievements'),
      where('studentUid', '==', userUid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeAchievements = onSnapshot(achievementsQuery, (snapshot) => {
      setAchievements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Achievement)));
    });
    unsubscribers.push(unsubscribeAchievements);

    const todayStr = new Date().toISOString().split('T')[0];
    const attendanceDocId = `${userUid}_${todayStr}`;
    const attendanceDocRef = doc(db, 'attendance', attendanceDocId);
    const attendanceUnsub = onSnapshot(attendanceDocRef, (docSnap) => {
      setTodaysAttendance(docSnap.exists() ? docSnap.data() as AttendanceRecord : null);
    });
    unsubscribers.push(attendanceUnsub);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [userUid]);

  const handleAchievementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAchievement.description || !newAchievement.imageFile) {
      alert("Please provide a description and an image for your achievement.");
      return;
    }
    setUploadingAchievement(true);
    try {
      const imageRef = ref(storage, `achievements/${userUid}/${Date.now()}_${newAchievement.imageFile.name}`);
      await uploadBytes(imageRef, newAchievement.imageFile);
      const imageUrl = await getDownloadURL(imageRef);

      await addDoc(collection(db, 'achievements'), {
        studentUid: userUid,
        studentName: userDisplayName || 'Student',
        description: newAchievement.description,
        imageUrl: imageUrl,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      alert("Achievement submitted for approval!");
      setNewAchievement({ description: '', imageFile: null });
    } catch (err: any) {
      console.error("Error submitting achievement:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setUploadingAchievement(false);
    }
  };

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
    if (!newTutorial.file || !userUid) {
      setError('File and user information are required.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fileRef = ref(storage, `tutorials/${userUid}/${Date.now()}_${newTutorial.file.name}`);
      await uploadBytes(fileRef, newTutorial.file);
      const fileUrl = await getDownloadURL(fileRef);
      
      await addDoc(collection(db, 'tutorials'), {
        studentUid: userUid,
        title: newTutorial.title,
        description: newTutorial.description,
        type: newTutorial.type,
        fileUrl,
        weekNumber: newTutorial.weekNumber,
        createdAt: new Date().toISOString()
      });

      setNewTutorial({ title: '', description: '', type: 'pdf', weekNumber: 1, file: null });
    } catch (err: any) {
      setError(`Failed to upload tutorial: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTutorial = async (tutorialId: string, fileUrl: string) => {
    if (!window.confirm("Are you sure you want to delete this tutorial?")) return;
    try {
      const fileRef = ref(storage, fileUrl);
      await deleteObject(fileRef);
      await deleteDoc(doc(db, 'tutorials', tutorialId));
    } catch (err: any) {
      setError(`Failed to delete tutorial: ${err.message}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewTutorial({ ...newTutorial, file: e.target.files[0] });
    }
  };

  const toggleProfileVisibility = async () => {
    if (!userUid) return;
    const newVisibility = userProfile?.profileVisibility === 'public' ? 'private' : 'public';
    try {
      await updateDoc(doc(db, 'users', userUid), {
        profileVisibility: newVisibility
      });
      setUserProfile(prev => prev ? {...prev, profileVisibility: newVisibility} : null);
    } catch (err) {
      console.error("Error updating profile visibility:", err);
      setError("Failed to update profile visibility. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading Dashboard</h2>
          <p className="text-gray-600">Please wait while we load your data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
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
          {/* --- THIS IS THE NEW BUTTON --- */}
          <button
            onClick={() => setActiveView('achievements')}
            className={`px-4 py-2 mr-2 rounded-lg flex items-center ${activeView === 'achievements' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-200'}`}
          >
            <Trophy className="w-4 h-4 mr-2" /> Achievements
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-blue-50 p-6 rounded-lg shadow-sm flex items-start">
                  <BookOpen className="w-8 h-8 text-blue-600 mr-4 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">My Learning Materials</h3>
                    <p className="text-gray-600 mb-3">
                      Access company-sponsored training content relevant to your enrolled courses.
                    </p>
                    <button
                      onClick={() => setActiveView('learning')}
                      className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300"
                    >
                      Go to Learning
                    </button>
                  </div>
                </div>
                <div className="bg-yellow-50 p-6 rounded-lg shadow-sm flex items-start">
                  <GraduationCap className="w-8 h-8 text-yellow-600 mr-4 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Today's Attendance</h3>
                    {todaysAttendance ? (
                        <div className="flex items-center">
                            {todaysAttendance.status === 'Present' && <CheckCircle className="w-6 h-6 text-green-500 mr-2"/>}
                            {todaysAttendance.status === 'Absent' && <XCircle className="w-6 h-6 text-red-500 mr-2"/>}
                            {todaysAttendance.status === 'Late' && <Clock className="w-6 h-6 text-yellow-500 mr-2"/>}
                            <p className={`text-lg font-bold ${
                                todaysAttendance.status === 'Present' ? 'text-green-600' :
                                todaysAttendance.status === 'Absent' ? 'text-red-600' : 'text-yellow-600'
                            }`}>
                                {todaysAttendance.status}
                            </p>
                        </div>
                    ) : (
                        <p className="text-gray-600">Your attendance has not been marked for today.</p>
                    )}
                  </div>
                </div>
                <div className="bg-green-50 p-6 rounded-lg shadow-sm flex items-start">
                  <GraduationCap className="w-8 h-8 text-green-600 mr-4 mt-1" />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">My Enrolled Courses</h3>
                    <p className="text-gray-600 mb-3">
                      View the courses you are currently taking.
                    </p>
                    {loading ? (
                      <p className="text-gray-500">Loading courses...</p>
                    ) : enrolledCoursesData.length > 0 ? (
                      <ul className="list-disc list-inside text-gray-700 mb-3">
                        {enrolledCoursesData.map(course => (
                          <li key={course.id} className="font-medium">{course.name}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 mb-3">Not enrolled in any courses yet.</p>
                    )}
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
                  <p>No learning materials are currently visible to you. Please ensure you are enrolled in courses with associated materials.</p>
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
                      {material.courseId && (
                        <p className="text-xs text-gray-500 mb-2">Course: {enrolledCoursesData.find(c => c.id === material.courseId)?.name || 'N/A'}</p>
                      )}
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
                <FileIcon className="w-5 h-5 mr-2 text-purple-600" /> My Uploaded Tutorials
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
                        {tutorial.type === 'other' && <FileIcon className="w-7 h-7 mr-3 text-gray-500" />}
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
                        <button
                          onClick={() => handleDeleteTutorial(tutorial.id, tutorial.fileUrl)}
                          className="inline-flex items-center px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors duration-300"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeView === 'achievements' && (
                <div>
                    <h3 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center">
                        <Trophy className="w-7 h-7 mr-2 text-amber-500" />
                        My Achievements
                    </h3>
                    
                    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Share a New Achievement</h4>
                        <form onSubmit={handleAchievementSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                value={newAchievement.description}
                                onChange={(e) => setNewAchievement({...newAchievement, description: e.target.value})}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                                placeholder="Describe your achievement..."
                                required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                                <input
                                type="file"
                                accept="image/png, image/jpeg"
                                onChange={(e) => setNewAchievement({...newAchievement, imageFile: e.target.files ? e.target.files[0] : null})}
                                className="w-full p-2 border border-gray-300 rounded-lg"
                                required
                                />
                            </div>
                            <button type="submit" disabled={uploadingAchievement} className="px-5 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-70">
                                {uploadingAchievement ? 'Submitting...' : 'Submit for Approval'}
                            </button>
                        </form>
                    </div>

                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Your Submissions</h4>
                    <div className="space-y-4">
                        {achievements.map(ach => (
                        <div key={ach.id} className="border p-4 rounded-lg flex items-center justify-between">
                            <div className="flex items-center">
                            <img src={ach.imageUrl} alt="Achievement" className="w-16 h-16 rounded-md object-cover mr-4"/>
                            <div>
                                <p className="font-medium">{ach.description}</p>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                ach.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                ach.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                {ach.status}
                                </span>
                            </div>
                            </div>
                        </div>
                        ))}
                    </div>
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
                        <h4 className="text-xl font-semibold text-gray-800">{cert.title || cert.courseName}</h4>
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
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${userProfile?.profileVisibility === 'public' ? 'bg-indigo-600' : 'bg-gray-200'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${userProfile?.profileVisibility === 'public' ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
        <span className="ml-3 text-gray-700 font-medium">
          {userProfile?.profileVisibility === 'public' ? 'Public Profile' : 'Private Profile'}
        </span>
      </div>

      <div className={`mt-4 p-4 rounded-lg ${userProfile?.profileVisibility === 'public' ? 'bg-blue-50 text-blue-800' : 'bg-gray-50 text-gray-700'}`}>
        {userProfile?.profileVisibility === 'public' ? (
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