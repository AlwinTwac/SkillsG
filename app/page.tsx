'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously, signOut, User as FirebaseAuthUser } from 'firebase/auth';
import { doc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, Building2, Briefcase, ArrowLeft, Loader2, CheckCircle, Star, Rocket, School, Search, Newspaper, Megaphone, ChevronLeft, ChevronRight, Trophy, GraduationCap, Mail, Phone, MapPin } from 'lucide-react';
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
  status: 'approved' | 'pending' | 'rejected'; 
  studentUid: string; 
  isFeatured?: boolean; 
  category?: string;
  skillsDemonstrated?: string[];
  companyApprover?: string; 
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
  const [featuredIndex, setFeaturedIndex] = useState(0);

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

  // Auto-advance featured success stories (the small panel)
  useEffect(() => {
    const featured = achievements.filter(a => a.isFeatured);
    if (featured.length <= 1) {
      setFeaturedIndex(0);
      return;
    }
    const t = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % featured.length);
    }, 4000);
    return () => clearInterval(t);
  }, [achievements]);

  useEffect(() => {
    const achievementsQuery = query(
      collection(db, 'achievements'),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(
      achievementsQuery,
      (snapshot) => {
        const fetchedAchievements = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Achievement));
        setAchievements(fetchedAchievements);
      },
      (err) => {
        console.error('Error listening to public achievements:', err);
        // Do not throw; surface a minimal UI signal if needed
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let firestoreUnsub: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      // If there is an existing firestore listener, detach it when auth state changes
      if (firestoreUnsub) {
        try {
          firestoreUnsub();
        } catch (e) {
          console.warn('Error while unsubscribing from previous user doc listener', e);
        }
        firestoreUnsub = null;
      }

      if (currentUser && !currentUser.isAnonymous) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        firestoreUnsub = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setUserProfile(docSnap.data() as UserProfile);
              setFlowState('dashboard');
            } else {
              // If no user document, sign the user out to reset state
              signOut(auth);
            }
            setLoading(false);
          },
          (err) => {
            console.error('Error listening to current user document:', err);
            // Permission denied likely — sign out to reset and avoid uncaught errors
            setLoading(false);
            setUserProfile(null);
            setFlowState('roleSelection');
            try {
              signOut(auth);
            } catch (e) {
              console.warn('Failed to sign out after firestore error', e);
            }
          }
        );
      } else if (currentUser && currentUser.isAnonymous) {
        setFlowState('interviewing');
        setLoading(false);
      } else {
        setUserProfile(null);
        setFlowState('roleSelection');
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (firestoreUnsub) {
        try { firestoreUnsub(); } catch (e) { /* ignore */ }
      }
    };
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
        <header className="sticky top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="w-full px-4 py-2 flex justify-between items-center">
            <div className="text-lg font-bold text-blue-800">KG LEARNING PLATFORM</div>
            <ThemeSwitcher />
          </div>
        </header>

        {/* Main Content */}
        <main className="pt-0 bg-gradient-to-b from-white to-blue-50 w-full">
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
            <div className="w-full px-0 py-0">
              {/* Hero Section */}
              <section className="mb-16">
                <div className="relative h-[500px] w-full overflow-hidden shadow-lg bg-gray-100">
                  {carouselImages.map((image, index) => (
                    <div 
                      key={image.id}
                      className={`absolute inset-0 transition-opacity duration-1000 ${
                        index === currentSlide ? 'opacity-100' : 'opacity-0'
                      }`}
                      style={{ 
                        backgroundImage: `url(${image.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        width: '100%',
                        height: '100%'
                      }}
                    >
                      <div className="absolute inset-0 bg-black/30"></div>
                      
                      {/* Text Content - Bottom Left */}
                      <div className="absolute bottom-8 left-8 z-10 text-white max-w-md">
                        <h2 className="text-3xl md:text-4xl font-extrabold mb-3 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                          {image.title}
                        </h2>
                        <p className="text-lg md:text-xl font-medium text-white/90 bg-black/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                          {image.description}
                        </p>
                      </div>
                      
                      {/* Get Started Button - Bottom Right */}
                      <div className="absolute bottom-8 right-8 z-10">
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12 px-4">
                {/* Achievements Container */}
                <section className="bg-white rounded-xl shadow-md border border-gray-200 p-5 hover:shadow-lg transition-all duration-300 group hover:border-blue-300 relative overflow-hidden h-[500px]">
                  <div className="absolute top-0 left-0 right-0 h-0 bg-blue-500 group-hover:h-1 transition-all duration-300"></div>
                  <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
                    <Trophy className="w-5 h-5 mr-2 text-blue-600" />
                    Student Success Stories
                  </h3>
                  {achievements.length > 0 ? (
                    <div className="relative h-[calc(100%-2rem)]">
                      {achievements.map((achievement, index) => (
                        <div 
                          key={achievement.id}
                          className={`absolute inset-0 transition-opacity duration-1000 flex flex-col ${
                            index === currentAchievementIndex ? 'opacity-100' : 'opacity-0'
                          }`}
                        >
                          <div className="relative w-full h-64 overflow-hidden rounded-lg">
                            <img 
                              src={achievement.imageUrl} 
                              alt={achievement.description}
                              className="w-full h-full object-cover object-center"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                          </div>
                          <div className="mt-4 p-2 bg-white rounded-lg">
                            <p className="text-gray-700 mb-4 line-clamp-3">"{achievement.description}"</p>
                            <div className="flex items-center justify-between bg-blue-50 p-2 rounded-lg">
                              <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2 border-2 border-blue-200 shadow-sm">
                                  <span className="text-sm font-medium text-blue-800">
                                    {achievement.studentName.split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </span>
                                </div>
                                <p className="font-medium text-blue-800">{achievement.studentName}</p>
                              </div>
                              <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-md shadow-sm">
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
<section className="bg-white rounded-xl shadow-md border border-gray-200 p-5 hover:shadow-lg transition-all duration-300 group hover:border-blue-300 relative overflow-hidden h-[500px]">
  <div className="absolute top-0 left-0 right-0 h-0 bg-blue-500 group-hover:h-1 transition-all duration-300"></div>
  <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center">
    <Newspaper className="w-5 h-5 mr-2 text-blue-600" />
    Latest Updates
  </h3>
  <div className="space-y-3">
    {companyNews.map(news => (
      <div key={news.id} className="p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer group hover:shadow-md hover:-translate-y-1 duration-300 border border-transparent hover:border-blue-200 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-0 h-1 bg-blue-400 group-hover:w-full transition-all duration-500"></div>
        <div className="flex items-start">
          <div className="mr-2 mt-0.5">
            {news.icon}
          </div>
          <div>
            <h4 className="font-bold text-blue-800 group-hover:text-blue-700 text-sm">{news.title}</h4>
            <p className="text-xs text-gray-700">{news.content}</p>
          </div>
        </div>
      </div>
    ))}
    
    {/* New Square Panels */}
    <div className="grid grid-cols-3 gap-4 mt-6">
      {/* News Panel */}
      <div className="aspect-square rounded-lg p-4 hover:shadow-lg hover:scale-105 duration-300 border border-transparent hover:border-blue-300 text-center overflow-hidden group relative">
        {/* Background Image */}
        <div className="absolute inset-0 w-full h-full z-0">
          <img 
            src="/images/news_image.png" 
            alt="News" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-blue-600/30 group-hover:bg-blue-600/20 transition-all duration-300"></div>
        </div>
        {/* Icon - Top Left */}
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-white/70 p-2 rounded-full w-max group-hover:bg-white/80 transition-all duration-300 transform group-hover:scale-110">
            <Newspaper className="w-6 h-6 text-blue-600/80 group-hover:text-blue-700" />
          </div>
        </div>
        {/* Title - Bottom Center */}
        <div className="absolute bottom-8 left-0 right-0 z-10 flex justify-center">
          <h4 className="font-bold text-white text-sm bg-blue-800/70 px-3 py-1 rounded-md group-hover:bg-blue-900/80">News</h4>
        </div>
      </div>
      
      {/* Outstanding Panel */}
      <div className="aspect-square rounded-lg p-4 hover:shadow-lg hover:scale-105 duration-300 border border-transparent hover:border-blue-300 text-center overflow-hidden group relative">
        {/* Background Image */}
        <div className="absolute inset-0 w-full h-full z-0">
          <img 
            src="/images/outstanding.png" 
            alt="Outstanding" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-blue-600/30 group-hover:bg-blue-600/20 transition-all duration-300"></div>
        </div>
        {/* Icon - Top Left */}
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-white/70 p-2 rounded-full w-max group-hover:bg-white/80 transition-all duration-300 transform group-hover:scale-110">
            <Star className="w-6 h-6 text-blue-600/80 group-hover:text-blue-700" />
          </div>
        </div>
        {/* Title - Bottom Center */}
        <div className="absolute bottom-8 left-0 right-0 z-10 flex justify-center">
          <h4 className="font-bold text-white text-sm bg-blue-800/70 px-3 py-1 rounded-md group-hover:bg-blue-900/80">Outstanding</h4>
        </div>
      </div>
    
 <div className="aspect-square rounded-lg hover:shadow-lg hover:scale-105 duration-300 border border-transparent hover:border-blue-300 text-center overflow-hidden group relative">
  
         

          {(() => {
            const featured = achievements.filter(a => a.isFeatured);
            if (featured.length === 0) {
              return (
                <div className="flex-1 rounded-lg bg-blue-100 flex flex-col items-center justify-center p-4">
                  <Trophy className="w-10 h-10 text-blue-500 mb-3" />
                  <h4 className="text-sm font-bold text-blue-800 mb-1">No featured stories yet</h4>
                  <p className="text-xs text-blue-700 max-w-[12rem]">When students post achievements and they get approved and featured, they'll appear here.</p>
                </div>
              );
            }

            const item = featured[featuredIndex % featured.length];
            return (
              <div className="flex-1 flex flex-col justify-between">
                {/* full-bleed image that fills the panel */}
                <div className="relative rounded-lg overflow-hidden h-full shadow-sm">
                  <img src={item.imageUrl} alt={item.description} className="w-full h-full object-cover" />
                  {/* subtle dark gradient to improve text contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* bottom overlay with text and metadata */}
                  <div className="absolute bottom-0 left-0 right-0 p-0 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-xs text-white line-clamp-9">"{item.description}"</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center mr-2">
                          <span className="text-xs font-sm text-white">
                            {item.studentName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs font-sm text-white">{item.studentName}</p>
                      </div>
                      <span className="text-[11px] text-white/80">{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* dots */}
                {featured.length > 1 && (
                  <div className="flex justify-center gap-2 mt-3">
                    {featured.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setFeaturedIndex(i)}
                        className={`w-2 h-2 rounded-full ${i === (featuredIndex % featured.length) ? 'bg-blue-600' : 'bg-blue-200'}`}
                        aria-label={`Show featured ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

    </div>
</section>
              </div>


             
              <div className="bg-gradient-to-b from-white via-blue-100 to-white text-blue-800 rounded-xl p-8 text-center mb-16 px-4 shadow-md hover:shadow-lg transition-all duration-300 group relative overflow-hidden mx-4 border border-blue-200">
                <div className="absolute top-0 left-0 right-0 h-0 bg-blue-200/50 group-hover:h-1 transition-all duration-300"></div>
                <h2 className="text-2xl font-bold mb-4">Start Your Journey Today</h2>
                <p className="mb-6 max-w-2xl mx-auto">Join thousands of learners who have transformed their careers through our platform</p>
                <button 
                  className="bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                  onClick={() => setFlowState('learnerChoice')}
                >
                  Get Started
                </button>
              </div>

              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4 mb-16 mt-8">
               
                <div 
                  onClick={() => setFlowState('learnerChoice')}
                  className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-gray-200 hover:border-blue-300 hover:-translate-y-1 group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-0 bg-blue-500 group-hover:h-1 transition-all duration-300"></div>
                  <div className="bg-blue-100 p-3 rounded-full w-max mb-4">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-blue-800 mb-2">Learner</h3>
                  <p className="text-gray-700 text-sm mb-4">
                    Start your personalized learning journey with our AI-powered platform.
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-600">Get Started</span>
                    <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
                      <ArrowLeft className="w-3.5 h-3.5 text-white rotate-180" />
                    </div>
                  </div>
                </div>
                
                {/* Company Card */}
                <div 
                  onClick={() => handlePortalSelection('company')}
                  className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-gray-200 hover:border-blue-300 hover:-translate-y-1 group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-0 bg-blue-500 group-hover:h-1 transition-all duration-300"></div>
                  <div className="bg-blue-100 p-3 rounded-full w-max mb-4">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-blue-800 mb-2">Company</h3>
                  <p className="text-gray-700 text-sm mb-4">
                    Access top talent and manage your organization's learning programs.
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-600">Company Portal</span>
                    <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
                      <ArrowLeft className="w-3.5 h-3.5 text-white rotate-180" />
                    </div>
                  </div>
                </div>
                
                {/* Recruiter Card */}
                <div 
                  onClick={() => handlePortalSelection('recruiter')}
                  className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-gray-200 hover:border-blue-300 hover:-translate-y-1 group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 right-0 h-0 bg-blue-500 group-hover:h-1 transition-all duration-300"></div>
                  <div className="bg-blue-100 p-3 rounded-full w-max mb-4">
                    <Search className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-blue-800 mb-2">Recruiter</h3>
                  <p className="text-gray-700 text-sm mb-4">
                    Find and connect with exceptional talent in our growing network.
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-600">Recruiter Portal</span>
                    <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
                      <ArrowLeft className="w-3.5 h-3.5 text-white rotate-180" />
                    </div>
                  </div>
                </div>
              </div>

              
              <footer className="bg-blue-900 text-white p-8 w-full mx-4 rounded-xl mt-8 shadow-md">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div>
                    <h3 className="text-xl font-bold mb-4">KG Learning Platform</h3>
                    <p className="text-blue-200">Empowering careers through skills-based learning and industry connections.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Quick Links</h4>
                    <ul className="space-y-2">
                      <li><a href="https://www.kimtronix.com/" className="text-blue-200 hover:text-white transition-colors">About Us</a></li>
                      <li><a href="#" className="text-blue-200 hover:text-white transition-colors">Courses</a></li>
                      <li>
  <a 
    href="#" 
    onClick={(e) => {
      e.preventDefault(); 
      handlePortalSelection('company');
    }}
    className="text-blue-200 hover:text-white transition-colors cursor-pointer"
  >
    For Companies
  </a>
</li>
                      <li><a href="#" onClick={(e) => {
      e.preventDefault(); 
      handlePortalSelection('recruiter');
    }} className="text-blue-200 hover:text-white transition-colors">For Recruiters</a></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Resources</h4>
                    <ul className="space-y-2">
                      <li><a href="#" className="text-blue-200 hover:text-white transition-colors">Blog</a></li>
                      <li><a href="#" className="text-blue-200 hover:text-white transition-colors">Webinars</a></li>
                      <li><a href="#" className="text-blue-200 hover:text-white transition-colors">Success Stories</a></li>
                      <li><a href="#" className="text-blue-200 hover:text-white transition-colors">FAQ</a></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Contact</h4>
                    <ul className="space-y-2">
                      <li className="flex items-center text-blue-200">
                        <Mail className="w-4 h-4 mr-2" />
                        <span>support@kimtronixglobal.com</span>
                      </li>
                      <li className="flex items-center text-blue-200">
                        <Phone className="w-4 h-4 mr-2" />
                        <span>+263 77 488 2645</span>
                      </li>
                      <li className="flex items-center text-blue-200">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span>53, Karigamombe Centre, 4th Floor</span>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="border-t border-blue-800 mt-8 pt-6 text-center text-blue-300">
                  <p>© {new Date().getFullYear()} KG Learning Platform. All rights reserved.</p>
                </div>
              </footer>
            </div>
          )}
        </main>
      </div>
    </ThemeProvider>
  );
};

export default Home;