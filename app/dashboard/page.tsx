"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getDashboardData, logoutUser } from '@/app/actions/dashboard';

interface UserProfile {
  name: string;
  email: string;
  department: string;
  semester: number;
  currentCgpa: number;
}

interface CourseItem {
  id: string;
  code: string;
  title: string;
  section: string;
  attendedClasses: number;
  totalClasses: number;
}

interface AcademicGoalItem {
  targetCgpa: number;
  requiredGpa: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [goal, setGoal] = useState<AcademicGoalItem | null>(null);
  const [currentBudget, setCurrentBudget] = useState(0);
  const [currentSpent, setCurrentSpent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const res = await getDashboardData();
      if (res.success && res.user) {
        setUser(res.user);
        setCourses(res.courses);
        setGoal(res.latestGoal);
        setCurrentBudget(res.currentBudget || 0);
        setCurrentSpent(res.currentSpent || 0);
      } else {
        router.push('/login');
      }
      setLoading(false);
    }
    loadData();
  }, [router]);

  const handleLogout = async () => {
    await logoutUser();
    router.push('/login');
  };

  // Calculate overall attendance rate
  const totalClasses = courses.reduce((acc, c) => acc + c.totalClasses, 0);
  const totalAttended = courses.reduce((acc, c) => acc + c.attendedClasses, 0);
  const overallAttendancePct = totalClasses > 0 ? ((totalAttended / totalClasses) * 100).toFixed(1) : "100.0";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center font-sans">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-indigo-600 animate-ping"></div>
          <p className="text-gray-500 font-bold text-sm">Loading UniVerse Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 font-sans text-gray-900 flex flex-col justify-between">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        
        {/* Navigation Bar */}
        <header className="flex justify-between items-center pb-6 border-b border-gray-200/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0f172a] rounded-xl flex items-center justify-center text-white font-bold shadow-md">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-black text-[#0f172a] tracking-tight">UniVerse</span>
              <span className="text-xs text-gray-400 font-semibold block -mt-1">Student Portal</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition"
          >
            Sign Out
          </button>
        </header>

        {/* Student Profile Card */}
        <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-[#0f172a] text-white rounded-2xl flex items-center justify-center text-2xl font-extrabold shadow-md">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold text-gray-900">{user?.name}</h1>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-100">
                  Active Student
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-400 mt-1">{user?.email}</p>
              <div className="flex gap-2 mt-3">
                <span className="bg-indigo-50 text-indigo-700 text-[11px] font-bold px-3 py-1 rounded-lg">
                  {user?.department}
                </span>
                <span className="bg-gray-100 text-gray-700 text-[11px] font-bold px-3 py-1 rounded-lg">
                  Semester {user?.semester}
                </span>
              </div>
            </div>
          </div>

          {/* Key Metrics Widgets */}
          <div className="flex flex-wrap sm:flex-nowrap gap-4 w-full md:w-auto">
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex-1 md:w-36 text-center">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Current CGPA</p>
              <p className="text-2xl font-black text-indigo-600 mt-1">{user?.currentCgpa.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex-1 md:w-36 text-center">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Active Courses</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{courses.length}</p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex-1 md:w-36 text-center">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Attendance</p>
              <p className={`text-2xl font-black mt-1 ${Number(overallAttendancePct) >= 80 ? 'text-emerald-600' : 'text-amber-500'}`}>
                {overallAttendancePct}%
              </p>
            </div>
          </div>
        </div>

        {/* Core Navigation Modules Grid */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Core Academic Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Feature Card: AI Study Assistant */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold mb-6 group-hover:bg-emerald-600 group-hover:text-white transition font-sans text-xl">
                  🤖
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">AI Study Assistant</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">
                  Powered by Gemini. Ask academic questions, summarize long notes, and generate interactive flashcards instantly.
                </p>
              </div>

              <Link
                href="/study-assistant"
                className="w-full bg-[#0f172a] hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-md mt-auto"
              >
                Open Study Assistant
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>

            
            {/* Feature Card 1: CGPA Calculator */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold mb-6 group-hover:bg-indigo-600 group-hover:text-white transition">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">CGPA Calculator & Forecast System</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">
                  Reverse-engineer your required target grades. Simulate upcoming semesters and calculate the exact minimum GPA needed to hit your target CGPA.
                </p>

                {goal && (
                  <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 mb-6 text-xs font-semibold text-indigo-900 flex justify-between items-center">
                    <span>Active Target: <strong>{goal.targetCgpa.toFixed(2)} CGPA</strong></span>
                    <span className="bg-indigo-600 text-white px-2 py-0.5 rounded font-bold">
                      Req. GPA: {goal.requiredGpa.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <Link
                href="/cgpa-forecast"
                className="w-full bg-[#0f172a] hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-md"
              >
                Launch CGPA Calculator
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>

            {/* Feature Card 2: Attendance Tracker */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold mb-6 group-hover:bg-emerald-600 group-hover:text-white transition">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Attendance Tracker & Course Log</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">
                  Input enrolled courses, log class attendance in real-time, monitor thresholds, and ensure you never miss credit requirements.
                </p>

                <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 mb-6 text-xs font-semibold text-emerald-900 flex justify-between items-center">
                  <span>Enrolled Courses: <strong>{courses.length} Active</strong></span>
                  <span className="text-emerald-700 font-bold">
                    {totalAttended} / {totalClasses} Classes Attended
                  </span>
                </div>
              </div>

              <Link
                href="/attendance"
                className="w-full bg-[#0f172a] hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-md"
              >
                Launch Attendance Tracker
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>

            {/* Feature Card 3: Smart Budget & Expense Tracker */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-bold mb-6 group-hover:bg-amber-600 group-hover:text-white transition font-sans text-xl">
                  💰
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Smart Budget & Expense Tracker</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">
                  Track daily expenses against a personalized monthly budget. Leverage AI to analyze spending habits, offer savings tips, and forecast budget shortages.
                </p>

                <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4 mb-6 text-xs font-semibold text-amber-900 flex justify-between items-center">
                  <span>Month Budget: <strong>Tk {currentBudget.toFixed(2)}</strong></span>
                  <span className="text-amber-700 font-bold">
                    Spent: Tk {currentSpent.toFixed(2)}
                  </span>
                </div>
              </div>

              <Link
                href="/budget"
                className="w-full bg-[#0f172a] hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-md"
              >
                Launch Budget Tracker
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>

            {/* Feature Card 4: Assignment & Quiz Scheduler */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-bold mb-6 group-hover:bg-blue-600 group-hover:text-white transition font-sans text-xl">
                  📅
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Assignment & Quiz Scheduler</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">
                  A dedicated deadline tracker. Input upcoming assignments and quizzes, get live countdowns, and stay organized based on urgency levels.
                </p>
              </div>

              <Link
                href="/scheduler"
                className="w-full bg-[#0f172a] hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-md mt-auto"
              >
                Open Scheduler
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>

            {/* Feature Card 5: ScholarPing */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center font-bold mb-6 group-hover:bg-purple-600 group-hover:text-white transition font-sans text-xl">
                  🎓
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">ScholarPing</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">
                  A smart notification hub that automatically matches you with internal scholarships and waivers based on your CGPA and Major.
                </p>
              </div>

              <Link
                href="/scholarping"
                className="w-full bg-[#0f172a] hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-md mt-auto"
              >
                Open ScholarPing
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>

          </div>
        </div>

        {/* Peer-to-Peer & Campus Life Grid */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Peer-to-Peer & Campus Life</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Feature Card: Campus Carpool Hub */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center font-bold mb-6 group-hover:bg-orange-600 group-hover:text-white transition font-sans text-xl">
                  🚗
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Campus Carpool Hub</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">
                  Find students heading your way. Post a trip, request to join, and split the fare in real-time via live chat. Save money on every commute.
                </p>
              </div>

              <Link
                href="/carpool"
                className="w-full bg-[#0f172a] hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-md"
              >
                Open Carpool Hub
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>

            {/* Feature Card: P2P Resource Exchange */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold mb-6 group-hover:bg-indigo-600 group-hover:text-white transition font-sans text-xl">
                  📚
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">P2P Resource Exchange</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">
                  Buy, sell, rent, or donate used textbooks, PDFs, slides, and class notes directly with other students on campus.
                </p>
              </div>

              <Link
                href="/resources"
                className="w-full bg-[#0f172a] hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-md"
              >
                Open Resources Exchange
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>

            {/* Feature Card: Campus Lost & Found */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center font-bold mb-6 group-hover:bg-rose-600 group-hover:text-white transition font-sans text-xl">
                  🔍
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Campus Lost & Found</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6">
                  Lost a wallet or found keys? Report details, search items category-wise, check locations, and help reunite owners with their belongings.
                </p>
              </div>

              <Link
                href="/lost-found"
                className="w-full bg-[#0f172a] hover:bg-gray-800 text-white font-bold py-3.5 px-6 rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-md"
              >
                Open Lost & Found Portal
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>

          </div>
        </div>

        {/* Active Enrolled Courses Overview */}
        <div className="bg-white rounded-3xl p-6 lg:p-8 border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Enrolled Courses Summary</h3>
              <p className="text-xs text-gray-400 mt-0.5">Quick view of your current semester schedule.</p>
            </div>
            <Link href="/attendance" className="text-xs font-bold text-indigo-600 hover:underline">
              Manage Courses & Attendance →
            </Link>
          </div>

          {courses.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl">
              <p className="text-sm font-semibold text-gray-400">No active courses added yet.</p>
              <p className="text-xs text-gray-300 mt-1">Visit the Attendance Tracker to enroll your semester courses.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <div key={course.id} className="p-4 border border-gray-100 rounded-2xl bg-gray-50/50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-black text-gray-900 text-sm">{course.code}</span>
                    <span className="text-[10px] bg-gray-200 text-gray-700 font-bold px-2 py-0.5 rounded">
                      Sec {course.section}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium line-clamp-1 mb-3">{course.title}</p>
                  <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl text-center">
                    {course.attendedClasses} / {course.totalClasses} Classes Attended
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <footer className="max-w-7xl mx-auto w-full pt-8 mt-8 border-t border-gray-200/60 text-center text-xs font-semibold text-gray-400">
        © {new Date().getFullYear()} UniVerse Academic Portal. All rights reserved.
      </footer>
    </div>
  );
}