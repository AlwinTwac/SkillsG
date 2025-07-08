'use client';

import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, User as FirebaseAuthUser } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';

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

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!isLogin && password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        const roleToSet = defaultRole === 'learner' ? 'student' : defaultRole;
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: userCredential.user.email,
          createdAt: new Date().toISOString(),
          authProvider: 'email',
          profileCompleted: false,
          role: roleToSet,
          ...(roleToSet === 'student' && {
            profileVisibility: 'private',
            paidForPublic: false,
          })
        });
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
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDocSnap = await getDoc(userDocRef);

      const roleToSet = defaultRole === 'learner' ? 'student' : defaultRole;

      await setDoc(userDocRef, {
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        photoURL: userCredential.user.photoURL,
        createdAt: userDocSnap.exists() ? userDocSnap.data().createdAt : new Date().toISOString(),
        authProvider: 'google',
        profileCompleted: userDocSnap.exists() ? userDocSnap.data().profileCompleted : false,
        role: userDocSnap.exists() ? userDocSnap.data().role : roleToSet,
        ...(roleToSet === 'student' && !userDocSnap.exists() && {
            profileVisibility: 'private',
            paidForPublic: false,
        })
      }, { merge: true });

      onAuthSuccess(userCredential.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get role-specific colors and icons
  const getRoleTheme = () => {
    switch(defaultRole) {
      case 'learner':
        return {
          bgGradient: 'from-blue-500 to-indigo-600',
          textColor: 'text-blue-600',
          borderColor: 'border-blue-400',
          buttonColor: 'bg-blue-600 hover:bg-blue-700',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600'
        };
      case 'company':
        return {
          bgGradient: 'from-green-500 to-teal-600',
          textColor: 'text-green-600',
          borderColor: 'border-green-400',
          buttonColor: 'bg-green-600 hover:bg-green-700',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600'
        };
      case 'recruiter':
        return {
          bgGradient: 'from-purple-500 to-violet-600',
          textColor: 'text-purple-600',
          borderColor: 'border-purple-400',
          buttonColor: 'bg-purple-600 hover:bg-purple-700',
          iconBg: 'bg-purple-100',
          iconColor: 'text-purple-600'
        };
      default:
        return {
          bgGradient: 'from-gray-500 to-gray-600',
          textColor: 'text-gray-600',
          borderColor: 'border-gray-400',
          buttonColor: 'bg-gray-600 hover:bg-gray-700',
          iconBg: 'bg-gray-100',
          iconColor: 'text-gray-600'
        };
    }
  };

  const theme = getRoleTheme();

  return (
    <div className={`max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-500 ${loading ? 'opacity-80' : 'opacity-100'}`}>
      {/* Header with gradient */}
      <div className={`bg-gradient-to-r ${theme.bgGradient} p-6 text-center`}>
        <div className={`w-20 h-20 ${theme.iconBg} rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg`}>
          <User className={`w-10 h-10 ${theme.iconColor}`} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {isLogin ? 'Welcome Back!' : 'Create Account'}
        </h2>
        <p className="text-white/90">
          {isLogin 
            ? `Sign in as a ${defaultRole} to continue` 
            : `Create your ${defaultRole} account`
          }
        </p>
      </div>

      <div className="p-8">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-6 animate-shake">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-5">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 border ${theme.borderColor} rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:${theme.textColor} transition-all duration-300`}
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-10 pr-12 py-3 border ${theme.borderColor} rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:${theme.textColor} transition-all duration-300`}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-300"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border ${theme.borderColor} rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:${theme.textColor} transition-all duration-300`}
                  placeholder="Confirm your password"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full ${theme.buttonColor} text-white py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-lg`}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Processing...
              </div>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="mt-5 w-full bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm hover:shadow-md"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className={`ml-1 ${theme.textColor} hover:underline font-medium transition-colors duration-300`}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}