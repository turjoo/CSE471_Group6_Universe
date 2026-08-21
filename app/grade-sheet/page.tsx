"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { getCGPAData, saveSemesterGrades } from '../actions/cgpa';

const gradeWeights: Record<string, number> = {
  'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'F': 0.0
};

interface CourseItem {
  id: string;
  code: string;
  title: string;
  section: string;
  credits: number;
  semesterNumber: number;
  grade?: string | null;
}

export default function GradeSheetPage() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string>("");

  const loadData = async () => {
    const res = await getCGPAData();
    if (res.success && res.courses) {
      setCourses(res.courses as CourseItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Group courses by semester
  const groupedSemesters = useMemo(() => {
    const semMap: { [sem: number]: CourseItem[] } = {};
    courses.forEach(c => {
      if (!semMap[c.semesterNumber]) semMap[c.semesterNumber] = [];
      semMap[c.semesterNumber].push(c);
    });
    return semMap;
  }, [courses]);

  // Overall Cumulative GPA Calculation across all graded courses
  const overallCgpa = useMemo(() => {
    let totalPoints = 0;
    let totalCredits = 0;
    courses.forEach(c => {
      if (c.grade && gradeWeights[c.grade] !== undefined) {
        totalPoints += c.credits * gradeWeights[c.grade];
        totalCredits += c.credits;
      }
    });
    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : "N/A";
  }, [courses]);

  const handleGradeChange = (courseId: string, grade: string) => {
    setCourses(courses.map(c => c.id === courseId ? { ...c, grade } : c));
  };

  const handleSaveChanges = async () => {
    setSaveStatus("Saving grades...");
    const gradesToSave = courses.map(c => ({ id: c.id, grade: c.grade || 'A' }));
    const res = await saveSemesterGrades(gradesToSave);
    setSaveStatus(res.message);
    loadData();
    setTimeout(() => setSaveStatus(""), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center font-sans">
        <p className="text-gray-500 font-bold text-sm">Loading Grade Sheet...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 font-sans text-gray-900">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0f172a] tracking-tight">Official Student Grade Sheet</h1>
            <p className="text-gray-500 text-sm font-medium mt-1">Semester-wise academic transcript & persistent grade records.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSaveChanges}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition"
            >
              Save Grade Sheet
            </button>
            <Link href="/dashboard" className="bg-indigo-50 text-indigo-600 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-indigo-100 transition">
              ← Dashboard
            </Link>
          </div>
        </div>

        {saveStatus && (
          <p className="text-xs font-bold text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center">
            {saveStatus}
          </p>
        )}

        {/* CGPA Banner */}
        <div className="bg-[#0f172a] text-white rounded-3xl p-6 lg:p-8 flex justify-between items-center shadow-lg">
          <div>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Cumulative Standing</span>
            <h2 className="text-xl font-black mt-1">Calculated CGPA Across All Semesters</h2>
          </div>
          <div className="bg-white/10 border border-white/20 rounded-2xl px-6 py-3 text-center">
            <span className="text-3xl font-black text-indigo-400">{overallCgpa}</span>
          </div>
        </div>

        {/* Semester-wise Transcripts */}
        {Object.keys(groupedSemesters).length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100">
            <p className="text-sm font-semibold text-gray-400">No courses in grade sheet yet.</p>
            <p className="text-xs text-gray-300 mt-1">Enroll courses in the Attendance Tracker to build your grade sheet.</p>
          </div>
        ) : (
          Object.keys(groupedSemesters).sort().map((sem) => {
            const semNum = Number(sem);
            const semCourses = groupedSemesters[semNum];

            // Semester GPA calculation
            let semPoints = 0;
            let semCredits = 0;
            semCourses.forEach(c => {
              if (c.grade && gradeWeights[c.grade] !== undefined) {
                semPoints += c.credits * gradeWeights[c.grade];
                semCredits += c.credits;
              }
            });
            const semGpa = semCredits > 0 ? (semPoints / semCredits).toFixed(2) : "N/A";

            return (
              <div key={semNum} className="bg-white rounded-3xl p-6 lg:p-8 border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                  <h3 className="font-extrabold text-gray-900 text-lg">Semester {semNum}</h3>
                  <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl">
                    Semester GPA: {semGpa} ({semCredits} Credits)
                  </span>
                </div>

                <div className="grid grid-cols-12 text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2">
                  <div className="col-span-3">Code</div>
                  <div className="col-span-5">Title</div>
                  <div className="col-span-2 text-center">Credits</div>
                  <div className="col-span-2 text-center">Grade</div>
                </div>

                <div className="space-y-2">
                  {semCourses.map((course) => (
                    <div key={course.id} className="grid grid-cols-12 items-center p-3 rounded-2xl bg-gray-50/60 text-xs font-semibold">
                      <div className="col-span-3 font-black text-gray-900">{course.code}</div>
                      <div className="col-span-5 text-gray-600 line-clamp-1">{course.title}</div>
                      <div className="col-span-2 text-center font-bold text-gray-500">{course.credits}</div>
                      <div className="col-span-2 text-center">
                        <select
                          value={course.grade || ''}
                          onChange={(e) => handleGradeChange(course.id, e.target.value)}
                          className="bg-white border border-gray-200 text-gray-800 py-1 px-2.5 rounded-xl font-bold text-xs outline-none focus:border-indigo-500 shadow-sm"
                        >
                          <option value="">Ungraded</option>
                          {Object.keys(gradeWeights).map(g => (
                            <option key={g} value={g}>{g} ({gradeWeights[g].toFixed(1)})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}

      </div>
    </div>
  );
}