'use client';

import React, { useState, useEffect } from 'react';
import { LogOut, UploadCloud, Search, BookOpen, FileText, Video, Users, ClipboardList, BarChart2, FileBarChart2 } from 'lucide-react';
import { auth, db, storage } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, onSnapshot, orderBy } from 'firebase/firestore'; // Added orderBy
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';

interface CompanyDashboardProps {
  userDisplayName: string | null;
  userEmail: string | null;
  userUid: string; 
}

interface EnrollmentReport {
  id: string; 
  studentUid: string;
  studentName: string;
  studentEmail: string;
  interviewDate: string; //ISO string from AI interviewer completion assumption 
  reportSummary: string;
  recommendedLearningPath?: string[];

  interviewScore?: number; 
  strengths?: string[];
  weaknesses?: string[];
  companyUid: string; 
}
interface LearningMaterial {
  id?: string;
  companyUid: string;
  title: string;
  description: string;
  type: 'video' | 'pdf' | 'image' | 'other';
  fileUrl: string;
  uploadedAt: string;
  accessibleStudentUids: string[];
}

export default function CompanyDashboard({ userDisplayName, userEmail, userUid }: CompanyDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [enrollmentReports, setEnrollmentReports] = useState<EnrollmentReport[]>([]);
  const [learningMaterials, setLearningMaterials] = useState<LearningMaterial[]>([]);
  const [enrollmentReportSearchTerm, setEnrollmentReportSearchTerm] = useState('');
  const [loadingEnrollmentReports, setLoadingEnrollmentReports] = useState(true);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [newContentTitle, setNewContentTitle] = useState('');
  const [newContentDescription, setNewContentDescription] = useState('');
  const [newContentType, setNewContentType] = useState<'video' | 'pdf' | 'image' | 'other'>('pdf');
  const [newContentFile, setNewContentFile] = useState<File | null>(null);
  const [newContentAccessibleStudents, setNewContentAccessibleStudents] = useState('');
  const [errorReports, setErrorReports] = useState<string | null>(null);

  // Effect to fetch Enrollment Reports
  useEffect(() => {
    if (!userUid) return; // Use userUid prop

    setLoadingEnrollmentReports(true);
    setErrorReports(null);

    // Filter reports by companyUid
    const q = query(
      collection(db, 'interviewReports'),
      where('companyUid', '==', userUid), // Added this line to filter by companyUid
      orderBy('interviewDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedReports: EnrollmentReport[] = [];
      snapshot.forEach((docSnap) => {
        fetchedReports.push({ id: docSnap.id, ...(docSnap.data() as Omit<EnrollmentReport, 'id'>) });
      });
      setEnrollmentReports(fetchedReports);
      setLoadingEnrollmentReports(false);
    }, (error) => {
      console.error("Error fetching enrollment reports:", error);
      setErrorReports("Failed to load enrollment reports.");
      setLoadingEnrollmentReports(false);
    });

    return () => unsubscribe(); // Cleanup listener
  }, [userUid]); // Depend on userUid

  // Effect to fetch Learning Materials - kept as is, using userUid
  useEffect(() => {
    if (!userUid) return; // Use userUid prop

    setLoadingMaterials(true);
    const materialsRef = collection(db, 'learningContent');
    const q = query(materialsRef, where('companyUid', '==', userUid)); // Use userUid

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMaterials: LearningMaterial[] = [];
      snapshot.forEach(docSnap => {
        fetchedMaterials.push({ id: docSnap.id, ...(docSnap.data() as Omit<LearningMaterial, 'id'>) });
      });
      setLearningMaterials(fetchedMaterials);
      setLoadingMaterials(false);
    }, (error) => {
      console.error("Error fetching learning materials:", error);
      setLoadingMaterials(false);
    });

    return () => unsubscribe();
  }, [userUid]); // Depend on userUid

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      router.push('/');
    } catch (error) {
      console.error("Error signing out:", error);
      alert("Failed to sign out. Please try again.");
    }
  };

  const handleContentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userUid || !newContentFile || !newContentTitle.trim()) {
      setUploadError("Please provide a title and select a file.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const fileExtension = newContentFile.name.split('.').pop();
      // Ensure fileName is unique and safe for storage paths
      const fileName = `${Date.now()}-${newContentFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(storage, `learning_materials/${userUid}/${fileName}`); // Use userUid
      const uploadResult = await uploadBytes(storageRef, newContentFile);
      const fileUrl = await getDownloadURL(uploadResult.ref);

      const accessibleUidsArray = newContentAccessibleStudents
        .split(',')
        .map(uid => uid.trim())
        .filter(uid => uid !== '');

      const newMaterialRef = doc(collection(db, 'learningContent'));
      await setDoc(newMaterialRef, {
        companyUid: userUid, // Use userUid
        title: newContentTitle,
        description: newContentDescription,
        type: newContentType,
        fileUrl: fileUrl,
        uploadedAt: new Date().toISOString(),
        accessibleStudentUids: accessibleUidsArray,
      });

      setUploadSuccess("Material uploaded successfully!");
      setNewContentTitle('');
      setNewContentDescription('');
      setNewContentType('pdf');
      setNewContentFile(null);
      setNewContentAccessibleStudents('');
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (err: any) {
      console.error("Error uploading content:", err);
      setUploadError(`Failed to upload material: ${err.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
      setTimeout(() => {
        setUploadSuccess(null);
        setUploadError(null);
      }, 5000);
    }
  };

  // Filter for Enrollment Reports
  const filteredEnrollmentReports = enrollmentReports.filter(report => {
    const lowerSearchTerm = enrollmentReportSearchTerm.toLowerCase();
    return report.studentName.toLowerCase().includes(lowerSearchTerm) ||
           report.studentEmail.toLowerCase().includes(lowerSearchTerm) ||
           report.reportSummary?.toLowerCase().includes(lowerSearchTerm);
  });

  // Function to render an Enrollment Report card 
  const renderEnrollmentReportCard = (report: EnrollmentReport) => (
    <div key={report.id} className="bg-gradient-to-br from-white to-blue-50 p-6 rounded-xl shadow-sm border border-blue-100 hover:shadow-md transition-all duration-300">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="text-xl font-bold text-gray-800 mb-1">{report.studentName}</h4>
          <p className="text-blue-600 text-sm mb-2">{report.studentEmail}</p>
          {/* Display interview score if available, otherwise hide */}
          {report.interviewScore !== undefined && (
            <div className="flex items-center bg-blue-100 px-3 py-1 rounded-full">
              <BarChart2 className="w-4 h-4 text-blue-600 mr-1" />
              <span className="font-bold text-blue-700">{report.interviewScore}/100</span>
            </div>
          )}
        </div>
      </div>

      {report.interviewDate && (
        <p className="text-xs text-gray-500 mb-3">
          Interviewed on: {new Date(report.interviewDate).toLocaleDateString()}
        </p>
      )}

      <div className="mb-4">
        <p className="text-gray-700 text-sm line-clamp-3 mb-3">
          <span className="font-semibold text-blue-600">Summary:</span> {report.reportSummary}
        </p>
      </div>

      {report.strengths && report.strengths.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-green-600 mb-1">STRENGTHS</p>
          <div className="flex flex-wrap gap-1">
            {report.strengths.map((strength, i) => (
              <span key={i} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                {strength}
              </span>
            ))}
          </div>
        </div>
      )}

      {report.weaknesses && report.weaknesses.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-orange-600 mb-1">AREAS TO IMPROVE</p>
          <div className="flex flex-wrap gap-1">
            {report.weaknesses.map((weakness, i) => (
              <span key={i} className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                {weakness}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Learning Path */}
      {report.recommendedLearningPath && report.recommendedLearningPath.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-purple-600 mb-1">SUGGESTED LEARNING PATH</p>
          <div className="flex flex-wrap gap-1">
            {report.recommendedLearningPath.map((path, i) => (
              <span key={i} className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                {path}
              </span>
            ))}
          </div>
        </div>
      )}

      <button className="w-full mt-3 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 flex items-center justify-center">
        <FileBarChart2 className="w-4 h-4 mr-2" />
        View Detailed Report
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-teal-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <ClipboardList className="w-8 h-8 mr-3" />
              <div>
                <h2 className="text-2xl font-bold">KimTronix Dashboard</h2>
                <p className="text-blue-100">
                  Welcome back, {userDisplayName || userEmail?.split('@')[0] || 'Company'}!
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-black rounded-lg flex items-center transition-all duration-300"
            >
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('content')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'content' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Learning Content
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'reports' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Enrollment Reports
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-teal-50 p-6 rounded-xl border border-blue-100">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Company Overview</h3>
                <p className="text-gray-600">
                  Manage your company's profile, track student progress, and upload learning materials.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center mb-3">
                    <Users className="w-6 h-6 text-blue-500 mr-2" />
                    <h4 className="font-semibold text-gray-800">Total Students</h4>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{enrollmentReports.length}</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center mb-3">
                    <BookOpen className="w-6 h-6 text-teal-500 mr-2" />
                    <h4 className="font-semibold text-gray-800">Learning Materials</h4>
                  </div>
                  <p className="text-3xl font-bold text-teal-600">{learningMaterials.length}</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center mb-3">
                    <BarChart2 className="w-6 h-6 text-purple-500 mr-2" />
                    <h4 className="font-semibold text-gray-800">Avg. Interview Score</h4>
                  </div>
                  <p className="text-3xl font-bold text-purple-600">
                    {enrollmentReports.length > 0
                      ? Math.round(enrollmentReports.reduce((sum, report) => sum + (report.interviewScore || 0), 0) /
                          enrollmentReports.filter(r => r.interviewScore !== undefined).length)
                      : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <FileBarChart2 className="w-5 h-5 text-blue-500 mr-2" />
                  Recent Enrollment Reports
                </h4>
                {enrollmentReports.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {enrollmentReports.slice(0, 4).map(report => renderEnrollmentReportCard(report))}
                  </div>
                ) : (
                  <p className="text-gray-500">No enrollment reports available yet.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-8">
              <div className="bg-gradient-to-r from-blue-50 to-teal-50 p-6 rounded-xl border border-blue-100">
                <h3 className="text-xl font-semibold text-gray-800 mb-2 flex items-center">
                  <UploadCloud className="w-6 h-6 text-blue-500 mr-2" />
                  Upload New Learning Material
                </h3>
                <form onSubmit={handleContentUpload} className="mt-4 space-y-4">
                  {uploadError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md">
                      {uploadError}
                    </div>
                  )}
                  {uploadSuccess && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md">
                      {uploadSuccess}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="contentTitle" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                          type="text"
                          id="contentTitle"
                          value={newContentTitle}
                          onChange={(e) => setNewContentTitle(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Advanced JavaScript Concepts"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="contentDescription" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          id="contentDescription"
                          value={newContentDescription}
                          onChange={(e) => setNewContentDescription(e.target.value)}
                          rows={3}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Provide a brief description of the material."
                        />
                      </div>

                      <div>
                        <label htmlFor="contentType" className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select
                          id="contentType"
                          value={newContentType}
                          onChange={(e) => setNewContentType(e.target.value as 'video' | 'pdf' | 'image' | 'other')}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="pdf">PDF Document</option>
                          <option value="video">Video</option>
                          <option value="image">Image</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-1">Select File</label>
                        <div className="flex items-center justify-center w-full">
                          <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <UploadCloud className="w-8 h-8 mb-3 text-gray-400" />
                              <p className="mb-2 text-sm text-gray-500">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-gray-500">PDF, MP4, JPG, PNG, etc.</p>
                            </div>
                            <input
                              id="file-upload"
                              type="file"
                              onChange={(e) => setNewContentFile(e.target.files ? e.target.files[0] : null)}
                              className="hidden"
                              required
                            />
                          </label>
                        </div>
                        {newContentFile && (
                          <p className="mt-1 text-sm text-gray-600">Selected: {newContentFile.name}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="accessibleStudents" className="block text-sm font-medium text-gray-700 mb-1">
                          Accessible Student UIDs (Comma-separated)
                        </label>
                        <input
                          type="text"
                          id="accessibleStudents"
                          value={newContentAccessibleStudents}
                          onChange={(e) => setNewContentAccessibleStudents(e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          placeholder="studentUid123, studentUid456"
                        />
                        <p className="mt-1 text-xs text-gray-500">Separate UIDs with commas. Leave empty for no specific assignment (material will not be visible to students unless their UID is explicitly added).</p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={uploading}
                    className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {uploading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    ) : (
                      <UploadCloud className="w-5 h-5 mr-2" />
                    )}
                    {uploading ? 'Uploading...' : 'Upload Material'}
                  </button>
                </form>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-teal-50 p-6 rounded-xl border border-blue-100">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <BookOpen className="w-6 h-6 text-blue-500 mr-2" />
                  Existing Learning Materials
                </h3>
                {loadingMaterials ? (
                  <div className="text-center py-6">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading materials...</p>
                  </div>
                ) : learningMaterials.length === 0 ? (
                  <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-md text-center">
                    <p>No learning materials uploaded by your company yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {learningMaterials.map((material) => (
                      <div key={material.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-300">
                        <div className="flex items-center mb-3">
                          {material.type === 'pdf' && <FileText className="w-6 h-6 mr-2 text-red-500" />}
                          {material.type === 'video' && <Video className="w-6 h-6 mr-2 text-blue-500" />}
                          {material.type === 'image' && <img src={material.fileUrl} alt="Thumbnail" className="w-6 h-6 mr-2 object-cover rounded" />}
                          {material.type === 'other' && <BookOpen className="w-6 h-6 mr-2 text-gray-500" />}
                          <h4 className="text-lg font-semibold text-gray-800 truncate">{material.title}</h4>
                        </div>
                        <p className="text-gray-600 text-sm mb-2 line-clamp-2">{material.description || 'No description provided.'}</p>
                        <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
                          <span>Type: {material.type.toUpperCase()}</span>
                          <span>Uploaded: {new Date(material.uploadedAt).toLocaleDateString()}</span>
                        </div>
                        {material.accessibleStudentUids.length > 0 && (
                          <p className="text-xs text-blue-600 mb-4">
                            Visible to: {material.accessibleStudentUids.length} student(s)
                          </p>
                        )}
                        <a
                          href={material.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 transition-colors duration-300"
                        >
                          View Material
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-teal-50 p-6 rounded-xl border border-blue-100">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <Users className="w-6 h-6 text-blue-500 mr-2" />
                  All Student Enrollment Reports
                </h3>

                {/* Search Bar for Reports */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search enrollment report by student name, email, or report summary..."
                      value={enrollmentReportSearchTerm}
                      onChange={(e) => setEnrollmentReportSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500 mb-1">Total Enrollments</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {enrollmentReports.length}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500 mb-1">Average Score</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {enrollmentReports.length > 0
                        ? Math.round(enrollmentReports.reduce((sum, report) => sum + (report.interviewScore || 0), 0) /
                          enrollmentReports.filter(r => r.interviewScore !== undefined).length)
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                    <p className="text-sm text-gray-500 mb-1">Enrollments Last Month</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {enrollmentReports.filter(r => {
                        if (!r.interviewDate) return false;
                        const reportDate = new Date(r.interviewDate);
                        const oneMonthAgo = new Date();
                        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                        return reportDate > oneMonthAgo;
                      }).length}
                    </p>
                  </div>
                </div>

                {/* Reports List */}
                {loadingEnrollmentReports ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg">Loading enrollment reports...</p>
                  </div>
                ) : filteredEnrollmentReports.length === 0 ? (
                  // Display error message if there is one
                  errorReports ? (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md text-center">
                      <p>{errorReports}</p>
                    </div>
                  ) : (
                    <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-md text-center">
                      <p>No enrollment reports found matching your search criteria.</p>
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEnrollmentReports.map(renderEnrollmentReportCard)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}