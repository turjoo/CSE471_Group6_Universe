"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAttendanceData, addCourse, logAttendance } from '../actions/attendance';

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT';
}

interface CourseItem {
  id: string;
  code: string;
  title: string;
  section: string;
  credits: number;
  semesterNumber: number;
  classDays: string;
  startTime: string;
  endTime: string;
  attendedClasses: number;
  missedClasses: number;
  totalClasses: number;
  attendanceLogs: AttendanceRecord[];
}

export default function AttendancePage() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [userSemester, setUserSemester] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  // New Course Form State with Routine Fields
  const [newCourse, setNewCourse] = useState({
    code: '',
    title: '',
    section: '01',
    credits: 3.0,
    semesterNumber: 1,
    classDays: 'SUN, TUE',
    startTime: '09:30 AM',
    endTime: '10:45 AM'
  });
  const [submitting, setSubmitting] = useState(false);

  const [selectedDates, setSelectedDates] = useState<{ [key: string]: string }>({});
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  const loadData = async () => {
    const res = await getAttendanceData();
    if (res.success && res.courses) {
      setCourses(res.courses as unknown as CourseItem[]);
      if (res.user) {
        setUserSemester(res.user.semester);
        setNewCourse(prev => ({ ...prev, semesterNumber: res.user?.semester || 1 }));
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourse.code || !newCourse.title) return;
    setSubmitting(true);

    const res = await addCourse(newCourse);
    setSubmitting(false);

    if (res.success) {
      setNewCourse({
        code: '',
        title: '',
        section: '01',
        credits: 3.0,
        semesterNumber: userSemester,
        classDays: 'SUN, TUE',
        startTime: '09:30 AM',
        endTime: '10:45 AM'
      });
      loadData();
    }
  };

  const handleMarkAttendance = async (courseId: string, status: 'PRESENT' | 'ABSENT') => {
    const logDate = selectedDates[courseId] || new Date().toISOString().split('T')[0];
    const res = await logAttendance({ courseId, status, date: logDate });
    if (res.success) {
      loadData();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center font-sans">
        <p className="text-gray-500 font-bold text-sm">Loading Attendance & Routine...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0f172a] tracking-tight">Attendance & Class Routine</h1>
            <p className="text-gray-500 text-sm font-medium mt-1">Set weekly class times, track daily attendance, and avoid credit drops.</p>
          </div>
          <Link href="/dashboard" className="bg-indigo-50 text-indigo-600 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-indigo-100 transition">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Add Course Form */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 h-fit space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Add Enrolled Course</h3>
              <p className="text-xs text-gray-400 mt-0.5">Input course info and weekly class routine.</p>
            </div>

            <form onSubmit={handleAddCourse} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Course Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSE471"
                  value={newCourse.code}
                  onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Systems Analysis"
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Section</label>
                  <input
                    type="text"
                    required
                    value={newCourse.section}
                    onChange={(e) => setNewCourse({ ...newCourse, section: e.target.value })}
                    className="w-full px-2.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Credits</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newCourse.credits}
                    onChange={(e) => setNewCourse({ ...newCourse, credits: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Semester</label>
                  <input
                    type="number"
                    required
                    value={newCourse.semesterNumber}
                    onChange={(e) => setNewCourse({ ...newCourse, semesterNumber: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Weekly Class Routine Inputs */}
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <label className="block text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Class Routine Schedule</label>
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Class Days</label>
                  <select
                    value={newCourse.classDays}
                    onChange={(e) => setNewCourse({ ...newCourse, classDays: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-indigo-500 bg-white"
                  >
                    <option value="SUN, TUE">Sunday & Tuesday (SUN, TUE)</option>
                    <option value="MON, WED">Monday & Wednesday (MON, WED)</option>
                    <option value="SAT, THU">Saturday & Thursday (SAT, THU)</option>
                    <option value="EVERYDAY">Daily Class</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Start Time</label>
                    <input
                      type="text"
                      placeholder="09:30 AM"
                      value={newCourse.startTime}
                      onChange={(e) => setNewCourse({ ...newCourse, startTime: e.target.value })}
                      className="w-full px-2.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">End Time</label>
                    <input
                      type="text"
                      placeholder="10:45 AM"
                      value={newCourse.endTime}
                      onChange={(e) => setNewCourse({ ...newCourse, endTime: e.target.value })}
                      className="w-full px-2.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#0f172a] text-white font-bold py-3 rounded-xl text-xs hover:bg-gray-800 transition disabled:opacity-50 mt-2"
              >
                {submitting ? "Enrolling..." : "+ Add Course & Schedule"}
              </button>
            </form>
          </div>

          {/* Enrolled Courses List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-bold text-gray-900 text-lg">Enrolled Routine ({courses.length})</h3>

            {courses.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100">
                <p className="text-sm font-semibold text-gray-400">No active schedule configured.</p>
              </div>
            ) : (
              courses.map((course) => {
                const currentDate = selectedDates[course.id] || new Date().toISOString().split('T')[0];
                const isWarning = course.missedClasses > 4;

                // Find if there is an active log for the selected date
                const activeLog = course.attendanceLogs.find(log => {
                  const logDateStr = new Date(log.date).toISOString().split('T')[0];
                  return logDateStr === currentDate;
                });
                const isPresentActive = activeLog?.status === 'PRESENT';
                const isAbsentActive = activeLog?.status === 'ABSENT';

                return (
                  <div key={course.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-gray-900 text-base">{course.code}</span>
                          <span className="text-[10px] bg-gray-100 text-gray-700 font-bold px-2.5 py-0.5 rounded-md">
                            Sec {course.section}
                          </span>
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md">
                            📅 {course.classDays} ({course.startTime} - {course.endTime})
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium mt-1">{course.title}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-center px-3 py-1.5 bg-emerald-50 rounded-xl border border-emerald-100">
                          <span className="block text-[10px] font-bold text-emerald-600 uppercase">Present</span>
                          <span className="text-sm font-black text-emerald-700">{course.attendedClasses}</span>
                        </div>
                        <div className={`text-center px-3 py-1.5 rounded-xl border ${isWarning ? 'bg-red-100 border-red-300' : 'bg-rose-50 border-rose-100'}`}>
                          <span className={`block text-[10px] font-bold uppercase ${isWarning ? 'text-red-700 font-black' : 'text-rose-600'}`}>Missed</span>
                          <span className={`text-sm font-black ${isWarning ? 'text-red-700' : 'text-rose-700'}`}>{course.missedClasses}</span>
                        </div>
                      </div>
                    </div>

                    {isWarning && (
                      <div className="bg-red-500 text-white p-3 rounded-2xl text-xs font-bold shadow-sm animate-pulse flex items-center gap-2">
                        <span>⚠️ ATTENDANCE WARNING: You missed {course.missedClasses} classes in {course.code} (&gt; 4 missed threshold).</span>
                      </div>
                    )}

                    <div className="bg-gray-50/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-gray-100">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <label className="text-xs font-bold text-gray-500 uppercase">Date:</label>
                        <input
                          type="date"
                          value={currentDate}
                          onChange={(e) => setSelectedDates({ ...selectedDates, [course.id]: e.target.value })}
                          className="bg-white border border-gray-200 text-gray-800 text-xs font-bold px-3 py-2 rounded-xl outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          onClick={() => handleMarkAttendance(course.id, 'PRESENT')}
                          className={`text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer ${
                            isPresentActive
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-300'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isPresentActive ? '✓ Present' : '+ Present'}
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(course.id, 'ABSENT')}
                          className={`text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer ${
                            isAbsentActive
                              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm ring-2 ring-rose-300'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isAbsentActive ? '✓ Absent' : '+ Absent'}
                        </button>
                        <button
                          onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
                          className="text-xs font-bold text-gray-500 bg-gray-200/60 px-3 py-2.5 rounded-xl transition cursor-pointer"
                        >
                          {expandedCourse === course.id ? "Hide Logs" : "Logs"}
                        </button>
                      </div>
                    </div>

                    {expandedCourse === course.id && (
                      <div className="border-t border-gray-100 pt-3 space-y-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Class Attendance History</p>
                        {course.attendanceLogs.length === 0 ? (
                          <p className="text-xs text-gray-400 font-medium">No logs recorded yet.</p>
                        ) : (
                          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                            {course.attendanceLogs.map((log) => (
                              <div key={log.id} className="flex justify-between text-xs p-2 rounded-xl bg-gray-50 font-medium">
                                <span>{new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${log.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                  {log.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>
    </div>
  );
}