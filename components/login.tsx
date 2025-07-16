'use client';

import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, User as FirebaseAuthUser } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, Mail, Lock, Eye, EyeOff, Briefcase } from 'lucide-react';

interface AuthComponentProps {
  onAuthSuccess: (user: FirebaseAuthUser) => void;
  defaultRole: 'learner' | 'company' | 'recruiter';
}

export default function AuthComponent({ onAuthSuccess, defaultRole }: AuthComponentProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [companyAccountExists, setCompanyAccountExists] = useState(false);

  // Check if a company account already exists by looking for the singleton "lock" document
  useEffect(() => {
    const checkCompanyAccount = async () => {
      if (defaultRole === 'company') {
        setLoading(true);
        try {
          const configDocRef = doc(db, 'platformConfig', 'singleton');
          const configDocSnap = await getDoc(configDocRef);
          
          if (configDocSnap.exists()) {
            setCompanyAccountExists(true);
            setIsLogin(true); // Force login view if company account exists
          }
        } catch (err) {
          console.error('Error checking for singleton config:', err);
          // Set error state for user feedback if needed
        } finally {
          setLoading(false);
        }
      }
    };

    checkCompanyAccount();
  }, [defaultRole]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!isLogin && password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (!isLogin && defaultRole === 'company' && companyAccountExists) {
        throw new Error('Only one company account is allowed. Please login instead.');
      }

      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        const roleToSet = defaultRole === 'learner' ? 'student' : defaultRole;
        
        // Create the user document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: userCredential.user.email,
          createdAt: new Date().toISOString(),
          authProvider: 'email',
          profileCompleted: false,
          role: roleToSet,
          ...(roleToSet === 'student' && { profileVisibility: 'private', paidForPublic: false }),
          ...(roleToSet === 'company' && { companyName: 'kimtronix' })
        });
        
        // If a company account was created, create the singleton lock document
        if (roleToSet === 'company') {
          await setDoc(doc(db, 'platformConfig', 'singleton'), { 
            companyAccountCreated: true,
            companyName: 'kimtronix',
            createdAt: new Date().toISOString()
          });
          setCompanyAccountExists(true);
        }
      }
      onAuthSuccess(userCredential.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');
    try {
      if (!isLogin && defaultRole === 'company' && companyAccountExists) {
        throw new Error('Only one company account is allowed. Please login instead.');
      }
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDocSnap = await getDoc(userDocRef);

      // If user doesn't exist, create them
      if (!userDocSnap.exists()) {
        const roleToSet = defaultRole === 'learner' ? 'student' : defaultRole;
        await setDoc(userDocRef, {
          email: userCredential.user.email,
          displayName: userCredential.user.displayName,
          photoURL: userCredential.user.photoURL,
          createdAt: new Date().toISOString(),
          authProvider: 'google',
          profileCompleted: false,
          role: roleToSet,
          ...(roleToSet === 'student' && { profileVisibility: 'private', paidForPublic: false }),
          ...(roleToSet === 'company' && { companyName: 'kimtronix' })
        }, { merge: true });

        // If a company account was created, create the singleton lock document
        if (roleToSet === 'company') {
            await setDoc(doc(db, 'platformConfig', 'singleton'), { 
                companyAccountCreated: true,
                companyName: 'kimtronix',
                createdAt: new Date().toISOString()
            });
            setCompanyAccountExists(true);
        }
      }
      onAuthSuccess(userCredential.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const getRoleTheme = () => {
    switch(defaultRole) {
      case 'learner': return { bgGradient: 'from-blue-500 to-indigo-600', textColor: 'text-blue-600', borderColor: 'focus:ring-blue-500', buttonColor: 'bg-blue-600 hover:bg-blue-700', Icon: User };
      case 'company': return { bgGradient: 'from-green-500 to-teal-600', textColor: 'text-green-600', borderColor: 'focus:ring-green-500', buttonColor: 'bg-green-600 hover:bg-green-700', Icon: Briefcase };
      case 'recruiter': return { bgGradient: 'from-purple-500 to-violet-600', textColor: 'text-purple-600', borderColor: 'focus:ring-purple-500', buttonColor: 'bg-purple-600 hover:bg-purple-700', Icon: User };
      default: return { bgGradient: 'from-gray-500 to-gray-600', textColor: 'text-gray-600', borderColor: 'focus:ring-gray-500', buttonColor: 'bg-gray-600 hover:bg-gray-700', Icon: User };
    }
  };

  const theme = getRoleTheme();

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className={`bg-gradient-to-r ${theme.bgGradient} p-6 text-center`}>
        <h2 className="text-2xl font-bold text-white mb-2">
          {isLogin ? 'Welcome Back!' : 'Create Account'}
        </h2>
        <p className="text-white/90">
          {isLogin ? `Sign in as a ${defaultRole}` : `Create your ${defaultRole} account`}
        </p>
      </div>

      <div className="p-8">
        {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-lg">{error}</div>}

        <form onSubmit={handleEmailAuth} className="space-y-5">
          <div className="relative">
            <Mail className="h-5 w-5 text-gray-400 absolute top-3.5 left-4" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${theme.borderColor}`} placeholder="Enter your email" required />
          </div>

          <div className="relative">
            <Lock className="h-5 w-5 text-gray-400 absolute top-3.5 left-4" />
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className={`w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${theme.borderColor}`} placeholder="Enter your password" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {!isLogin && (
            <div className="relative">
              <Lock className="h-5 w-5 text-gray-400 absolute top-3.5 left-4" />
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${theme.borderColor}`} placeholder="Confirm your password" required />
            </div>
          )}

          <button type="submit" disabled={loading || (defaultRole === 'company' && companyAccountExists && !isLogin)} className={`w-full ${theme.buttonColor} text-white py-3 rounded-lg font-semibold transition-all duration-300 disabled:opacity-70 flex items-center justify-center`}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div><div className="relative flex justify-center text-sm"><span className="px-3 bg-white text-gray-500">Or</span></div></div>
          <button onClick={handleGoogleAuth} disabled={loading || (defaultRole === 'company' && companyAccountExists && !isLogin)} className="mt-5 w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-all duration-300 disabled:opacity-50 flex items-center justify-center shadow-sm">
            <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48"><path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.91l7.97-6.22z"></path><path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
            Continue with Google
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            {(!companyAccountExists || defaultRole !== 'company') && (
              <button onClick={() => setIsLogin(!isLogin)} className={`ml-1 ${theme.textColor} hover:underline font-medium`}>
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}