'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInAnonymously, signOut, User as FirebaseAuthUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, Building2, Briefcase, ArrowLeft, Loader2, CheckCircle,Star, Rocket, School, Search, Newspaper, Megaphone, ChevronLeft, ChevronRight } from 'lucide-react';
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
const testimonials = [
  {
    id: 1,
    name: "Alexio Chisenga",
    role: "Frontend Developer",
    avatar: "/images/img3.jpg",
    quote: "The platform's AI interview prep helped me land 3 job offers!",
    rating: 5
  },
  {
    id: 2,
    name: "Sam MUdzoma",
    role: "UX Designer",
    avatar: "/images/img5.jpg",
    quote: "I doubled my salary after completing the design courses.",
    rating: 4
  },
  {
    id: 3,
    name: "Tatenda Ndlovhu",
    role: "Data Scientist",
    avatar: "/images/img9.jpg",
    quote: "Best investment I made in my tech career.",
    rating: 5
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

export default function Home() {
  const [user, setUser] = useState<FirebaseAuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [flowState, setFlowState] = useState<FlowState>('roleSelection');
  const [initialRoleSelection, setInitialRoleSelection] = useState<InitialRole>('learner');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
  if (flowState === 'roleSelection') {
    const carouselInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(carouselInterval);
  }
}, [flowState]);

useEffect(() => {
  const testimonialInterval = setInterval(() => {
    setCurrentTestimonial(prev => (prev + 1) % testimonials.length);
  }, 8000);
  return () => clearInterval(testimonialInterval);
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

  let contentToRender;

  switch (flowState) {
    case 'dashboard':
      if (user && userProfile) {
        switch (userProfile.role) {
          case 'student': 
            contentToRender = <StudentDashboard userDisplayName={userProfile.name || user.displayName || ''} userEmail={user.email || ''} userUid={user.uid} />; 
            break;
          case 'company': 
            contentToRender = <CompanyDashboard userDisplayName={userProfile.displayName || null} userEmail={user.email || ''} userUid={user.uid} />; 
            break;
          case 'recruiter': 
            contentToRender = <RecruiterDashboard userDisplayName={userProfile.name || user.displayName || ''} userEmail={user.email || ''} />; 
            break;
        }
      }
      break;

    case 'interviewing':
      if (user) {
        contentToRender = <AIInterviewer user={user} onInterviewComplete={handleInterviewComplete} onGoBack={handleReturnHome} />;
      }
      break;

    case 'interviewComplete':
      contentToRender = (
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
      );
      break;

    case 'auth':
      contentToRender = (
        <AuthComponent 
          onAuthSuccess={handleAuthSuccess} 
          defaultRole={initialRoleSelection} 
          onBack={handleReturnHome}
        />
      );
      break;

    case 'learnerChoice':
      contentToRender = (
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
      );
      break;
      
   default: 
  contentToRender = (
    <div className="max-w-6xl mx-auto px-4 py-12 relative">
      <div className="fixed top-4 right-4 z-50">
        <ThemeSwitcher />
      </div>

      
      <div className="flex flex-col lg:flex-row gap-8 mb-16">
        
        <div className="lg:w-2/3">
          <div className="relative h-96 w-full rounded-2xl overflow-hidden shadow-lg">
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
        </div>

        
        <div className="lg:w-1/3">
          <div className="relative h-96 rounded-2xl overflow-hidden shadow-lg bg-blue-400 backdrop-blur-sm p-6 border border-blue-200">
            <h3 className="text-2xl font-bold text-blue-800 mb-6 flex items-center">
              <Megaphone className="w-6 h-6 mr-2 text-blue-600" />
              Student Success Stories
            </h3>
            
            <div className="relative h-full">
              {testimonials.map((testimonial, index) => (
                <div 
                  key={testimonial.id}
                  className={`absolute inset-0 p-4 transition-opacity duration-500 ${
                    index === currentTestimonial ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden mr-4 border-2 border-blue-300">
                      <img 
                        src={testimonial.avatar} 
                        alt={testimonial.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-blue-900">{testimonial.name}</h4>
                      <p className="text-sm text-blue-700">{testimonial.role}</p>
                    </div>
                  </div>
                  <p className="text-blue-800 italic mb-2">"{testimonial.quote}"</p>
                  <div className="flex mt-4 space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${
                          i < testimonial.rating ? 'text-amber-400 fill-amber-400' : 'text-blue-200'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1">
                    {testimonials.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentTestimonial(i)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          i === currentTestimonial ? 'bg-blue-600 w-4' : 'bg-blue-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Rest of your content */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center bg-blue-100 text-blue-800 px-6 py-2 rounded-full mb-4 shadow-sm">
          <Rocket className="w-5 h-5 mr-2" />
          <span className="font-medium">KG LEARNING PLATFORM</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-blue-800 mb-4">
          Discover Your <span className="text-blue-600">Perfect</span> Path
        </h1>
        <p className="text-xl text-blue-700 max-w-2xl mx-auto">
          Join our platform today to become an ISD.
        </p>
      </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div 
              onClick={() => setFlowState('learnerChoice')}
              className="bg-blue-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-blue-100 hover:border-blue-300 hover:-translate-y-1"
            >
              <div className="bg-blue-100 p-4 rounded-full w-max mb-6">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-blue-800 mb-3">Learner</h3>
              <p className="text-blue-900 mb-6">
                Start your personalized learning journey with our AI-powered platform.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-600">Get Started</span>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 text-white rotate-180" />
                </div>
              </div>
            </div>
            
            <div 
              onClick={() => handlePortalSelection('company')}
              className="bg-blue-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-blue-100 hover:border-blue-300 hover:-translate-y-1"
            >
              <div className="bg-blue-100 p-4 rounded-full w-max mb-6">
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-blue-800 mb-3">Company</h3>
              <p className="text-blue-900 mb-6">
                Access top talent and manage your organization's learning programs.
              </p>
              <div className="flex justify-between items-center">
                <span className="text-blue text-blue-600">Company Portal</span>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <ArrowLeft className="w-4 h-4 text-white rotate-180" />
                </div>
              </div>
            </div>
            
            <div 
              onClick={() => handlePortalSelection('recruiter')}
              className="bg-blue-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-blue-100 hover:border-blue-300 hover:-translate-y-1"
            >
              <div className="bg-blue-100 p-4 rounded-full w-max mb-6">
                <Search className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-blue-800 mb-3">Recruiter</h3>
              <p className="text-blue-900 mb-6">
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
          
          {/* News & Announcements Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-100">
              <div className="flex items-center mb-6">
                <Newspaper className="w-6 h-6 text-blue-600 mr-2" />
                <h3 className="text-2xl font-bold text-blue-800">Company News</h3>
              </div>
              <div className="space-y-4">
                {companyNews.map(news => (
                  <div 
                    key={news.id} 
                    className="p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start">
                      <div className="mr-3 mt-0.5">
                        {news.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-blue-800 group-hover:text-blue-700">{news.title}</h4>
                        <p className="text-sm text-black">{news.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-100">
              <div className="flex items-center mb-6">
                <Megaphone className="w-6 h-6 text-blue-600 mr-2" />
                <h3 className="text-2xl font-bold text-blue-800">Student Announcements</h3>
              </div>
              <div className="space-y-4">
                {studentAnnouncements.map(announcement => (
                  <div 
                    key={announcement.id} 
                    className="p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer group"
                  >
                    <div className="flex items-start">
                      <div className="mr-3 mt-0.5">
                        {announcement.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-blue-800 group-hover:text-blue-700">{announcement.title}</h4>
                        <p className="text-sm text-black">{announcement.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="min-h-[200px] flex items-center justify-center bg-blue-100 rounded-2xl p-8">
            <p className="text-lg text-blue-800">Join thousands of learners and organizations transforming their futures</p>
          </div>
        </div>
      );
  }

return (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    {/* Background Layers */}
    <div className="fixed inset-0 -z-50">
      {/* Base Background Image */}
      <div 
        className="absolute inset-0 bg-[url('/images/img6.jpg')] bg-cover bg-center"
      ></div>
      
     
      <div className="absolute inset-0 bg-white/20 backdrop-blur-md"></div>
    </div>

  
    <div className="min-h-screen">
      <div className="mx-auto max-w-7xl min-h-screen flex flex-col">
        <div className="flex-1 bg-white/90 backdrop-blur-sm lg:mx-2 lg:my-2 lg:rounded-2xl shadow-xl">
          {contentToRender}
        </div>
      </div>
    </div>
  </ThemeProvider>
)};