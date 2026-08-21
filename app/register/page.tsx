"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerUser } from '@/app/actions/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: 'Computer Science and Engineering',
    semester: 5,
    currentCgpa: 3.50,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.email.endsWith('.edu') && !formData.email.includes('bracu.ac.bd')) {
      setError('Please use a valid institutional university email address (e.g., @bracu.ac.bd).');
      setLoading(false);
      return;
    }

    const res = await registerUser(formData);
    setLoading(false);

    if (res.success) {
      router.push('/login');
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
          Create your UniVerse Account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500 font-medium">
          The Ultimate All-in-One Campus SuperApp[cite: 1]
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <div className="bg-white py-8 px-6 shadow-[0_2px_15px_-3px_rgba(6,81,237,0.1)] border border-gray-100 rounded-3xl sm:px-10">
          <form className="space-y-5" onSubmit={handleRegister}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-xs font-bold text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Full Name</label>
              <input type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="Shah Mohaimin Kabir" className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900 font-medium" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Institutional Email Address</label>
              <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="student@bracu.ac.bd" className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900 font-medium" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Department</label>
                <select name="department" value={formData.department} onChange={handleChange} className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900 font-medium">
                  <option value="Computer Science and Engineering">Computer Science and Engineering</option>
                  <option value="Electrical and Electronic Engineering">Electrical and Electronic Engineering</option>
                  <option value="BBA">BBA</option>
                  <option value="Economics">Economics</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Current Semester</label>
                <input type="number" name="semester" min="1" max="12" required value={formData.semester} onChange={handleChange} className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900 font-medium" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Current CGPA</label>
              <input type="number" step="0.01" min="0" max="4.00" name="currentCgpa" required value={formData.currentCgpa} onChange={handleChange} className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900 font-medium" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Password</label>
              <input type="password" name="password" required value={formData.password} onChange={handleChange} placeholder="••••••••" className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900 font-medium" />
            </div>

            <div>
              <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#0f172a] hover:bg-gray-800 transition disabled:opacity-50">
                {loading ? "Registering..." : "Register Account"}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-6 text-center">
            <p className="text-xs text-gray-500">
              Already have an account? <a href="/login" className="font-bold text-indigo-600 hover:text-indigo-500">Sign in here</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}