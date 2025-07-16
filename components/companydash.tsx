'use client';

import React, { useState, useEffect } from 'react';
import { LogOut, UploadCloud, Search, BookOpen, FileText, Video, Users, ClipboardList, BarChart2, FileBarChart2, Award, Mail, UserCheck } from 'lucide-react';
import { auth, db, storage } from '@/lib/firebase';
import { collection, query,arrayUnion, where, getDocs, doc, setDoc, onSnapshot, orderBy, updateDoc, serverTimestamp, documentId } from 'firebase/firestore'; // Added serverTimestamp, documentId
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
  interviewDate: string;
  reportSummary: string;
  recommendedLearningPath?: string[];
  interviewScore?: number;
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
  courseId?: string; // NO LONGER accessibleStudentUids
}

interface Certificate {
  id?: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  courseName: string;
  completionDate: string;
  issuedBy: string;
  fileUrl?: string;
  companyUid: string;
}

interface Course {
  id?: string;
  name: string;
  description: string;
  companyUid: string;
  createdDate: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  profileVisibility: 'public' | 'private';
  companyUid?: string; // Add companyUid to Student interface for filtering
  profileCompleted: boolean; // Add profileCompleted to Student interface for filtering
}

// New interface for Enrollment
interface Enrollment {
  id: string; // Document ID (e.g., studentUid_courseId)
  studentUid: string;
  courseId: string;
  companyUid: string;
  enrolledAt: string; // Use ISO string or Date for type consistency
  status: 'active' | 'completed' | 'dropped';
}

