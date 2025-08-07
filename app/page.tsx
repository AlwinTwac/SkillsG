'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously, signOut, User as FirebaseAuthUser } from 'firebase/auth';
import { doc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, Building2, Briefcase, ArrowLeft, Loader2, CheckCircle, Star, Rocket, School, Search, Newspaper, Megaphone, ChevronLeft, ChevronRight, Trophy, GraduationCap } from 'lucide-react';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeSwitcher } from '@/components/theme-switcher';
import AuthComponent from '@/components/login';
import AIInterviewer from '@/components/interviewerai';
import StudentDashboard from '@/components/studentdash';
import CompanyDashboard from '@/components/companydash';
import RecruiterDashboard from '@/components/recruiter';

interface UserProfile {
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
  authProvider: string;
  profileCompleted: boolean;
  role: 'student' | 'company' | 'recruiter';
  name?: string;
}

interface Achievement {
  id: string;
  studentName: string;
  studentAvatar?: string;
  description: string;
  imageUrl: string;
  createdAt: string;
  status: 'approved';
}

type FlowState = 'roleSelection' | 'learnerChoice' | 'interviewing' | 'interviewComplete' | 'auth' | 'dashboard';
type InitialRole = 'learner' | 'company' | 'recruiter';

const carouselImages = [
  {
    id: 1,
    alt: "Students learning together",
    image: "/images/img2.jpg",
    title: "Transform Your Future",
    description: "Join our platform to access world-class learning resources"
  },
  {
    id: 2,
    alt: "Professional networking event",
    image: "/images/img1.jpg",
    title: "Connect With Industry Leaders",
    description: "Build your network with top companies and recruiters"
  },
  {
    id: 3,
    alt: "Graduation ceremony",
    image: "/images/img0.jpg",
    title: "Achieve Your Career Goals",
    description: "Get the skills you need to succeed in today's job market"
  }
];

const companyNews = [
  {
    id: 1,
    title: "New Partnership Announcement",
    content: "We've partnered with leading tech companies to provide exclusive opportunities.",
    icon: <Newspaper className="w-5 h-5 text-blue-600" />
  },
  {
    id: 2,
    title: "Platform Update",
    content: "New dashboard features released for company accounts.",
    icon: <Megaphone className="w-5 h-5 text-blue-600" />
  },
  {
    id: 3,
    title: "Upcoming Events",
    content: "Join our virtual career fair next month - registration now open.",
    icon: <Newspaper className="w-5 h-5 text-blue-600" />
  }
];

const studentAnnouncements = [
  {
    id: 1,
    title: "sign up for our upcoming class",
    content: "Register now for our class.",
    icon: <Megaphone className="w-5 h-5 text-blue-600" />
  },
  {
    id: 2,
    title: "New Courses Added",
    content: "Check out our latest course offerings.",
    icon: <Newspaper className="w-5 h-5 text-blue-600" />
  },
  {
    id: 3,
    title: "Career Workshop",
    content: "Sign up for our resume and interview preparation workshop.",
    icon: <Megaphone className="w-5 h-5 text-blue-600" />
  }
];

