'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, User, Bot, ArrowLeft } from 'lucide-react';
// Make sure to import 'addDoc' for creating documents with random IDs
import { collection, where, query, addDoc, QuerySnapshot, DocumentData, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User as FirebaseAuthUser } from 'firebase/auth';
import axios from 'axios';

// --- Interfaces ---
interface Message {
  id: string;
  content: string;
  isAI: boolean;
  timestamp: Date;
}

interface AIInterviewerProps {
  user: FirebaseAuthUser; // This will be the anonymous user
  onInterviewComplete: (reportData: any) => void;
    isAnonymous?: boolean;
   onGoBack: () => void;
}

// --- Component ---
export default function AIInterviewer({ user, onInterviewComplete, onGoBack }: AIInterviewerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [interviewFinished, setInterviewFinished] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const startInterview = async () => {
      if (messages.length > 0) return; // Prevents re-triggering
      setIsLoading(true);
      try {
        const response = await axios.post('/api/ai-interview', {
          conversationHistory: [],
          studentProfile: {
            uid: user.uid,
            name: user.displayName || 'New Applicant',
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

    if (user) {
      startInterview();
    }
  }, [user]);

  const saveReportAndComplete = async (reportData: any) => {
    if (!user || !user.uid) {
      console.error("User not authenticated, cannot save report.");
      return;
    }
    
    try {
      // 1. Find the company's UID
      const companyQuery = query(collection(db, 'users'), where('role', '==', 'company'));
      // --- FIX: Explicitly type the snapshot to match the error's expectation ---
      const companySnapshot: QuerySnapshot<DocumentData, DocumentData> = await getDocs(companyQuery);
      
      if (companySnapshot.empty) {
        throw new Error("No company account found to associate the report with.");
      }
      const companyUid = companySnapshot.docs[0].id;

      // 2. Create the pending report object with the companyUid
      const pendingReport = {
        ...reportData,
        studentUid: user.uid, // The anonymous user's ID
        companyUid: companyUid, // The company's ID
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      // 3. Save the document to the 'pendingInterviewReports' collection
      await addDoc(collection(db, 'pendingInterviewReports'), pendingReport);
      
      // 4. Only call onInterviewComplete AFTER the save is successful
      onInterviewComplete(reportData);

    } catch (error) {
      console.error("CRITICAL: Error saving pending report:", error);
      setMessages(prev => [...prev, {
        id: `save-error-${Date.now()}`,
        content: "I'm sorry, there was an error saving your report. Please try again later.",
        isAI: true,
        timestamp: new Date()
      }]);
    }
  };

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
        studentProfile: { uid: user.uid, name: 'New Applicant', email: '' },
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
        await saveReportAndComplete(reportData);
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

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <button 
        onClick={onGoBack}
        className="absolute top-4 left-4 flex items-center text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back
      </button>
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
        <button
          onClick={handleSendMessage}
          disabled={isLoading || !currentInput.trim() || interviewFinished}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

