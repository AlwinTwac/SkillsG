'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously, signOut, User as FirebaseAuthUser } from 'firebase/auth';
import { doc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, Building2, Search, ArrowLeft, Loader2, CheckCircle, Trophy, Newspaper, Mail, Phone, MapPin, ChevronRight } from 'lucide-react';
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

interface NewsItem {
  id: string;
  title?: string;
  content?: string;
  description?: string;
  createdAt?: any;
  companyName?: string;
  imageUrl?: string;
  type?: 'news' | 'event' | 'outstanding' | 'partnership';
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

const Home = () => {
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [flowState, setFlowState] = useState<FlowState>('roleSelection');
  const [initialRoleSelection, setInitialRoleSelection] = useState<InitialRole>('learner');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [partnerships, setPartnerships] = useState<NewsItem[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [cardsVisible, setCardsVisible] = useState(false);
  const [card1Flipped, setCard1Flipped] = useState(false);
  const [card2Flipped, setCard2Flipped] = useState(false);
  const [card3Flipped, setCard3Flipped] = useState(false);
  const [circlesVisible, setCirclesVisible] = useState(false);
  const [activeSpinCircle, setActiveSpinCircle] = useState<number>(-1);
  const [finalTransition, setFinalTransition] = useState(false);
  const [showQuotes, setShowQuotes] = useState(false);
  
  const carouselImages = [
    '/images/img0.jpg',
    '/images/img2.jpg',
    '/images/img3.jpg',
    '/images/img4.jpg',
    '/images/img5.jpg',
    '/images/img6.jpg',
    '/images/img9.jpg'
  ];

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
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const newsQuery = query(
      collection(db, 'news'),
      where('type', '==', 'partnership'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(newsQuery, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NewsItem));
      setPartnerships(items);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % carouselImages.length);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [carouselImages.length]);

  useEffect(() => {
    const handleScroll = () => {
      const bottomSection = document.getElementById('bottom-section');
      if (bottomSection) {
        const rect = bottomSection.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight * 0.8;
        
        if (isVisible && !cardsVisible) {
          setCardsVisible(true);
          setTimeout(() => setCard1Flipped(true), 300);
          setTimeout(() => setCard2Flipped(true), 600);
          setTimeout(() => setCard3Flipped(true), 900);
          setTimeout(() => {
            setCirclesVisible(true);
            // Start sequential coin-spin animation after circles appear
            setActiveSpinCircle(0);
          }, 1400);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [cardsVisible]);

  // Trigger final transition immediately after cards flip
  useEffect(() => {
    if (card3Flipped && !finalTransition) {
      const transitionTimer = setTimeout(() => {
        setFinalTransition(true);
        setTimeout(() => setShowQuotes(true), 400); // Show quotes faster
      }, 500); // Start transition sooner
      
      return () => clearTimeout(transitionTimer);
    }
  }, [card3Flipped, finalTransition]);

  useEffect(() => {
    let firestoreUnsub: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

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
              signOut(auth);
            }
            setLoading(false);
          },
          (err) => {
            console.error('Error listening to current user document:', err);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg relative overflow-hidden">
        <div className="gradient-mesh"></div>
        <div className="flex flex-col items-center gap-4 relative z-10">
          <Loader2 className="w-16 h-16 text-cyan-400 animate-spin" />
          <span className="text-xl font-semibold text-white">Loading your experience...</span>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen bg-dark-bg relative">
        <div className="gradient-mesh"></div>
        <header className={`sticky top-0 left-0 right-0 z-50 glass-card border-b border-white/10 relative overflow-hidden ${flowState === 'dashboard' ? 'hidden' : ''}`}>
          {/* Animated Tech Background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full">
              {/* Circuit board pattern */}
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="circuit" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                    <circle cx="10" cy="10" r="2" fill="#22d3ee" className="animate-pulse" />
                    <circle cx="90" cy="90" r="2" fill="#a855f7" className="animate-pulse" style={{animationDelay: '0.5s'}} />
                    <circle cx="50" cy="50" r="2" fill="#10b981" className="animate-pulse" style={{animationDelay: '1s'}} />
                    <line x1="10" y1="10" x2="50" y2="50" stroke="#22d3ee" strokeWidth="0.5" />
                    <line x1="50" y1="50" x2="90" y2="90" stroke="#a855f7" strokeWidth="0.5" />
                    <line x1="10" y1="90" x2="90" y2="10" stroke="#10b981" strokeWidth="0.5" opacity="0.3" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#circuit)" />
              </svg>
            </div>
            {/* Floating particles */}
            <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-cyan-400 rounded-full animate-ping" style={{animationDuration: '3s'}}></div>
            <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-purple-400 rounded-full animate-ping" style={{animationDuration: '4s', animationDelay: '1s'}}></div>
            <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-green-400 rounded-full animate-ping" style={{animationDuration: '5s', animationDelay: '2s'}}></div>
          </div>
          
          {/* Header Row with Logo, Ticker, and Icons */}
          <div className="w-full px-6 py-3 flex items-center gap-4 relative z-10">
            <div className="text-xl font-bold gradient-text tracking-wider flex-shrink-0">KG Learning</div>
            
            {/* Notification Ticker - Center */}
            <div className="flex-1 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-green-500/10 rounded-lg py-2 px-4 overflow-hidden">
              <div className="animate-marquee whitespace-nowrap">
                <span className="text-sm text-white/80">
                  {partnerships.length > 0 
                    ? partnerships.map((news, idx) => (
                        <span key={news.id}>
                          🔔 {news.title || news.content || 'New Update'}
                          {idx < partnerships.length - 1 && ' • '}
                        </span>
                      ))
                    : 'No new announcements today'
                  }
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Contact Icons with Hover */}
              <div className="hidden md:flex items-center gap-3">
                <div className="group relative">
                  <Mail className="w-5 h-5 text-white/70 hover:text-white cursor-pointer transition-colors" />
                  <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    support@kimtronixglobal.com
                  </div>
                </div>
                <div className="group relative">
                  <Phone className="w-5 h-5 text-white/70 hover:text-white cursor-pointer transition-colors" />
                  <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    +263 77 488 2645
                  </div>
                </div>
                <div className="group relative">
                  <MapPin className="w-5 h-5 text-white/70 hover:text-white cursor-pointer transition-colors" />
                  <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    53, Karigamombe Centre, 4th Floor
                  </div>
                </div>
              </div>
              <ThemeSwitcher />
            </div>
          </div>
        </header>

        <main className="pt-0 w-full relative z-10">
          {flowState === 'dashboard' && user && userProfile ? (
            <>
              {userProfile.role === 'student' && <StudentDashboard userDisplayName={userProfile.name || user.displayName || ''} userEmail={user.email || ''} userUid={user.uid} />}
              {userProfile.role === 'company' && <CompanyDashboard userDisplayName={userProfile.displayName || null} userEmail={user.email || ''} userUid={user.uid} />}
              {userProfile.role === 'recruiter' && <RecruiterDashboard userDisplayName={userProfile.name || user.displayName || ''} userEmail={user.email || ''} />}
            </>
          ) : flowState === 'interviewing' && user ? (
            <AIInterviewer user={user} onInterviewComplete={handleInterviewComplete} onGoBack={handleReturnHome} />
          ) : flowState === 'interviewComplete' ? (
            <div className="max-w-md mx-auto my-12 p-8 glass-card rounded-xl shadow-lg border border-white/20">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-cyber-blue mx-auto mb-4"/>
                <h2 className="text-3xl font-bold gradient-text mb-4">Interview Complete!</h2>
                <p className="text-white/80 mb-6">
                  Your report has been submitted for review. If your application is approved, you'll receive an email to set your password.
                </p>
                <button 
                  onClick={handleReturnHome} 
                  className="w-full px-6 py-3 bg-gradient-cyber text-white rounded-lg font-medium hover:scale-105 transition-all shadow-md"
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
            <div className="max-w-md mx-auto my-12 p-8 glass-card rounded-xl shadow-lg border border-white/20">
              <button 
                onClick={() => setFlowState('roleSelection')} 
                className="flex items-center text-sm text-cyber-blue hover:text-white mb-6"
              >
                <ArrowLeft className="w-4 h-4 mr-1"/> Back
              </button>
              <div className="text-center">
                <h2 className="text-3xl font-bold gradient-text mb-6">Welcome, Learner!</h2>
                <div className="space-y-4">
                  <button 
                    onClick={handleNewStudentStart} 
                    className="w-full px-6 py-3 bg-gradient-cyber text-white rounded-lg font-medium hover:scale-105 transition-all shadow-md"
                  >
                    New Student (Start AI Interview)
                  </button>
                  <button 
                    onClick={() => { setInitialRoleSelection('learner'); setFlowState('auth'); }} 
                    className="w-full px-6 py-3 glass-card text-white rounded-lg font-medium hover:bg-white/10 transition-all shadow-sm"
                  >
                    Existing Account (Login)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full min-h-screen p-4 md:p-6">
              {/* Top Section - Hero + Success Stories + Latest Updates */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 max-w-[1800px] mx-auto">
                {/* Left: Hero Section with Background Image */}
                <div className="lg:col-span-2 relative h-[500px] md:h-[600px] rounded-2xl overflow-hidden shadow-2xl">
                  <img 
                    src="/images/img1.jpg" 
                    alt="Hero background"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/20"></div>
                  
                  <div className="relative z-10 h-full flex flex-col justify-start p-6 md:p-10">
                    <div>
                      <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-3 leading-tight">
                        Achieve Your<br />Career Goals
                      </h1>
                      <p className="text-base md:text-lg text-white/90 mb-6 max-w-lg">
                        Get the skills you need to succeed in today's job market
                      </p>
                      <button 
                        onClick={() => setFlowState('learnerChoice')}
                        className="px-8 py-3.5 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
                      >
                        Get Started
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column: Student Success Stories + Latest Updates */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                  {/* Student Success Stories */}
                  <div className="glass-card rounded-2xl border border-white/20 shadow-xl max-h-[350px] overflow-hidden">
                    <div className="sticky top-0 p-5 pb-3 z-10">
                      <h2 className="text-xl font-bold text-white">Student Success Stories</h2>
                    </div>
                    <div className="px-5 pb-5 max-h-[290px] overflow-y-auto">
                  <div className="space-y-4 mb-5">
                    {achievements.length > 0 ? (
                      achievements.slice(0, 5).map((achievement, index) => {
                        const colors = [
                          'from-blue-500 to-cyan-500',
                          'from-purple-500 to-pink-500',
                          'from-green-500 to-emerald-500',
                          'from-orange-500 to-red-500',
                          'from-indigo-500 to-blue-500'
                        ];
                        const bgColor = colors[index % colors.length];
                        const initials = achievement.studentName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
                        
                        return (
                          <div key={achievement.id} className="glass-card rounded-xl p-4 hover:bg-white/5 transition-all cursor-pointer border border-white/10 group hover:border-green-400/50 hover:shadow-lg">
                            <div className="flex items-start gap-3 mb-3">
                              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${bgColor} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                                <span className="text-white font-bold text-sm">{initials}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-white truncate">{achievement.studentName.split(' ')[0]}'s achievement</p>
                                <p className="text-xs text-white/60 truncate">{achievement.studentName}</p>
                              </div>
                            </div>
                            <p className="text-xs text-white/70 mb-2 line-clamp-2">{achievement.description}</p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-white/50">{new Date(achievement.createdAt).toLocaleDateString()}</p>
                              <Trophy className="w-4 h-4 text-green-400" />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-10">
                        <Trophy className="w-12 h-12 text-white/30 mx-auto mb-3" />
                        <p className="text-sm text-white/50">No success stories yet</p>
                      </div>
                    )}
                    </div>
                  </div>
                  </div>
                  
                  {/* Latest Updates */}
                  <div className="glass-card rounded-2xl p-5 border border-white/20 shadow-xl max-h-[230px] overflow-y-auto">
                    <h2 className="text-lg font-bold text-white mb-4">Latest Updates</h2>
                    <div className="space-y-3">
                      {partnerships.length > 0 ? (
                        partnerships.slice(0, 3).map((news) => (
                          <div key={news.id} className="glass-card rounded-lg p-3 hover:bg-white/5 transition-all cursor-pointer border border-white/10 group hover:border-green-400/50">
                            <div className="flex items-start gap-2 mb-2">
                              <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-1.5 rounded-lg flex-shrink-0">
                                <Newspaper className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-xs font-bold text-white truncate">{news.title || 'Update'}</h3>
                                <p className="text-xs text-white/60">{news.createdAt ? new Date(news.createdAt.toDate()).toLocaleDateString() : 'Recent'}</p>
                              </div>
                            </div>
                            {news.content && (
                              <p className="text-xs text-white/70 line-clamp-2">{news.content}</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6">
                          <Newspaper className="w-10 h-10 text-white/30 mx-auto mb-2" />
                          <p className="text-xs text-white/50">No news updates yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section - Start Your Journey with Quarter Circle Design */}
              <div id="bottom-section" className="max-w-[1800px] mx-auto mb-6">
                <div className="glass-card rounded-2xl border border-white/20 shadow-xl relative overflow-hidden">
                  {/* Floating animated elements for visual interest */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
                    <div className="absolute top-10 left-10 w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full blur-xl animate-pulse" style={{animationDuration: '3s'}}></div>
                    <div className="absolute top-1/3 right-20 w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full blur-xl animate-pulse" style={{animationDuration: '4s', animationDelay: '1s'}}></div>
                    <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full blur-xl animate-pulse" style={{animationDuration: '5s', animationDelay: '2s'}}></div>
                  </div>
                  
                  <div className="flex flex-col md:flex-row min-h-[450px]">
                    {/* Left Side - Content */}
                    <div className="w-full md:w-1/2 p-6 md:p-8 relative z-10">
                      <div className="mb-6">
                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Start Your Journey Today</h2>
                        <p className="text-sm md:text-base text-white/70">Join thousands of learners who have transformed their careers through our AI-powered platform connections.</p>
                      </div>
                      
                      <div className="space-y-3">
                      {/* Row 1: Learner Card with circles on right */}
                      <div className="relative flex items-center justify-between gap-6 group/row">
                        <div className={`glass-card rounded-lg p-3 border border-white/20 hover:border-green-500/50 transition-all group w-80`}
                          style={{
                            transform: card1Flipped ? 'rotateY(0deg)' : 'rotateY(90deg)',
                            transition: 'transform 0.6s, margin 0.8s ease-in-out',
                            transformStyle: 'preserve-3d'
                          }}>
                          <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-2 rounded-lg w-max mx-auto mb-2 group-hover:scale-110 transition-all shadow-lg">
                            <User className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="text-base font-bold text-white mb-1 text-center">Learner</h3>
                          <p className="text-xs text-white/70 mb-3 text-center">
                            Start your personalized learning journey with our AI-powered platform.
                          </p>
                          <div className="flex justify-center">
                            <button 
                              onClick={() => setFlowState('learnerChoice')}
                              className="px-4 py-2 text-sm bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                              Get Started
                            </button>
                          </div>
                        </div>

                        {/* Quote between panel and profile */}
                        {showQuotes && (
                          <div className="flex-1 px-4 animate-fade-in">
                            <p className="text-sm italic text-white/80">
                              "Learning is the key to unlocking your potential and achieving your dreams."
                            </p>
                          </div>
                        )}

                        {/* Single profile circle after final transition */}
                        {finalTransition && (
                          <div className="w-28 h-28 glass-card rounded-full border-2 border-green-400/40 flex items-center justify-center flex-shrink-0 overflow-hidden animate-fade-in">
                            <img src="/images/learner.png" alt="Learner Profile" className="w-full h-full object-cover rounded-full" />
                          </div>
                        )}
                      </div>

                      {/* Row 2: Company Card with circles on both sides */}
                      <div className="relative flex items-center justify-between gap-6 group/row">
                        <div className={`glass-card rounded-lg p-3 border border-white/20 hover:border-cyan-500/50 transition-all group w-80`}
                          style={{
                            transform: card2Flipped ? 'rotateY(0deg)' : 'rotateY(90deg)',
                            transition: 'transform 0.6s, margin 0.8s ease-in-out',
                            transformStyle: 'preserve-3d'
                          }}>
                          <div className="bg-gradient-to-br from-cyan-500 to-blue-500 p-2 rounded-lg w-max mx-auto mb-2 group-hover:scale-110 transition-all shadow-lg">
                            <Building2 className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="text-base font-bold text-white mb-1 text-center">Company</h3>
                          <p className="text-xs text-white/70 mb-3 text-center">
                            Access top talent and manage your organization's learning programs.
                          </p>
                          <div className="flex justify-center">
                            <button 
                              onClick={() => handlePortalSelection('company')}
                              className="px-4 py-2 text-sm bg-cyan-500 text-white font-semibold rounded-lg hover:bg-cyan-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                              Get Started
                            </button>
                          </div>
                        </div>

                        {/* Quote between panel and profile */}
                        {showQuotes && (
                          <div className="flex-1 px-4 animate-fade-in">
                            <p className="text-sm italic text-white/80">
                              "Empowering organizations to build skilled teams and drive innovation forward."
                            </p>
                          </div>
                        )}

                        {/* Single profile circle after final transition */}
                        {finalTransition && (
                          <div className="w-28 h-28 glass-card rounded-full border-2 border-cyan-400/40 flex items-center justify-center flex-shrink-0 overflow-hidden animate-fade-in">
                            <img src="/images/img2.jpg" alt="Company Profile" className="w-full h-full object-cover rounded-full" />
                          </div>
                        )}
                      </div>

                      {/* Row 3: Recruiter Card with circles on left */}
                      <div className="relative flex items-center justify-between gap-6 group/row">
                        <div className={`glass-card rounded-lg p-3 border border-white/20 hover:border-purple-500/50 transition-all group w-80`}
                          style={{
                            transform: card3Flipped ? 'rotateY(0deg)' : 'rotateY(90deg)',
                            transition: 'transform 0.6s, margin 0.8s ease-in-out',
                            transformStyle: 'preserve-3d'
                          }}>
                          <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-lg w-max mx-auto mb-2 group-hover:scale-110 transition-all shadow-lg">
                            <Search className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="text-base font-bold text-white mb-1 text-center">Recruiter</h3>
                          <p className="text-xs text-white/70 mb-3 text-center">
                            Find and connect with talent in our growing network.
                          </p>
                          <div className="flex justify-center">
                            <button 
                              onClick={() => handlePortalSelection('recruiter')}
                              className="px-4 py-2 text-sm bg-purple-500 text-white font-semibold rounded-lg hover:bg-purple-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                              Recruiter Portal
                            </button>
                          </div>
                        </div>

                        {/* Quote between panel and profile */}
                        {showQuotes && (
                          <div className="flex-1 px-4 animate-fade-in">
                            <p className="text-sm italic text-white/80">
                              "Connecting exceptional talent with opportunities that transform careers."
                            </p>
                          </div>
                        )}

                        {/* Single profile circle after final transition */}
                        {finalTransition && (
                          <div className="w-28 h-28 glass-card rounded-full border-2 border-purple-400/40 flex items-center justify-center flex-shrink-0 overflow-hidden animate-fade-in">
                            <img src="/images/recruiter.png" alt="Recruiter Profile" className="w-full h-full object-cover rounded-full" />
                          </div>
                        )}
                      </div>
                    </div>

                      {/* Footer Links */}
                      <div className="pt-6 border-t border-white/10">
                        <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-xs text-white/70 mb-3">
                          <a href="https://www.kimtronix.com/" className="hover:text-white transition-colors">About Us</a>
                          <a href="#" className="hover:text-white transition-colors">Courses</a>
                          <a href="#" onClick={(e) => { e.preventDefault(); handlePortalSelection('company'); }} className="hover:text-white transition-colors cursor-pointer">For Companies</a>
                          <a href="#" onClick={(e) => { e.preventDefault(); handlePortalSelection('recruiter'); }} className="hover:text-white transition-colors cursor-pointer">For Recruiters</a>
                          <a href="#" className="hover:text-white transition-colors">Resources</a>
                        </div>
                        <p className="text-center text-xs text-white/50">© {new Date().getFullYear()} KG Learning Platform. All rights reserved.</p>
                      </div>
                    </div>
                    
                    {/* Right Side - Image Carousel with Curved Edge */}
                    <div className="hidden md:block w-1/2 relative">
                      <div className="absolute inset-0 rounded-bl-[200px] overflow-hidden">
                        {carouselImages.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Carousel ${idx + 1}`}
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                              idx === currentImageIndex ? 'opacity-100' : 'opacity-0'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </ThemeProvider>
  );
};

export default Home;