const Home = () => {
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [flowState, setFlowState] = useState<FlowState>('roleSelection');
  const [initialRoleSelection, setInitialRoleSelection] = useState<InitialRole>('learner');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentAchievementIndex, setCurrentAchievementIndex] = useState(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    if (flowState === 'roleSelection') {
      const carouselInterval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
      }, 5000);
      return () => clearInterval(carouselInterval);
    }
  }, [flowState]);

  useEffect(() => {
    if (achievements.length > 1) {
      const interval = setInterval(() => {
        setCurrentAchievementIndex((prev) => (prev + 1) % achievements.length);
      }, 5000); 
      return () => clearInterval(interval);
    }
  }, [achievements.length]);

  useEffect(() => {
    const achievementsQuery = query(
      collection(db, 'achievements'), 
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(achievementsQuery, (snapshot) => {
      const fetchedAchievements = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Achievement));
      setAchievements(fetchedAchievements);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && !currentUser.isAnonymous) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as UserProfile);
            setFlowState('dashboard');
          } else {
            signOut(auth);
          }
          setLoading(false);
        });
        return unsubscribeFirestore;
      } else if (currentUser && currentUser.isAnonymous) {
        setFlowState('interviewing');
        setLoading(false);
      } else {
        setUserProfile(null);
        setFlowState('roleSelection');
        setLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleNewStudentStart = async () => {
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Anonymous sign-in failed:", error);
      setLoading(false);
    }
  };

  const handleInterviewComplete = () => {
    setFlowState('interviewComplete');
  };

  const handleAuthSuccess = (loggedInUser: FirebaseAuthUser) => {
    setFlowState('dashboard');
  };
  
  const handlePortalSelection = (role: 'company' | 'recruiter') => {
    if (user && user.isAnonymous) {
      signOut(auth);
    }
    setInitialRoleSelection(role);
    setFlowState('auth');
  };

  const handleReturnHome = () => {
    if (user && user.isAnonymous) {
      signOut(auth);
    }
    setFlowState('roleSelection');
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-50">
        <div className="flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <span className="text-lg text-blue-800">Loading your experience...</span>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen bg-white">
        {/* Navigation Bar */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
            <div className="text-xl font-bold text-blue-800">KG LEARNING PLATFORM</div>
            <ThemeSwitcher />
          </div>
        </header>

        {/* Main Content */}
        <main className="pt-16">
          {flowState === 'dashboard' && user && userProfile ? (
            <>
              {userProfile.role === 'student' && <StudentDashboard userDisplayName={userProfile.name || user.displayName || ''} userEmail={user.email || ''} userUid={user.uid} />}
              {userProfile.role === 'company' && <CompanyDashboard userDisplayName={userProfile.displayName || null} userEmail={user.email || ''} userUid={user.uid} />}
              {userProfile.role === 'recruiter' && <RecruiterDashboard userDisplayName={userProfile.name || user.displayName || ''} userEmail={user.email || ''} />}
            </>
          ) : flowState === 'interviewing' && user ? (
            <AIInterviewer user={user} onInterviewComplete={handleInterviewComplete} onGoBack={handleReturnHome} />
          ) : flowState === 'interviewComplete' ? (
            <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-xl shadow-lg border border-blue-100">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-blue-600 mx-auto mb-4"/>
                <h2 className="text-3xl font-bold text-blue-800 mb-4">Interview Complete!</h2>
                <p className="text-blue-700 mb-6">
                  Your report has been submitted for review. If your application is approved, you'll receive an email to set your password.
                </p>
                <button 
                  onClick={handleReturnHome} 
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
                >
                  Return Home
                </button>
              </div>
            </div>
          ) : flowState === 'auth' ? (
            <AuthComponent 
              onAuthSuccess={handleAuthSuccess} 
              defaultRole={initialRoleSelection} 
              onBack={handleReturnHome}
            />
          ) : flowState === 'learnerChoice' ? (
            <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-xl shadow-lg border border-blue-100">
              <button 
                onClick={() => setFlowState('roleSelection')} 
                className="flex items-center text-sm text-blue-600 hover:text-blue-800 mb-6"
              >
                <ArrowLeft className="w-4 h-4 mr-1"/> Back
              </button>
              <div className="text-center">
                <School className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-blue-800 mb-6">Welcome, Learner!</h2>
                <div className="space-y-4">
                  <button 
                    onClick={handleNewStudentStart} 
                    className="w-full px-6 py-3 bg-blue-600 text-blue-100 rounded-lg font-medium hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
                  >
                    New Student (Start AI Interview)
                  </button>
                  <button 
                    onClick={() => { setInitialRoleSelection('learner'); setFlowState('auth'); }} 
                    className="w-full px-6 py-3 bg-blue-100 text-blue-800 rounded-lg font-medium hover:bg-blue-200 transition-all shadow-sm hover:shadow-md"
                  >
                    Existing Account (Login)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto px-4 py-12">
              {/* Hero Section */}
              <section className="mb-20">
                <div className="relative h-96 w-full rounded-2xl overflow-hidden shadow-lg bg-gray-100">
                  {carouselImages.map((image, index) => (
                    <div 
                      key={image.id}
                      className={`absolute inset-0 transition-opacity duration-1000 flex items-center justify-center ${
                        index === currentSlide ? 'opacity-100' : 'opacity-0'
                      }`}
                      style={{ 
                        backgroundImage: `url(${image.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    >
                      <div className="absolute inset-0 bg-black/30"></div>
                      <div className="relative z-10 text-center px-8 text-white max-w-2xl">
                        <h2 className="text-4xl md:text-5xl font-extrabold mb-4 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                          {image.title}
                        </h2>
                        <p className="text-xl md:text-2xl mb-6 font-medium text-white/90 bg-black/20 backdrop-blur-sm px-4 py-2 rounded-lg inline-block">
                          {image.description}
                        </p>
                        <button 
                          onClick={() => setFlowState('learnerChoice')}
                          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          Get Started
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    onClick={prevSlide}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/30 text-white p-2 rounded-full hover:bg-white/50 transition-all"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={nextSlide}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/30 text-white p-2 rounded-full hover:bg-white/50 transition-all"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
                    {carouselImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`w-3 h-3 rounded-full transition-all ${
                          index === currentSlide ? 'bg-white w-6' : 'bg-white/50'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </section>

              {/* Content Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
                {/* Achievements Container */}
                <section className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h3 className="text-2xl font-bold text-blue-800 mb-6 flex items-center">
                    <Trophy className="w-6 h-6 mr-2 text-blue-600" />
                    Student Success Stories
                  </h3>
                  {achievements.length > 0 ? (
                    <div className="relative h-full">
                      {achievements.map((achievement, index) => (
                        <div 
                          key={achievement.id}
                          className={`absolute inset-0 transition-opacity duration-1000 flex flex-col ${
                            index === currentAchievementIndex ? 'opacity-100' : 'opacity-0'
                          }`}
                        >
                          <div className="relative h-40 w-full rounded-lg overflow-hidden">
                            <img 
                              src={achievement.imageUrl} 
                              alt={achievement.description}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                          </div>
                          <div className="mt-4 p-2">
                            <p className="text-gray-700 mb-3 line-clamp-3">"{achievement.description}"</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2 border-2 border-blue-200">
                                  <span className="text-sm font-medium text-blue-800">
                                    {achievement.studentName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </span>
                                </div>
                                <p className="font-medium text-blue-800">{achievement.studentName}</p>
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(achievement.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Navigation dots */}
                      {achievements.length > 1 && (
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                          {achievements.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentAchievementIndex(index)}
                              className={`w-3 h-3 rounded-full transition-all ${
                                index === currentAchievementIndex ? 'bg-blue-600 w-6' : 'bg-gray-300'
                              }`}
                              aria-label={`Show achievement ${index + 1}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 bg-blue-50 rounded-lg">
                      <Trophy className="w-12 h-12 text-blue-400 mb-4" />
                      <h4 className="text-lg font-medium text-blue-800 mb-2">No achievements yet</h4>
                      <p className="text-blue-600 text-sm max-w-xs">
                        When students post achievements and they get approved, they'll appear here
                      </p>
                    </div>
                  )}
                </section>

                {/* News Container */}
                <section className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                  <h3 className="text-2xl font-bold text-blue-800 mb-6 flex items-center">
                    <Newspaper className="w-6 h-6 mr-2 text-blue-600" />
                    Latest Updates
                  </h3>
                  <div className="space-y-4">
                    {companyNews.map(news => (
                      <div key={news.id} className="p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer group">
                        <div className="flex items-start">
                          <div className="mr-3 mt-0.5">
                            {news.icon}
                          </div>
                          <div>
                            <h4 className="font-bold text-blue-800 group-hover:text-blue-700">{news.title}</h4>
                            <p className="text-sm text-gray-700">{news.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* Call to Action */}
              <section className="text-center mb-16">
                <div className="inline-flex items-center justify-center bg-blue-100 text-blue-800 px-6 py-2 rounded-full mb-4 shadow-sm">
                  <Rocket className="w-5 h-5 mr-2" />
                  <span className="font-medium">START YOUR JOURNEY TODAY</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-blue-800 mb-4">
                  Discover Your <span className="text-blue-600">Perfect</span> Path
                </h1>
                <p className="text-xl text-blue-700 max-w-2xl mx-auto">
                  Join our platform today to become an ISD.
                </p>
              </section>

              {/* Role Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                {/* Learner Card */}
                <div 
                  onClick={() => setFlowState('learnerChoice')}
                  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-gray-200 hover:border-blue-300 hover:-translate-y-1"
                >
                  <div className="bg-blue-100 p-4 rounded-full w-max mb-6">
                    <User className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-blue-800 mb-3">Learner</h3>
                  <p className="text-gray-700 mb-6">
                    Start your personalized learning journey with our AI-powered platform.
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-600">Get Started</span>
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <ArrowLeft className="w-4 h-4 text-white rotate-180" />
                    </div>
                  </div>
                </div>
                
                {/* Company Card */}
                <div 
                  onClick={() => handlePortalSelection('company')}
                  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-gray-200 hover:border-blue-300 hover:-translate-y-1"
                >
                  <div className="bg-blue-100 p-4 rounded-full w-max mb-6">
                    <Building2 className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-blue-800 mb-3">Company</h3>
                  <p className="text-gray-700 mb-6">
                    Access top talent and manage your organization's learning programs.
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-600">Company Portal</span>
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <ArrowLeft className="w-4 h-4 text-white rotate-180" />
                    </div>
                  </div>
                </div>
                
                {/* Recruiter Card */}
                <div 
                  onClick={() => handlePortalSelection('recruiter')}
                  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-gray-200 hover:border-blue-300 hover:-translate-y-1"
                >
                  <div className="bg-blue-100 p-4 rounded-full w-max mb-6">
                    <Search className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-blue-800 mb-3">Recruiter</h3>
                  <p className="text-gray-700 mb-6">
                    Find and connect with exceptional talent in our growing network.
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-600">Recruiter Portal</span>
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <ArrowLeft className="w-4 h-4 text-white rotate-180" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="min-h-[200px] flex items-center justify-center bg-blue-100 rounded-2xl p-8">
                <p className="text-lg text-blue-800">Join thousands of learners and organizations transforming their futures</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </ThemeProvider>
  );
};

export default Home;