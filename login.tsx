'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase'; // Assuming these imports
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, query, collection, where, getDocs } from 'firebase/firestore'; // Added query, collection, where, getDocs

// You'll need your UI components for input fields and buttons here
// For example, from Tailwind CSS or Shadcn UI

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();

  // Assuming you have a way to select the role during registration (e.g., a dropdown or separate forms)
  // For this example, let's assume a simple toggle or fixed role for demonstration.
  // In a real app, you'd have explicit UI for role selection during signup.
  const [selectedRole, setSelectedRole] = useState<'student' | 'company'>('student');

  const handleAuth = async (isSignUp: boolean) => {
    setError(null);
    setSuccessMessage(null);

    try {
      if (isSignUp) {
        // --- MODIFICATION START ---
        // The following block of code was preventing more than one company from registering.
        // I have commented it out to allow multiple company/admin accounts for collaboration.
        /*
        if (selectedRole === 'company') {
          const companiesQuery = query(collection(db, 'users'), where('role', '==', 'company'));
          const companySnapshot = await getDocs(companiesQuery);

          if (!companySnapshot.empty) {
            setError("A company account already exists. Only one company registration is allowed.");
            return;
          }
        }
        */
        // --- MODIFICATION END ---

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Determine the company UID for this single company instance
        // If this is the first company, its UID becomes the master company UID.
        // For students, this UID will be assigned to them.
        let companyUidToAssign = '';
        if (selectedRole === 'company') {
          // Now, each new company account will have its own unique UID.
          // Students will be associated with the first company that was created.
          companyUidToAssign = user.uid; 
        } else {
          // For students, you MUST fetch the existing company's UID
          const existingCompanyQuery = query(collection(db, 'users'), where('role', '==', 'company'));
          const existingCompanySnapshot = await getDocs(existingCompanyQuery);
          if (!existingCompanySnapshot.empty) {
            // Assuming there's only one company document, get its UID
            // NOTE: If you have multiple companies, you might need a different way
            // for students to select which company they belong to.
            // For now, it will assign them to the *first* company found.
            companyUidToAssign = existingCompanySnapshot.docs[0].id;
          } else {
            setError("No company registered yet. Students cannot register until a company is set up.");
            await user.delete(); // Clean up the newly created user if no company exists
            return;
          }
        }


        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          role: selectedRole,
          createdAt: new Date().toISOString(),
          profileCompleted: false, // Initial state for new users
          // Only add companyUid if it's a student, or if it's the company itself
          ...(selectedRole === 'student' && { companyUid: companyUidToAssign }),
          ...(selectedRole === 'company' && { companyUid: user.uid }), // A company's companyUid is its own UID
        });

        setSuccessMessage(`Successfully registered as ${selectedRole}! Please log in.`);
        setEmail('');
        setPassword('');
        setIsRegistering(false); // Switch back to login mode if desired
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        // Redirect based on role after successful login (handled elsewhere, e.g., in layout.tsx or a dedicated dashboard redirect)
        // The main page.tsx will handle the redirect after login.
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
      setError(err.message || "An error occurred during authentication.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isRegistering ? 'Register' : 'Login'}
        </h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
            {successMessage}
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="you@example.com"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="********"
          />
        </div>

        {isRegistering && (
          <div className="mb-6">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">Register as:</label>
            <select
              id="role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as 'student' | 'company')}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="student">Student</option>
              <option value="company">Company (Kimtronixs)</option>
            </select>
          </div>
        )}

        <button
          onClick={() => handleAuth(isRegistering)}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {isRegistering ? 'Register' : 'Login'}
        </button>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-blue-600 hover:underline"
          >
            {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
          </button>
        </div>
      </div>
    </div>
  );
}
