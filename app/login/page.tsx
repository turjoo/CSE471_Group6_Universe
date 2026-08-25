"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from '@/app/actions/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await loginUser({ email, password });
    setLoading(false);

    if (res.success) {
      router.push('/dashboard');
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-[#1e293b] rounded-xl flex items-center justify-center text-white font-bold shadow-md">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"></path>
            </svg>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-[#0f172a] tracking-tight">
          Sign in to UniVerse
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500 font-medium">
          The Ultimate All-in-One Campus SuperApp[cite: 1]
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-[0_2px_15px_-3px_rgba(6,81,237,0.1)] border border-gray-100 rounded-3xl sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs font-bold text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Institutional Email Address</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@bracu.ac.bd" className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900 font-medium" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900 font-medium" />
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <input id="remember-me" type="checkbox" className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                <label htmlFor="remember-me" className="ml-2 block text-xs font-semibold text-gray-600">Remember me</label>
              </div>
              <div className="text-xs">
                <a href="#" onClick={() => alert("Password reset functionality can be linked to email verification.")} className="font-bold text-indigo-600 hover:text-indigo-500">
                  Forgot password?
                </a>
              </div>
            </div>

            <div>
              <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#0f172a] hover:bg-gray-800 transition disabled:opacity-50">
                {loading ? "Verifying..." : "Sign In"}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-6 text-center">
            <p className="text-xs text-gray-500">
              Don't have an account? <a href="/register" className="font-bold text-indigo-600 hover:text-indigo-500">Register here</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}