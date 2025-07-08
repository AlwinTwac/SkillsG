'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, User, Bot } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore'; // Import Firestore functions
import { auth, db } from '@/lib/firebase'; // Import Firebase auth and db
import { User as FirebaseAuthUser } from 'firebase/auth'; // Firebase User type

interface Message {
  id: string;
  content: string;
  isAI: boolean;
  timestamp: Date;
}

interface StudentData {
  name: string;
  email: string;
  experience: string;
  skills: string[];
  interests: string[];
  goals: string;
  uid?: string; // Add uid for Firestore document reference
}

interface InterviewReport {
  studentInfo: StudentData;
  enrollmentDate: string;
  assessmentLevel: string;
  recommendedPath: string;
  reportId: string;
  // rawGeminiReport?: string; // Optional: to store raw AI output if you integrate a powerful LLM
}

interface AIInterviewerProps {
  user: FirebaseAuthUser; // Pass the current authenticated user
  onInterviewComplete: () => void; // Callback to notify parent
}

export default function AIInterviewer({ user, onInterviewComplete }: AIInterviewerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [studentData, setStudentData] = useState<StudentData>({
    name: user.displayName || '', // Pre-fill name if available from Google auth
    email: user.email || '',     // Pre-fill email
    experience: '',
    skills: [],
    interests: [],
    goals: '',
    uid: user.uid // Set user ID
  });
  const [interviewFinished, setInterviewFinished] = useState(false);


  const questions = [
    "Hello! I'm your AI interviewer. Let's start by getting to know you. What's your full name?",
    "Great! What's your current experience level in tech/learning? (e.g., Beginner, Intermediate, Advanced, or describe your background)",
    "What technical skills do you currently have? (Separate multiple skills with commas)",
    "What areas or topics are you most interested in learning about through this platform?",
    "What are your career goals or what do you hope to achieve through this platform?"
  ];

  // Modified useEffect to use the pre-filled email from Firebase auth
  useEffect(() => {
    // Start with the first question
    const firstMessage: Message = {
      id: '1',
      content: questions[0],
      isAI: true,
      timestamp: new Date()
    };
    setMessages([firstMessage]);

    // If user's email is already known (e.g., from Google Sign-in), update studentData immediately
    if (user.email) {
      setStudentData(prev => ({ ...prev, email: user.email! }));
      // If email is pre-filled, we might skip the email question or handle it differently
      // For now, let's keep the questions as is, assuming the user will confirm/re-enter.
    }
  }, [user]); // Depend on user to run once user is set


  const handleSendMessage = async () => {
    if (!currentInput.trim() || isLoading || interviewFinished) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: currentInput,
      isAI: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Process the answer and update student data
    updateStudentData(currentInput, currentQuestion);

    // If this was the last question, finalize the interview
    if (currentQuestion >= questions.length - 1) {
      setInterviewFinished(true); // Mark interview as finished
      setTimeout(async () => {
        const finalMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "Perfect! I've gathered all the information I need. Let me create your enrollment report and finalize your account profile. This will take just a moment...",
          isAI: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, finalMessage]);
        
        // Generate and save enrollment report
        await generateAndSaveEnrollmentReport();
        setIsLoading(false);
        onInterviewComplete(); // Notify parent component
      }, 1000);
    } else {
      // Move to next question
      setTimeout(() => {
        const nextQuestion = currentQuestion + 1;
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: questions[nextQuestion],
          isAI: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
        setCurrentQuestion(nextQuestion);
        setIsLoading(false);
      }, 1000);
    }

    setCurrentInput('');
  };

  const updateStudentData = (answer: string, questionIndex: number) => {
    setStudentData(prev => {
      const newData = { ...prev };
      switch (questionIndex) {
        case 0: // Name
          newData.name = answer;
          break;
        case 1: // Experience
          newData.experience = answer;
          break;
        case 2: // Skills
          newData.skills = answer.split(',').map(skill => skill.trim()).filter(s => s);
          break;
        case 3: // Interests
          newData.interests = answer.split(',').map(interest => interest.trim()).filter(i => i);
          break;
        case 4: // Goals
          newData.goals = answer;
          break;
      }
      return newData;
    });
  };

  const generateAndSaveEnrollmentReport = async () => {
    // Use the latest studentData from state
    const currentStudentData = { ...studentData, email: user.email || studentData.email };

    const report: InterviewReport = {
      studentInfo: currentStudentData,
      enrollmentDate: new Date().toISOString(),
      assessmentLevel: determineLevel(currentStudentData),
      recommendedPath: generateRecommendedPath(currentStudentData),
      reportId: `ENR-${user.uid.substring(0, 8)}-${Date.now()}`
    };

    // --- Placeholder for actual Gemini API call for a more sophisticated report ---
    // You would typically send `currentStudentData` to your backend API route,
    // which then calls the Gemini API, processes its response, and returns a richer report.
    /*
    try {
      const response = await fetch('/api/gemini-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentData: currentStudentData })
      });
      const geminiReport = await response.json();
      report.rawGeminiReport = geminiReport.fullText; // Store raw AI output if desired
      // You could refine assessmentLevel and recommendedPath based on Gemini's output here
    } catch (apiError) {
      console.error("Error calling Gemini API:", apiError);
    }
    */
    // --- End Placeholder ---

    try {
      if (user && user.uid) {
        // Save the report to the user's Firestore document
        await setDoc(doc(db, 'users', user.uid), {
          ...currentStudentData, // Update general student data
          interviewReport: report, // Store the detailed report
          profileCompleted: true, // Mark profile as completed
          lastUpdated: new Date().toISOString()
        }, { merge: true }); // Use merge: true to avoid overwriting other user data

        const reportMessage: Message = {
          id: (Date.now() + 2).toString(),
          content: `✅ Account profile updated and report generated!\n\n📋 Enrollment Report Summary:\n• Student: ${currentStudentData.name || 'N/A'}\n• Level: ${report.assessmentLevel}\n• Recommended Path: ${report.recommendedPath}\n• Report ID: ${report.reportId}\n\nYou can now view your full report!`,
          isAI: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, reportMessage]);

      } else {
        console.error("User not authenticated, cannot save report.");
        setMessages(prev => [...prev, { id: (Date.now() + 2).toString(), content: "Error: User not logged in, unable to save report. Please try logging in again.", isAI: true, timestamp: new Date() }]);
      }
    } catch (firestoreError) {
      console.error("Error saving enrollment report to Firestore:", firestoreError);
      setMessages(prev => [...prev, { id: (Date.now() + 2).toString(), content: "Error: Could not save report. Please try again later.", isAI: true, timestamp: new Date() }]);
    }
  };

  const determineLevel = (data: StudentData) => {
    const exp = data.experience.toLowerCase();
    const skillsCount = data.skills.length;

    if (exp.includes('advanced') || exp.includes('expert') || exp.includes('senior') || skillsCount >= 5) return 'Advanced';
    if (exp.includes('intermediate') || exp.includes('some') || exp.includes('moderate') || skillsCount >= 2) return 'Intermediate';
    return 'Beginner'; // default
  };

  const generateRecommendedPath = (data: StudentData) => {
    const interests = data.interests.join(', ').toLowerCase();
    if (interests.includes('web') || interests.includes('frontend') || interests.includes('backend') || interests.includes('full stack')) return 'Web Development Track';
    if (interests.includes('data') || interests.includes('analytics') || interests.includes('machine learning')) return 'Data Science & AI Track';
    if (interests.includes('mobile') || interests.includes('android') || interests.includes('ios')) return 'Mobile App Development Track';
    if (interests.includes('cybersecurity') || interests.includes('security')) return 'Cybersecurity Foundations';
    if (interests.includes('cloud') || interests.includes('aws') || interests.includes('azure') || interests.includes('gcp')) return 'Cloud Computing Track';
    return 'General IT Fundamentals'; // default
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center mb-6">
        <MessageCircle className="w-6 h-6 text-blue-600 mr-2" />
        <h2 className="text-2xl font-bold text-gray-800">AI Interview Process</h2>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-4 h-96 overflow-y-auto flex flex-col-reverse" id="chat-messages">
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                <Bot className="w-4 h-4 text-blue-600" />
              </div>
              <div className="bg-blue-100 px-4 py-2 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        {messages.slice().reverse().map((message) => ( // Reverse to show latest at bottom
          <div key={message.id} className={`mb-4 flex ${message.isAI ? 'justify-start' : 'justify-end'}`}>
            <div className={`flex items-start max-w-xs lg:max-w-md ${message.isAI ? 'flex-row' : 'flex-row-reverse'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${message.isAI ? 'bg-blue-100 mr-2' : 'bg-green-100 ml-2'}`}>
                {message.isAI ? <Bot className="w-4 h-4 text-blue-600" /> : <User className="w-4 h-4 text-green-600" />}
              </div>
              <div className={`px-4 py-2 rounded-lg ${message.isAI ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                <p className="text-sm whitespace-pre-line">{message.content}</p>
                <p className="text-xs mt-1 opacity-60">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder={interviewFinished ? "Interview complete" : "Type your answer here..."}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading || interviewFinished}
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading || !currentInput.trim() || interviewFinished}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {!interviewFinished && (
        <div className="mt-4 text-sm text-gray-600">
          Progress: {Math.min(currentQuestion + 1, questions.length)} / {questions.length} questions
        </div>
      )}
    </div>
  );
}