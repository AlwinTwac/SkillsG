'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Mail, Briefcase, GraduationCap, Code, Heart, Target, Lightbulb } from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useSearchParams } from 'next/navigation'; 

interface StudentProfile {
  uid: string;
  name: string;
  email: string; 
  experience: string;
  skills: string[];
  interests: string[];
  goals: string;
  courseCompletedDate?: string; //tracking course completion dates optional...
  interviewSummary?: string;

}

export default function StudentBrowser() {
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSkill, setFilterSkill] = useState('');
  const [filterInterest, setFilterInterest] = useState('');

  useEffect(() => {
    const fetchPublicStudentProfiles = async () => {
      setLoading(true);
      setError(null);
      try {
        const usersRef = collection(db, 'users');
        const q = query(
  usersRef,
  where('role', '==', 'student'),
  where('profileVisibility', '==', 'public'),
  where('paidForPublic', '==', true),
  where('profileCompleted', '==', true),
  orderBy('createdAt', 'desc')
);

        const querySnapshot = await getDocs(q);

        const fetchedProfiles: StudentProfile[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedProfiles.push({
            uid: doc.id,
            name: data.name || data.displayName || data.email?.split('@')[0] || 'Unknown Student',
            email: data.email || 'N/A',
            experience: data.experience || 'No experience listed',
            skills: data.skills || [],
            interests: data.interests || [],
            goals: data.goals || 'No career goals specified',
            courseCompletedDate: data.courseCompletedDate, 
            interviewSummary: data.interviewReport?.summary || 'No interview summary available', 
          });
        });
        setProfiles(fetchedProfiles);
      } catch (err) {
        console.error("Error fetching public student profiles:", err);
        setError("Failed to load student profiles. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicStudentProfiles();
  }, []);

  const filteredProfiles = profiles.filter(profile => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const lowerFilterSkill = filterSkill.toLowerCase();
    const lowerFilterInterest = filterInterest.toLowerCase();

    const matchesSearch = lowerSearchTerm === '' ||
                          profile.name.toLowerCase().includes(lowerSearchTerm) ||
                          profile.experience.toLowerCase().includes(lowerSearchTerm) ||
                          profile.goals.toLowerCase().includes(lowerSearchTerm) ||
                          profile.interviewSummary?.toLowerCase().includes(lowerSearchTerm);

    const matchesSkill = lowerFilterSkill === '' ||
                         profile.skills.some(skill => skill.toLowerCase().includes(lowerFilterSkill));

    const matchesInterest = lowerFilterInterest === '' ||
                            profile.interests.some(interest => interest.toLowerCase().includes(lowerFilterInterest));

    return matchesSearch && matchesSkill && matchesInterest;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-extrabold text-gray-800 text-center mb-8 flex items-center justify-center">
          <Briefcase className="w-10 h-10 mr-3 text-purple-600" />
          Browse Public Student Profiles
        </h1>
        <p className="text-xl text-gray-700 text-center mb-10">
          Explore profiles of students who have completed their courses and chosen to be visible to recruiters.
        </p>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, experience, summary..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by skill (e.g., Python, React)"
              value={filterSkill}
              onChange={(e) => setFilterSkill(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="relative">
            <Heart className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by interest (e.g., AI, Web Dev)"
              value={filterInterest}
              onChange={(e) => setFilterInterest(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Profile List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Fetching public student profiles...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md text-center">
            <p>{error}</p>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-md text-center">
            <p>No public student profiles found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map((profile) => (
              <div key={profile.uid} className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
                <h3 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
                  <GraduationCap className="w-6 h-6 mr-2 text-purple-600" />
                  {profile.name}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  <Mail className="inline w-4 h-4 mr-1 text-gray-500" /> {profile.email}
                </p>

                <div className="space-y-3 text-gray-700">
                  <p className="flex items-start">
                    <Briefcase className="w-5 h-5 mr-2 mt-1 flex-shrink-0 text-purple-500" />
                    <span className="font-semibold mr-1">Experience:</span> {profile.experience}
                  </p>
                  <p className="flex items-start">
                    <Code className="w-5 h-5 mr-2 mt-1 flex-shrink-0 text-purple-500" />
                    <span className="font-semibold mr-1">Skills:</span> {profile.skills.length > 0 ? profile.skills.join(', ') : 'N/A'}
                  </p>
                  <p className="flex items-start">
                    <Heart className="w-5 h-5 mr-2 mt-1 flex-shrink-0 text-purple-500" />
                    <span className="font-semibold mr-1">Interests:</span> {profile.interests.length > 0 ? profile.interests.join(', ') : 'N/A'}
                  </p>
                  <p className="flex items-start">
                    <Target className="w-5 h-5 mr-2 mt-1 flex-shrink-0 text-purple-500" />
                    <span className="font-semibold mr-1">Goals:</span> {profile.goals}
                  </p>
                  {profile.interviewSummary && (
                    <p className="flex items-start">
                      <Lightbulb className="w-5 h-5 mr-2 mt-1 flex-shrink-0 text-purple-500" />
                      <span className="font-semibold mr-1">AI Summary:</span> {profile.interviewSummary}
                    </p>
                  )}
                  {profile.courseCompletedDate && (
                    <p className="text-sm text-gray-500 mt-2">
                      Completed: {new Date(profile.courseCompletedDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button className="mt-6 w-full px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors duration-300 shadow">
                  Contact Student
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}