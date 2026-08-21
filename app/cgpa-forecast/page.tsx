"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { getCGPAData, saveSemesterGrades, saveAcademicGoal } from '../actions/cgpa';

const gradeWeights: Record<string, number> = {
  'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'F': 0.0
};

interface CourseItem {
  id: string;
  code: string;
  title: string;
  credits: number;
  semesterNumber: number;
  grade?: string | null;
}

export default function CGPACalculator() {
  const [semesterNumber, setSemesterNumber] = useState<number>(1);
  const [targetCgpa, setTargetCgpa] = useState<number>(3.65);
  const [currentCgpa, setCurrentCgpa] = useState<number>(3.50);
  const [creditsEarned, setCreditsEarned] = useState<number>(90.0);
  
  const [dbCourses, setDbCourses] = useState<CourseItem[]>([]);
  const [simCourses, setSimCourses] = useState<{ id: string; name: string; credits: number; grade: string }[]>([]);
  
  // Retake Simulator State
  const [selectedRetakeId, setSelectedRetakeId] = useState<string>('');
  const [newRetakeGrade, setNewRetakeGrade] = useState<string>('A');

  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string>("");

  const loadData = async () => {
    const res = await getCGPAData();
    if (res.success && res.courses) {
      setDbCourses(res.courses as CourseItem[]);
      if (res.user) {
        setCurrentCgpa(res.user.currentCgpa);
        setSemesterNumber(res.user.semester);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeSemesterCourses = useMemo(() => {
    return dbCourses.filter(c => c.semesterNumber === semesterNumber);
  }, [dbCourses, semesterNumber]);

  useEffect(() => {
    if (activeSemesterCourses.length > 0) {
      setSimCourses(activeSemesterCourses.map(c => ({
        id: c.id,
        name: `${c.code} - ${c.title}`,
        credits: c.credits,
        grade: c.grade || 'A'
      })));
    } else {
      setSimCourses([
        { id: '1', name: 'Sample Course 1', credits: 3.0, grade: 'A' },
        { id: '2', name: 'Sample Course 2', credits: 3.0, grade: 'A-' }
      ]);
    }
  }, [activeSemesterCourses, semesterNumber]);

  // Calculations for regular semester simulation
  const simData = useMemo(() => {
    const simCredits = simCourses.reduce((acc, curr) => acc + curr.credits, 0);
    const simPoints = simCourses.reduce((acc, curr) => acc + (curr.credits * gradeWeights[curr.grade]), 0);
    const simulatedGpa = simCredits > 0 ? simPoints / simCredits : 0;
    
    const totalCurrentPoints = currentCgpa * creditsEarned;
    const projectedCgpa = (creditsEarned + simCredits) > 0 
      ? (totalCurrentPoints + simPoints) / (creditsEarned + simCredits) 
      : currentCgpa;

    const requiredTotalPoints = targetCgpa * (creditsEarned + simCredits);
    const requiredSimPoints = requiredTotalPoints - totalCurrentPoints;
    const requiredGpa = simCredits > 0 ? requiredSimPoints / simCredits : 0;
    const isPossible = requiredGpa <= 4.0;

    return { simCredits, simulatedGpa, projectedCgpa, requiredGpa, isPossible };
  }, [simCourses, currentCgpa, creditsEarned, targetCgpa]);

  // INNOVATION 1: Retake Impact Calculation
  const retakeCalculation = useMemo(() => {
    if (!selectedRetakeId) return null;
    const targetCourse = dbCourses.find(c => c.id === selectedRetakeId);
    if (!targetCourse || !targetCourse.grade) return null;

    const oldGradePoints = gradeWeights[targetCourse.grade] * targetCourse.credits;
    const newGradePoints = gradeWeights[newRetakeGrade] * targetCourse.credits;
    const netPointsGain = newGradePoints - oldGradePoints;

    const totalCurrentPoints = currentCgpa * creditsEarned;
    const newCgpa = creditsEarned > 0 ? (totalCurrentPoints + netPointsGain) / creditsEarned : currentCgpa;

    return {
      courseName: `${targetCourse.code} (${targetCourse.grade})`,
      netPointsGain,
      newCgpa: newCgpa.toFixed(2),
      gainDiff: (newCgpa - currentCgpa).toFixed(2)
    };
  }, [selectedRetakeId, newRetakeGrade, dbCourses, currentCgpa, creditsEarned]);

  const handleUpdateGrade = (id: string, grade: string) => {
    setSimCourses(simCourses.map(c => c.id === id ? { ...c, grade } : c));
  };

  const handleApplyPlanner = async () => {
    setSaveStatus("Saving goal...");
    const res = await saveAcademicGoal({
      semesterNumber,
      currentCgpa,
      completedCredits: creditsEarned,
      targetCgpa,
      upcomingCredits: simData.simCredits,
      requiredGpa: simData.requiredGpa,
      isPossible: simData.isPossible,
      courses: simCourses.map(c => ({ name: c.name, credits: c.credits, targetGrade: c.grade }))
    });
    setSaveStatus(res.message);
    setTimeout(() => setSaveStatus(""), 4000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center font-sans">
        <p className="text-gray-500 font-bold text-sm">Loading CGPA Forecast & Retake Simulator...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0f172a] tracking-tight">Smart CGPA Forecast & Simulator</h1>
            <p className="text-gray-500 text-sm font-medium mt-1">Predict targets and simulate course retakes.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/grade-sheet" className="bg-emerald-50 text-emerald-700 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-emerald-100 transition">
              View Grade Sheet →
            </Link>
            <Link href="/dashboard" className="bg-indigo-50 text-indigo-600 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-indigo-100 transition">
              ← Dashboard
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Controls Column */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span> Academic Standing
              </h3>
              
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Current CGPA</label>
                <input
                  type="number"
                  step="0.01"
                  value={currentCgpa}
                  onChange={(e) => setCurrentCgpa(Number(e.target.value))}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-4 py-2 font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Completed Credits</label>
                <input
                  type="number"
                  value={creditsEarned}
                  onChange={(e) => setCreditsEarned(Number(e.target.value))}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-4 py-2 font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="border-t border-gray-100 pt-4"></div>

              <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Semester Goal Target
              </h3>

              <div className="flex gap-3">
                <div className="w-1/3">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Semester</label>
                  <input
                    type="number"
                    value={semesterNumber}
                    onChange={(e) => setSemesterNumber(Number(e.target.value))}
                    className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2 font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="w-2/3">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Target CGPA</label>
                  <input
                    type="number"
                    step="0.01"
                    value={targetCgpa}
                    onChange={(e) => setTargetCgpa(Number(e.target.value))}
                    className="w-full mt-1 border border-gray-200 rounded-xl px-4 py-2 font-bold text-sm text-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Smart Assistant */}
            <div className="bg-[#5b51e5] rounded-3xl p-6 text-white shadow-md">
              <h3 className="font-bold text-xs tracking-wider mb-2">SMART CGPA ASSISTANT</h3>
              <p className="text-sm font-medium leading-relaxed">
                To reach <span className="font-black bg-white/20 px-2 py-0.5 rounded">{targetCgpa.toFixed(2)}</span>, you need a minimum GPA of <span className="font-black bg-white/20 px-2 py-0.5 rounded">{simData.requiredGpa.toFixed(2)}</span> in Semester {semesterNumber}.
              </p>
              {!simData.isPossible && (
                <p className="text-xs bg-red-500 text-white p-2.5 rounded-xl font-bold border border-red-400 mt-3">
                  Target mathematically unachievable (&gt; 4.0 GPA required).
                </p>
              )}
            </div>
          </div>

          {/* Simulator & Retake Feature Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* INNOVATIVE FEATURE 1: Retake Simulator UI */}
            <div className="bg-gradient-to-r from-amber-500 to-indigo-600 rounded-3xl p-6 text-white shadow-sm space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded-md">
                  🚀 Innovative Tool
                </span>
                <h3 className="text-lg font-black mt-2">Course Retake Boost Simulator</h3>
                <p className="text-xs font-medium opacity-90">Simulate repeating a previous low-grade course to see CGPA improvement.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1 opacity-90">Select Graded Course</label>
                  <select
                    value={selectedRetakeId}
                    onChange={(e) => setSelectedRetakeId(e.target.value)}
                    className="w-full bg-white text-gray-900 font-bold text-xs p-2.5 rounded-xl outline-none"
                  >
                    <option value="">-- Choose Course --</option>
                    {dbCourses.filter(c => c.grade).map(c => (
                      <option key={c.id} value={c.id}>{c.code} - Current: {c.grade}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase mb-1 opacity-90">Simulate New Grade</label>
                  <select
                    value={newRetakeGrade}
                    onChange={(e) => setNewRetakeGrade(e.target.value)}
                    className="w-full bg-white text-gray-900 font-bold text-xs p-2.5 rounded-xl outline-none"
                  >
                    {Object.keys(gradeWeights).map(g => (
                      <option key={g} value={g}>{g} ({gradeWeights[g].toFixed(1)})</option>
                    ))}
                  </select>
                </div>
              </div>

              {retakeCalculation && (
                <div className="bg-black/20 border border-white/20 rounded-2xl p-4 flex justify-between items-center text-xs">
                  <span>New Boosted CGPA: <strong className="text-xl font-black">{retakeCalculation.newCgpa}</strong></span>
                  <span className="bg-emerald-400 text-gray-900 px-3 py-1 rounded-xl font-black">
                    +{retakeCalculation.gainDiff} Jump!
                  </span>
                </div>
              )}
            </div>

            {/* Semester Simulator Table */}
            <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-100 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Semester {semesterNumber} Simulator</h3>
                <p className="text-xs text-gray-400 mt-0.5">Auto-synced from your Attendance Tracker enrolled courses.</p>
              </div>

              <div className="grid grid-cols-12 text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2">
                <div className="col-span-6">Course</div>
                <div className="col-span-2 text-center">Credits</div>
                <div className="col-span-4 text-center">Simulated Grade</div>
              </div>

              <div className="space-y-2">
                {simCourses.map((course) => (
                  <div key={course.id} className="grid grid-cols-12 items-center text-xs font-semibold border border-gray-100 p-3 rounded-2xl bg-gray-50/50">
                    <div className="col-span-6 font-bold text-gray-800">{course.name}</div>
                    <div className="col-span-2 text-center font-bold text-gray-600">{course.credits}</div>
                    <div className="col-span-4 text-center">
                      <select
                        value={course.grade}
                        onChange={(e) => handleUpdateGrade(course.id, e.target.value)}
                        className="bg-white border border-gray-200 text-gray-800 py-1.5 px-3 rounded-xl outline-none focus:border-indigo-500 font-extrabold text-xs shadow-sm"
                      >
                        {Object.keys(gradeWeights).map(g => (
                          <option key={g} value={g}>{g} ({gradeWeights[g].toFixed(1)})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 flex flex-wrap items-center justify-between border border-gray-100 gap-4">
                <div className="flex gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Simulated GPA</p>
                    <p className="text-2xl font-black text-gray-900 mt-0.5">{simData.simulatedGpa.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Projected CGPA</p>
                    <p className={`text-2xl font-black mt-0.5 ${simData.projectedCgpa >= targetCgpa ? 'text-emerald-600' : 'text-gray-900'}`}>
                      {simData.projectedCgpa.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={handleApplyPlanner}
                    className="bg-[#0f172a] hover:bg-gray-800 text-white font-bold py-3 px-5 rounded-xl text-xs shadow-sm transition"
                  >
                    Save Academic Goal
                  </button>
                  {saveStatus && <span className="text-[11px] font-bold text-indigo-600">{saveStatus}</span>}
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}