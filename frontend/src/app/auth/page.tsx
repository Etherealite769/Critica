'use client';

import { useState } from 'react';
import SignUpForm from '@/components/auth/SignUpForm';
import SignInForm from '@/components/auth/SignInForm';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<'signup' | 'signin'>('signup');

  return (
    <main className="min-h-screen bg-gray-400 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Tab Buttons */}
        <div className="flex gap-4 mb-8 justify-center">
          <button
            onClick={() => setActiveTab('signup')}
            className={`px-8 py-3 font-mono font-bold transition-colors ${
              activeTab === 'signup'
                ? 'bg-gray-300 text-gray-900 border-2 border-gray-900'
                : 'bg-gray-300 text-gray-900 border-2 border-gray-400 hover:bg-gray-200'
            }`}
          >
            Sign Up
          </button>
          <button
            onClick={() => setActiveTab('signin')}
            className={`px-8 py-3 font-mono font-bold transition-colors ${
              activeTab === 'signin'
                ? 'bg-gray-300 text-gray-900 border-2 border-gray-900'
                : 'bg-gray-300 text-gray-900 border-2 border-gray-400 hover:bg-gray-200'
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Form Container */}
        <div className="bg-gray-300 rounded-2xl p-8 border-4 border-gray-400">
          {activeTab === 'signup' ? <SignUpForm /> : <SignInForm />}
        </div>
      </div>
    </main>
  );
}
