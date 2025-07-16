'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, User, Bot } from 'lucide-react';
import { doc, setDoc, getDoc, collection, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User as FirebaseAuthUser } from 'firebase/auth';
import axios from 'axios';

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
  uid?: string;
}

interface EnrollmentReport {
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
  experience?: string;
  skills?: string[];
  interests?: string[];
  goals?: string;
}

interface AIInterviewerProps {
  user: FirebaseAuthUser;
  onInterviewComplete: () => void;
}

export default function AIInterviewer({ user, onInterviewComplete }: AIInterviewerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [studentData, setStudentData] = useState<StudentData>({
    name: user.displayName || '',
    email: user.email || '',
    experience: '',
    skills: [],
    interests: [],
    goals: '',
    uid: user.uid
  });
  const [interviewFinished, setInterviewFinished] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const startInterview = async () => {
      setIsLoading(true);
      try {
        const response = await axios.post('/api/ai-interview', {
          conversationHistory: [],
          studentProfile: {
            uid: user.uid,
            name: user.displayName || '',
            email: user.email || '',
          },
          action: 'start_interview',
        });

        setMessages([{
          id: `ai-${Date.now()}`,
          content: response.data.aiResponse,
          isAI: true,
          timestamp: new Date()
        }]);
      } catch (error) {
        console.error("Error starting AI interview:", error);
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          content: "Oops! I couldn't start the interview. Please try refreshing the page.",
          isAI: true,
          timestamp: new Date()
        }]);
      } finally {
        setIsLoading(false);
      }
    };

    if (user.email && messages.length === 0) {
      startInterview();
    }
  }, [user, messages.length]);

  const handleSendMessage = async () => {
    if (!currentInput.trim() || isLoading || interviewFinished) return;

    const userMessage: Message = {
      id: `user-${Date.now()}-${Math.random()}`,
      content: currentInput.trim(),
      isAI: false,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setCurrentInput('');
    setIsLoading(true);

    const conversationHistory = newMessages.map(msg => ({
      role: msg.isAI ? 'assistant' : 'user',
      content: msg.content
    }));

    try {
      const response = await axios.post('/api/ai-interview', {
        conversationHistory,
        studentProfile: studentData,
        action: 'continue_interview',
      });

      const { aiResponse, interviewStatus, reportData } = response.data;
      const aiResponseMessage: Message = {
        id: `ai-${Date.now()}-${Math.random()}`,
        content: aiResponse,
        isAI: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponseMessage]);

      if (interviewStatus === 'completed' && reportData) {
        setInterviewFinished(true);
        await generateAndSaveEnrollmentReport(reportData);
        onInterviewComplete();
      }
    } catch (error) {
      console.error("Error communicating with AI interviewer:", error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}-${Math.random()}`,
        content: "I'm having trouble connecting right now. Please try again.",
        isAI: true,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAndSaveEnrollmentReport = async (reportData: Omit<EnrollmentReport, 'id' | 'companyUid'>) => {
    if (!user || !user.uid) return;

    let companyUid = '';
    try {
      const userDocSnap = await getDoc(doc(db, 'users', user.uid));
      if (userDocSnap.exists()) {
        companyUid = userDocSnap.data().companyUid || '';
      }
    } catch (fetchError) {
      console.error("Error fetching student's companyUid:", fetchError);
    }

    const enrollmentReportData: Omit<EnrollmentReport, 'id'> = {
      ...reportData,
      studentUid: user.uid,
      companyUid: companyUid,
      interviewDate: reportData.interviewDate || new Date().toISOString(),
      studentName: reportData.studentName || user.displayName || 'N/A',
      studentEmail: reportData.studentEmail || user.email || 'N/A',
    };

    try {
      const newReportRef = doc(collection(db, 'interviewReports'));
      await setDoc(newReportRef, enrollmentReportData);

      await updateDoc(doc(db, 'users', user.uid), {
        profileCompleted: true,
        lastUpdated: new Date().toISOString(),
        name: enrollmentReportData.studentName,
        experience: reportData.experience || '',
        skills: reportData.skills || [],
        interests: reportData.interests || [],
        goals: reportData.goals || '',
      });

    } catch (firestoreError) {
      console.error("Error saving enrollment report:", firestoreError);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center mb-6">
        <MessageCircle className="w-6 h-6 text-blue-600 mr-2" />
        <h2 className="text-2xl font-bold text-gray-800">AI Interview Process</h2>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-4 h-96 overflow-y-auto">
        <div className="flex flex-col space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex items-start max-w-lg ${message.isAI ? 'self-start' : 'self-end'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.isAI ? 'bg-blue-100 mr-2' : 'bg-green-100 ml-2 order-2'}`}>
                {message.isAI ? <Bot className="w-4 h-4 text-blue-600" /> : <User className="w-4 h-4 text-green-600" />}
              </div>
              <div className={`px-4 py-2 rounded-lg ${message.isAI ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800 order-1'}`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start max-w-lg self-start">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-100 mr-2">
                <Bot className="w-4 h-4 text-blue-600" />
              </div>
              <div className="px-4 py-2 rounded-lg bg-blue-100">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
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
        <button onClick={handleSendMessage} disabled={isLoading || !currentInput.trim() || interviewFinished} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}