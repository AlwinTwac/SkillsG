'use client';

import React, { useState, useEffect } from 'react';
import { LogOut, UploadCloud, Search, BookOpen, FileText, Video, Users, ClipboardList, BarChart2, FileBarChart2, Award, Mail, UserCheck } from 'lucide-react';
import { auth, db, storage } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, onSnapshot, orderBy, updateDoc } from 'firebase/firestore';
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
  courseId?: string;
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
  companyUid :string
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
}

export default function CompanyDashboard({ userDisplayName, userEmail, userUid }: CompanyDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [enrollmentReports, setEnrollmentReports] = useState<EnrollmentReport[]>([]);
  const [learningMaterials, setLearningMaterials] = useState<LearningMaterial[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [enrollmentReportSearchTerm, setEnrollmentReportSearchTerm] = useState('');
  const [loading, setLoading] = useState({
    reports: true,
    materials: true,
    courses: true,
    students: true,
    certificates: true
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [newContent, setNewContent] = useState<Partial<LearningMaterial>>({
    title: '',
    description: '',
    type: 'pdf',
    accessibleStudentUids: []
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

    // Fetch Students (those who have enrolled with this company)
    const studentsQuery = query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      where('companyUid', '==', userUid)
    );
    const studentsUnsub = onSnapshot(studentsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(data);
      setLoading(prev => ({ ...prev, students: false }));
    });

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

    return () => {
      reportsUnsub();
      materialsUnsub();
      coursesUnsub();
      studentsUnsub();
      certsUnsub();
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
    if (!selectedFile || !newContent.title) {
      setUploadError("Please provide a title and select a file.");
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
        accessibleStudentUids: newContent.accessibleStudentUids || [],
        courseId: newContent.courseId || null
      });

      setUploadSuccess("Material uploaded successfully!");
      setNewContent({
        title: '',
        description: '',
        type: 'pdf',
        accessibleStudentUids: []
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

    const certData: Certificate = {
      studentUid: newCertificate.studentUid,
      studentName: student.name,
      studentEmail: student.email,
      courseName: newCertificate.courseName,
      completionDate: new Date().toISOString(),
      issuedBy: userDisplayName || "Company Admin",
      companyUid: userUid // This is now properly included in the type
    };

    await setDoc(doc(collection(db, 'certificates')), certData);

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

  const recommendCandidate = async (studentUid: string) => {
    try {
      const student = students.find(s => s.id === studentUid);
      if (!student) return;

      // In a real app, you would have recruiter UIDs to recommend to
      // This is a simplified version that just marks the student as recommended
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

  const filteredEnrollmentReports = enrollmentReports.filter(report => {
    const lowerSearchTerm = enrollmentReportSearchTerm.toLowerCase();
    return report.studentName.toLowerCase().includes(lowerSearchTerm) ||
           report.studentEmail.toLowerCase().includes(lowerSearchTerm) ||
           report.reportSummary?.toLowerCase().includes(lowerSearchTerm);
  });

  // ... (keep existing render methods and UI components)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-teal-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-teal-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <ClipboardList className="w-8 h-8 mr-3" />
              <div>
                <h2 className="text-2xl font-bold">Company Dashboard</h2>
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

        {/* Tab Navigation - Add more tabs as needed */}
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
              {/* Overview content remains the same */}
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Course (Optional)</label>
                        <select
                          value={newContent.courseId || ''}
                          onChange={(e) => setNewContent({...newContent, courseId: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-lg"
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Accessible Students (Optional)
                        </label>
                        <input
                          type="text"
                          value={newContent.accessibleStudentUids?.join(', ') || ''}
                          onChange={(e) => setNewContent({
                            ...newContent,
                            accessibleStudentUids: e.target.value.split(',').map(s => s.trim())
                          })}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                          placeholder="student1, student2"
                        />
                      </div>
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

              {/* Existing materials list */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Learning Materials</h3>
                {loading.materials ? (
                  <div>Loading...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {learningMaterials.map(material => (
                      <div key={material.id} className="border rounded-lg p-4">
                        <div className="flex items-center mb-2">
                          {material.type === 'pdf' && <FileText className="text-red-500 mr-2" />}
                          {material.type === 'video' && <Video className="text-blue-500 mr-2" />}
                          {material.type === 'image' && <img src={material.fileUrl} className="w-6 h-6 mr-2" alt="Thumbnail" />}
                          <h4 className="font-medium">{material.title}</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{material.description}</p>
                        <a 
                          href={material.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 text-sm"
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
              {/* Enrollment reports content */}
            </div>
          )}

          {activeTab === 'students' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Enrolled Students</h3>
                {loading.students ? (
                  <div>Loading...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profile</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {students.map(student => (
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