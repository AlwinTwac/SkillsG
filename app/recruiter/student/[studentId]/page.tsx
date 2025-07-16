'use client';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Mail, Briefcase, Code, Heart, Target, Award, BookOpen, UserCheck, Shield, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface StudentProfile {
  id: string;
  name: string;
  email: string;
  experience: string;
  skills: string[];
  interests: string[];
  goals: string;
  profileVisibility: 'public' | 'private';
  recommended?: boolean;
}

interface Certificate {
  id: string;
  courseName: string;
  completionDate: string;
  issuedBy: string;
  fileUrl?: string;
  studentUid: string;
}

interface Tutorial {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  createdAt: string;
  studentUid: string;
}

interface PageProps {
  params: Promise<{ studentId: string }>;
}
export default function StudentProfilePage({ params }: PageProps) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

   const { studentId } = use(params);

  useEffect(() => {
    if (!studentId) {
      router.push('/recruiter/dashboard');
      return;
    }

    const fetchStudentData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const profileDocRef = doc(db, 'users', studentId);
        const profileDocSnap = await getDoc(profileDocRef);

        if (!profileDocSnap.exists()) {
          setError("Student profile not found.");
          setLoading(false);
          return;
        }
        
        const profileData = profileDocSnap.data();

        if (profileData.profileVisibility !== 'public') {
          setError("This student's profile is private.");
          setLoading(false);
          return;
        }
        
        setProfile({ id: profileDocSnap.id, ...profileData } as StudentProfile);

        const certsQuery = query(
          collection(db, 'certificates'), 
          where('studentUid', '==', studentId), 
          orderBy('completionDate', 'desc')
        );
        const certsSnapshot = await getDocs(certsQuery);
        setCertificates(certsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Certificate)));

        const tutorialsQuery = query(
          collection(db, 'tutorials'), 
          where('studentUid', '==', studentId), 
          orderBy('createdAt', 'desc')
        );
        const tutorialsSnapshot = await getDocs(tutorialsQuery);
        setTutorials(tutorialsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Tutorial)));

      } catch (err: any) {
        console.error("Error fetching student data:", err);
        setError("Failed to load student data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [studentId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-16 h-16 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center bg-red-100 p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-700 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/recruiter/dashboard" className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/recruiter/dashboard" className="inline-flex items-center text-gray-600 hover:text-purple-700 mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to All Candidates
        </Link>
        
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-start">
            <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mb-4 sm:mb-0 sm:mr-6">
              <UserCheck className="w-12 h-12 text-purple-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-800">{profile?.name}</h1>
              <p className="text-lg text-gray-500 flex items-center mt-2">
                <Mail className="w-5 h-5 mr-2" /> {profile?.email}
              </p>
              {profile?.recommended && (
                <div className="mt-3 inline-flex items-center bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                  <UserCheck className="w-4 h-4 mr-1.5" /> Recommended Candidate
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center"><Briefcase className="w-6 h-6 mr-3 text-purple-600"/>Professional Summary</h2>
              <div className="space-y-4 text-gray-700">
                <div>
                  <h3 className="font-semibold text-gray-800">Experience Level</h3>
                  <p>{profile?.experience}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Career Goals</h3>
                  <p>{profile?.goals}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center"><Award className="w-6 h-6 mr-3 text-purple-600"/>Certificates</h2>
              {certificates.length > 0 ? (
                <ul className="space-y-3">
                  {certificates.map(cert => (
                    <li key={cert.id} className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-semibold text-gray-800">{cert.courseName}</p>
                      <p className="text-sm text-gray-500">Issued by {cert.issuedBy} on {new Date(cert.completionDate).toLocaleDateString()}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-gray-500">No certificates listed.</p>}
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center"><BookOpen className="w-6 h-6 mr-3 text-purple-600"/>Portfolio & Tutorials</h2>
              {tutorials.length > 0 ? (
                <ul className="space-y-3">
                  {tutorials.map(tut => (
                    <li key={tut.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <a href={tut.fileUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-purple-700 hover:underline">{tut.title}</a>
                      <p className="text-sm text-gray-600 line-clamp-2">{tut.description}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-gray-500">No portfolio items or tutorials uploaded.</p>}
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center"><Code className="w-6 h-6 mr-3 text-purple-600"/>Skills</h2>
              <div className="flex flex-wrap gap-2">
                {profile?.skills?.map((skill, i) => (
                  <span key={i} className="bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1 rounded-full">{skill}</span>
                ))}
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center"><Heart className="w-6 h-6 mr-3 text-purple-600"/>Interests</h2>
              <div className="flex flex-wrap gap-2">
                {profile?.interests?.map((interest, i) => (
                  <span key={i} className="bg-gray-100 text-gray-800 text-sm font-medium px-3 py-1 rounded-full">{interest}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}