export default function CompanyDashboard({ userDisplayName, userEmail, userUid }: CompanyDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [enrollmentReports, setEnrollmentReports] = useState<EnrollmentReport[]>([]);
  const [learningMaterials, setLearningMaterials] = useState<LearningMaterial[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]); // This will now hold all eligible students
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]); // New state for enrollments
  const [enrollmentReportSearchTerm, setEnrollmentReportSearchTerm] = useState('');
  const [loading, setLoading] = useState({
    reports: true,
    materials: true,
    courses: true,
    students: true,
    certificates: true,
    enrollments: true // New loading state
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // New state for enrolling students
  const [studentToEnrollId, setStudentToEnrollId] = useState<string>('');
  const [courseToEnrollId, setCourseToEnrollId] = useState<string>('');
  const [enrollingStudent, setEnrollingStudent] = useState(false); // Specific loading for enrollment

  const [newContent, setNewContent] = useState<Partial<LearningMaterial>>({
    title: '',
    description: '',
    type: 'pdf',
    courseId: '' // Initialize courseId
  });
  const [newCertificate, setNewCertificate] = useState<Partial<Certificate>>({
    studentUid: '',
    courseName: '',
  });
  const [newCourse, setNewCourse] = useState<Partial<Course>>({
    name: '',
    description: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentDateTime, setCurrentDateTime] = useState<string>('');
  const [weather, setWeather] = useState<{temp: number, description: string} | null>(null);

  // Fetch all necessary data
  useEffect(() => {
    if (!userUid) return;

    // Fetch Enrollment Reports
    const reportsQuery = query(
      collection(db, 'interviewReports'),
      where('companyUid', '==', userUid),
      orderBy('interviewDate', 'desc')
    );
    const reportsUnsub = onSnapshot(reportsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EnrollmentReport));
      setEnrollmentReports(data);
      setLoading(prev => ({ ...prev, reports: false }));
    });

    // Fetch Learning Materials
    const materialsQuery = query(
      collection(db, 'learningContent'),
      where('companyUid', '==', userUid)
    );
    const materialsUnsub = onSnapshot(materialsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LearningMaterial));
      setLearningMaterials(data);
      setLoading(prev => ({ ...prev, materials: false }));
    });

    // Fetch Courses
    const coursesQuery = query(
      collection(db, 'courses'),
      where('companyUid', '==', userUid)
    );
    const coursesUnsub = onSnapshot(coursesQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
      setCourses(data);
      setLoading(prev => ({ ...prev, courses: false }));
    });

    // --- MODIFIED: Fetch all students who completed AI interview for enrollment dropdown ---
    const allEligibleStudentsQuery = query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      where('profileCompleted', '==', true) // Filter for only those who completed the AI interview
      // Optional: where('profileVisibility', '==', 'public') if company only enrolls public students
      // Removed: where('companyUid', '==', userUid) to show all eligible students
    );
    const studentsUnsub = onSnapshot(allEligibleStudentsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(data); // This now populates the dropdown with ALL eligible students
      setLoading(prev => ({ ...prev, students: false }));
    });
    // --- END MODIFIED STUDENTS FETCH ---


    // Fetch Certificates
    const certsQuery = query(
      collection(db, 'certificates'),
      where('companyUid', '==', userUid)
    );
    const certsUnsub = onSnapshot(certsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Certificate));
      setCertificates(data);
      setLoading(prev => ({ ...prev, certificates: false }));
    });

    // NEW: Fetch Enrollments
    const enrollmentsQuery = query(
      collection(db, 'enrollments'),
      where('companyUid', '==', userUid)
    );
    const enrollmentsUnsub = onSnapshot(enrollmentsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Enrollment));
      setEnrollments(data);
      setLoading(prev => ({ ...prev, enrollments: false }));
    });

    // Update current time every second
    const timeInterval = setInterval(() => {
      setCurrentDateTime(new Date().toLocaleString());
    }, 1000);

    // Simulate weather data fetch (existing)
    const fetchWeather = async () => { /* ... */ };
    fetchWeather();

    return () => {
      reportsUnsub();
      materialsUnsub();
      coursesUnsub();
      studentsUnsub(); // Cleanup for students listener
      certsUnsub();
      enrollmentsUnsub(); // Cleanup for new enrollments listener
      clearInterval(timeInterval);
    };
  }, [userUid]);

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
    if (!selectedFile || !newContent.title || !newContent.courseId) { // CourseId is now required
      setUploadError("Please provide a title, select a file, and choose a course.");
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      // Upload file to storage
      const fileRef = ref(storage, `learning_materials/${userUid}/${Date.now()}_${selectedFile.name}`);
      await uploadBytes(fileRef, selectedFile);
      const fileUrl = await getDownloadURL(fileRef);

      // Save to Firestore
      await setDoc(doc(collection(db, 'learningContent')), {
        companyUid: userUid,
        title: newContent.title,
        description: newContent.description,
        type: newContent.type,
        fileUrl,
        uploadedAt: new Date().toISOString(),
        courseId: newContent.courseId // Use the selected courseId
        // Removed: accessibleStudentUids
      });

      setUploadSuccess("Material uploaded successfully!");
      setNewContent({
        title: '',
        description: '',
        type: 'pdf',
        courseId: '' // Reset courseId
      });
      setSelectedFile(null);
    } catch (err: any) {
      console.error("Error uploading content:", err);
      setUploadError(`Failed to upload material: ${err.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCertificate.studentUid || !newCertificate.courseName) {
      setUploadError("Please select a student and course");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const student = students.find(s => s.id === newCertificate.studentUid);
      if (!student) throw new Error("Student not found");

      const certData: Omit<Certificate, 'id'> = { // Exclude 'id' for setDoc
        studentUid: newCertificate.studentUid,
        studentName: student.name,
        studentEmail: student.email,
        courseName: newCertificate.courseName,
        completionDate: new Date().toISOString(),
        issuedBy: userDisplayName || "Company Admin",
        companyUid: userUid
      };

      await setDoc(doc(collection(db, 'certificates')), certData); // Firestore auto-generates ID

      setUploadSuccess("Certificate generated successfully!");
      setNewCertificate({
        studentUid: '',
        courseName: ''
      });
    } catch (err: any) {
      console.error("Error creating certificate:", err);
      setUploadError(`Failed to create certificate: ${err.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.name) {
      setUploadError("Course name is required");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      await setDoc(doc(collection(db, 'courses')), {
        name: newCourse.name,
        description: newCourse.description,
        companyUid: userUid,
        createdDate: new Date().toISOString()
      });

      setUploadSuccess("Course created successfully!");
      setNewCourse({
        name: '',
        description: ''
      });
    } catch (err: any) {
      console.error("Error creating course:", err);
      setUploadError(`Failed to create course: ${err.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleEnrollStudent = async (studentToEnrollUid: string, courseToEnrollId: string) => {
  if (!studentToEnrollUid || !courseToEnrollId || !userUid) {
    alert("Please select a student and a course to enroll.");
    return;
  }

  setEnrollingStudent(true);
  setUploadError(null);
  setUploadSuccess(null);

  try {
    const student = students.find(s => s.id === studentToEnrollUid);
    const course = courses.find(c => c.id === courseToEnrollId);

    // 1. Create the enrollment document (No Change)
    const enrollmentDocId = `${studentToEnrollUid}_${courseToEnrollId}`;
    const enrollmentRef = doc(collection(db, 'enrollments'), enrollmentDocId);
    await setDoc(enrollmentRef, {
      studentUid: studentToEnrollUid,
      courseId: courseToEnrollId,
      companyUid: userUid,
      enrolledAt: serverTimestamp(),
      status: 'active'
    });

    // 2. Update the student's user document (No Change)
    const studentDocRef = doc(db, 'users', studentToEnrollId);
    await updateDoc(studentDocRef, {
      companyUid: userUid,
    });
    
    // 3. *** ADD THIS LINE ***
    // Add the courseId to an array on the student's user document.
    await updateDoc(studentDocRef, {
        enrolledCourseIds: arrayUnion(courseToEnrollId)
    });

    setUploadSuccess(`Successfully enrolled ${student?.name || 'student'} in ${course?.name || 'course'}!`);
    setStudentToEnrollId('');
    setCourseToEnrollId('');
  } catch (err: any) {
    console.error("Error enrolling student:", err);
    setUploadError(`Failed to enroll student: ${err.message || 'An unexpected error occurred.'}`);
  } finally {
    setEnrollingStudent(false);
  }
};

  const recommendCandidate = async (studentUid: string) => {
    try {
      const student = students.find(s => s.id === studentUid);
      if (!student) return;

      await updateDoc(doc(db, 'users', studentUid), {
        recommended: true,
        recommendedBy: userUid,
        recommendedAt: new Date().toISOString()
      });

      alert(`${student.name} has been recommended to recruiters`);
    } catch (err) {
      console.error("Error recommending candidate:", err);
      alert("Failed to recommend candidate");
    }
  };

  // --- MODIFIED: Filtered students for the table (show students linked to THIS company) ---
  // This uses the 'students' state which now contains ALL eligible students.
  // We filter client-side for students who have this company's UID.
  const studentsLinkedToThisCompany = students.filter(student => student.companyUid === userUid);
  // --- END MODIFIED ---

  const filteredEnrollmentReports = enrollmentReports.filter(report => {
    const lowerSearchTerm = enrollmentReportSearchTerm.toLowerCase();
    return report.studentName.toLowerCase().includes(lowerSearchTerm) ||
             report.studentEmail.toLowerCase().includes(lowerSearchTerm) ||
             report.reportSummary?.toLowerCase().includes(lowerSearchTerm);
  });

  // Group learning materials by course
  const materialsByCourse = learningMaterials.reduce((acc, material) => {
    const courseId = material.courseId || 'uncategorized';
    if (!acc[courseId]) {
      acc[courseId] = {
        course: courses.find(c => c.id === courseId),
        materials: []
      };
    }
    acc[courseId].materials.push(material);
    return acc;
  }, {} as Record<string, { course?: Course; materials: LearningMaterial[] }>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-teal-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <ClipboardList className="w-8 h-8 mr-3" />
              <div>
                <h2 className="text-2xl font-bold">Kimtronix Global</h2>
                <p className="text-blue-100">
                  Welcome back, {userDisplayName || userEmail?.split('@')[0] || 'Admin'}!
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
        <div className="border-b border-gray-200 bg-gray-50 overflow-x-auto">
          <nav className="flex space-x-8 px-6">
            {['overview', 'content', 'reports', 'students', 'certificates', 'courses'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {uploadError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4">
              {uploadError}
            </div>
          )}
          {uploadSuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md mb-4">
              {uploadSuccess}
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Hello, Admin!</h1>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-800">Date & Time</h3>
                    <p className="text-gray-700">{currentDateTime || 'Loading...'}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-medium text-green-800">Weather</h3>
                    {weather ? (
                      <p className="text-gray-700">
                        {weather.description}, {weather.temp}°F
                      </p>
                    ) : (
                      <p className="text-gray-700">Loading weather...</p>
                    )}
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-medium text-purple-800">Quick Stats</h3>
                    <p className="text-gray-700">
                      {studentsLinkedToThisCompany.length} Students | {courses.length} Courses | {enrollments.length} Enrollments
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="font-medium text-lg mb-3">Recent Reports</h3>
                    {enrollmentReports.slice(0, 3).map(report => (
                      <div key={report.id} className="mb-3 pb-3 border-b border-gray-100">
                        <p className="font-medium">{report.studentName}</p>
                        <p className="text-sm text-gray-600">{report.interviewDate}</p>
                      </div>
                    ))}
                    {enrollmentReports.length === 0 && (
                      <p className="text-gray-500">No recent reports</p>
                    )}
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="font-medium text-lg mb-3">Recent Learning Materials</h3>
                    {learningMaterials.slice(0, 3).map(material => (
                      <div key={material.id} className="mb-3 pb-3 border-b border-gray-100">
                        <p className="font-medium">{material.title}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(material.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                    {learningMaterials.length === 0 && (
                      <p className="text-gray-500">No recent materials</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-8">
              {/* Learning materials upload form */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Upload Learning Material</h3>
                <form onSubmit={handleContentUpload} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                          type="text"
                          value={newContent.title || ''}
                          onChange={(e) => setNewContent({...newContent, title: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={newContent.description || ''}
                          onChange={(e) => setNewContent({...newContent, description: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Course (Required)</label>
                        <select
                          value={newContent.courseId || ''}
                          onChange={(e) => setNewContent({...newContent, courseId: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          required // Course is now required
                        >
                          <option value="">Select a course</option>
                          {courses.map(course => (
                            <option key={course.id} value={course.id}>{course.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                        <input
                          type="file"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select
                          value={newContent.type || 'pdf'}
                          onChange={(e) => setNewContent({...newContent, type: e.target.value as any})}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                        >
                          <option value="pdf">PDF</option>
                          <option value="video">Video</option>
                          <option value="image">Image</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      {/* Removed: Accessible Students input as materials are linked to courses now */}
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Upload Material'}
                  </button>
                </form>
              </div>

              {/* Enhanced learning materials list grouped by course */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Learning Materials by Course</h3>
                {loading.materials ? (
                  <div>Loading...</div>
                ) : (
                  <div className="space-y-8">
                    {Object.entries(materialsByCourse).map(([courseId, { course, materials }]) => (
                      <div key={courseId} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-lg font-semibold">
                            {course?.name || 'Uncategorized Materials'}
                          </h4>
                          {course?.description && (
                            <p className="text-sm text-gray-600">{course.description}</p>
                          )}
                        </div>
                        
                        {materials.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">No materials for this course</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {materials.map(material => (
                              <div key={material.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-center mb-2">
                                  {material.type === 'pdf' && <FileText className="text-red-500 mr-2" />}
                                  {material.type === 'video' && <Video className="text-blue-500 mr-2" />}
                                  {material.type === 'image' && <img src={material.fileUrl} className="w-6 h-6 mr-2" alt="Thumbnail" />}
                                  {material.type === 'other' && <BookOpen className="text-gray-500 mr-2" />}
                                  <h4 className="font-medium">{material.title}</h4>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{material.description}</p>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-500">
                                    Uploaded: {new Date(material.uploadedAt).toLocaleDateString()}
                                  </span>
                                  <a
                                    href={material.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 text-sm hover:underline"
                                  >
                                    View Material
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-800">Enrollment Reports</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search reports..."
                      value={enrollmentReportSearchTerm}
                      onChange={(e) => setEnrollmentReportSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                {loading.reports ? (
                  <div>Loading reports...</div>
                ) : filteredEnrollmentReports.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interview Date</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Summary</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredEnrollmentReports.map(report => (
                          <tr key={report.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium">{report.studentName}</div>
                              <div className="text-sm text-gray-500">{report.studentEmail}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {new Date(report.interviewDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {report.interviewScore ? (
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  report.interviewScore >= 80 
                                    ? 'bg-green-100 text-green-800' 
                                    : report.interviewScore >= 60 
                                      ? 'bg-yellow-100 text-yellow-800' 
                                      : 'bg-red-100 text-red-800'
                                }`}>
                                  {report.interviewScore}/100
                                </span>
                              ) : (
                                <span className="text-gray-500">N/A</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 line-clamp-2">{report.reportSummary}</div>
                              {report.recommendedLearningPath && (
                                <div className="mt-2">
                                  <span className="text-xs font-medium">Recommended Path:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {report.recommendedLearningPath.map(path => (
                                      <span key={path} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        {path}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">No reports found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {enrollmentReportSearchTerm 
                        ? "Try a different search term" 
                        : "There are currently no enrollment reports to display"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Student Management</h3> {/* Changed title */}
                {/* NEW: Enroll Student Section */}
                <div className="mb-6 border-b pb-4">
                  <h4 className="text-lg font-semibold text-gray-700 mb-3">Enroll Student in Course</h4>
                  <p className="text-sm text-gray-600 mb-4">Select a student who has completed the AI interview and enroll them into one of your courses. This will link them to your company.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Student (AI Interview Completed)</label>
                      <select
                        value={studentToEnrollId}
                        onChange={(e) => setStudentToEnrollId(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Choose Student</option>
                        {students.map(student => ( // This 'students' state now includes ALL eligible students
                          <option key={student.id} value={student.id}>{student.name} ({student.email})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Course</label>
                      <select
                        value={courseToEnrollId}
                        onChange={(e) => setCourseToEnrollId(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Choose Course</option>
                        {courses.map(course => (
                          <option key={course.id} value={course.id}>{course.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEnrollStudent(studentToEnrollId, courseToEnrollId)}
                    disabled={enrollingStudent || !studentToEnrollId || !courseToEnrollId}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {enrollingStudent ? 'Enrolling...' : 'Enroll Student'}
                  </button>
                </div>
                {/* End Enroll Student Section */}

                {/* --- MODIFIED: Display Students linked to THIS Company --- */}
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Students Enrolled with Your Company</h3>
                {loading.students ? ( // This loading refers to the initial fetch of ALL eligible students
                  <div>Loading students...</div>
                ) : studentsLinkedToThisCompany.length === 0 ? (
                  <div className="text-center py-8 text-gray-600">
                    <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p>No students are currently linked to your company. Enroll students above to see them here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profile</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrolled Courses</th> 
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {studentsLinkedToThisCompany.map(student => ( 
                          <tr key={student.id}>
                            <td className="px-6 py-4 whitespace-nowrap">{student.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{student.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                student.profileVisibility === 'public' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {student.profileVisibility}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                                {enrollments.filter(e => e.studentUid === student.id).map(e => (
                                    <span key={e.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-1 mb-1">
                                        {courses.find(c => c.id === e.courseId)?.name || 'N/A'}
                                    </span>
                                ))}
                                {enrollments.filter(e => e.studentUid === student.id).length === 0 && 'None'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => recommendCandidate(student.id)}
                                className="text-blue-600 hover:text-blue-900 mr-3"
                              >
                                <UserCheck className="inline mr-1" /> Recommend
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'certificates' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Generate Certificate</h3>
                <form onSubmit={handleCreateCertificate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Student</label>
                      <select
                        value={newCertificate.studentUid || ''}
                        onChange={(e) => setNewCertificate({...newCertificate, studentUid: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        required
                      >
                        <option value="">Select a student</option>
                        {students.map(student => (
                          <option key={student.id} value={student.id}>{student.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                      <input
                        type="text"
                        value={newCertificate.courseName || ''}
                        onChange={(e) => setNewCertificate({...newCertificate, courseName: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {uploading ? 'Generating...' : 'Generate Certificate'}
                  </button>
                </form>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Issued Certificates</h3>
                {loading.certificates ? (
                  <div>Loading...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {certificates.map(cert => (
                          <tr key={cert.id}>
                            <td className="px-6 py-4 whitespace-nowrap">{cert.studentName}</td>
                            <td className="px-6 py-4 whitespace-nowrap">{cert.courseName}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {new Date(cert.completionDate).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'courses' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Create New Course</h3>
                <form onSubmit={handleCreateCourse} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
                    <input
                      type="text"
                      value={newCourse.name || ''}
                      onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={newCourse.description || ''}
                      onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                      rows={3}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {uploading ? 'Creating...' : 'Create Course'}
                  </button>
                </form>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Available Courses</h3>
                {loading.courses ? (
                  <div>Loading...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {courses.map(course => (
                      <div key={course.id} className="border rounded-lg p-4">
                        <h4 className="font-medium text-lg mb-2">{course.name}</h4>
                        <p className="text-sm text-gray-600 mb-3">{course.description}</p>
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>Created: {new Date(course.createdDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
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