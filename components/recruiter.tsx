'use client';

import React, { useState, useEffect } from 'react';
import { LogOut, Search, Lightbulb, Filter, User, Mail, Award, BookOpen } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface StudentProfile {
  id: string;
  name: string;
  email: string;
  skills: string[];
  experience: string;
  interests: string[];
  goals: string;
  profileVisibility: 'public' | 'private';
  certificates?: {
    courseName: string;
    issuedAt: string;
  }[];
}

interface RecruiterDashboardProps {
  userDisplayName: string | null;
  userEmail: string | null;
}

export default function RecruiterDashboard({ userDisplayName, userEmail }: RecruiterDashboardProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSkills, setFilterSkills] = useState<string[]>([]);
  const [filterExperience, setFilterExperience] = useState('');
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out:", error);
      alert("Failed to sign out. Please try again.");
    }
  };

  const searchStudents = async () => {
    if (!searchTerm && !filterSkills.length && !filterExperience) {
      setError('Please enter at least one search criteria');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let q = query(
        collection(db, 'users'),
        where('role', '==', 'student'),
        where('profileVisibility', '==', 'public')
      );

      const snapshot = await getDocs(q);
      const results: StudentProfile[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        results.push({
          id: doc.id,
          name: data.name || '',
          email: data.email || '',
          skills: data.skills || [],
          experience: data.experience || '',
          interests: data.interests || [],
          goals: data.goals || '',
          profileVisibility: data.profileVisibility || 'private',
          certificates: data.certificates || []
        });
      });

      // Apply filters
      const filtered = results.filter(student => {
        // Search term filter (name, email, or goals)
        const termMatch = !searchTerm || 
          student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.goals.toLowerCase().includes(searchTerm.toLowerCase());

        // Skills filter
        const skillsMatch = filterSkills.length === 0 || 
          filterSkills.every(skill => 
            student.skills.some(s => 
              s.toLowerCase().includes(skill.toLowerCase())
            )
          );

        // Experience filter
        const experienceMatch = !filterExperience || 
          student.experience.toLowerCase().includes(filterExperience.toLowerCase());

        return termMatch && skillsMatch && experienceMatch;
      });

      setStudents(filtered);
    } catch (err) {
      console.error("Error searching students:", err);
      setError('Failed to search students. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addSkillFilter = () => {
    if (searchTerm && !filterSkills.includes(searchTerm)) {
      setFilterSkills([...filterSkills, searchTerm]);
      setSearchTerm('');
    }
  };

  const removeSkillFilter = (skill: string) => {
    setFilterSkills(filterSkills.filter(s => s !== skill));
  };

  return (
    <div className="max-w-6xl mx-auto p-8 bg-white rounded-lg shadow-xl">
      <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200">
        <h2 className="text-3xl font-bold text-gray-800 flex items-center">
          <Lightbulb className="w-8 h-8 text-purple-600 mr-3" />
          Recruiter Dashboard
        </h2>
        <div className="flex items-center">
          <span className="text-gray-600 mr-4">
            Hello, {userDisplayName || userEmail?.split('@')[0] || 'Recruiter'}!
          </span>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center transition-colors duration-300"
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </button>
        </div>
      </div>

      {/* Search Section */}
      <div className="mb-8 bg-gray-50 p-6 rounded-lg">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
          <Search className="w-5 h-5 mr-2 text-blue-600" />
          Find Candidates
        </h3>
        
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or goals..."
              className="pl-10 w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={addSkillFilter}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
          >
            <Filter className="w-5 h-5 mr-2" />
            Add Skill Filter
          </button>
        </div>

        {/* Active Filters */}
        <div className="mb-4">
          {filterSkills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              <span className="text-sm font-medium">Skills:</span>
              {filterSkills.map(skill => (
                <span 
                  key={skill} 
                  className="flex items-center bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
                >
                  {skill}
                  <button 
                    onClick={() => removeSkillFilter(skill)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center">
            <label htmlFor="experience" className="text-sm font-medium mr-2">Experience:</label>
            <select
              id="experience"
              value={filterExperience}
              onChange={(e) => setFilterExperience(e.target.value)}
              className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Any</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        <button
          onClick={searchStudents}
          disabled={loading}
          className="w-full md:w-auto px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
          ) : (
            <Search className="w-5 h-5 mr-2" />
          )}
          {loading ? 'Searching...' : 'Search Students'}
        </button>

        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}
      </div>

      {/* Search Results */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          {students.length} {students.length === 1 ? 'Candidate' : 'Candidates'} Found
        </h3>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Searching for candidates...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-gray-100 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-600">No candidates match your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.map(student => (
              <div key={student.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 p-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                    <User className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{student.name}</h4>
                    <p className="text-sm text-gray-600">{student.email}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-semibold">Experience:</span> {student.experience || 'Not specified'}
                  </p>
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-semibold">Goals:</span> {student.goals || 'Not specified'}
                  </p>
                </div>

                {student.skills.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Skills:</p>
                    <div className="flex flex-wrap gap-1">
                      {student.skills.map((skill, i) => (
                        <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {student.certificates && student.certificates.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-1 flex items-center">
                      <Award className="w-4 h-4 mr-1" /> Certificates:
                    </p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {student.certificates.map((cert, i) => (
                        <li key={i} className="flex items-center">
                          <BookOpen className="w-3 h-3 mr-1 text-gray-500" />
                          {cert.courseName} ({new Date(cert.issuedAt).toLocaleDateString()})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button 
                  onClick={() => router.push(`/recruiter/student/${student.id}`)}
                  className="w-full mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-300"
                >
                  View Full Profile
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}