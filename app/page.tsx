import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0f172a] rounded-xl flex items-center justify-center text-white font-bold shadow-md">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
            </svg>
          </div>
          <span className="text-xl font-black text-[#0f172a] tracking-tight">UniVerse</span>
        </div>

        <nav className="flex items-center gap-4">
          <Link 
            href="/login" 
            className="text-xs font-bold text-gray-600 hover:text-indigo-600 px-4 py-2 rounded-xl transition"
          >
            Sign In
          </Link>
          <Link 
            href="/register" 
            className="text-xs font-bold text-white bg-[#0f172a] hover:bg-gray-800 px-5 py-2.5 rounded-xl shadow-md transition"
          >
            Get Started
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-7xl mx-auto px-6 py-12 lg:py-20 flex-1 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold px-4 py-1.5 rounded-full mb-6">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
          The Ultimate All-in-One Campus SuperApp
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-[#0f172a] tracking-tight max-w-4xl leading-tight sm:leading-none mb-6">
          Take full control of your university journey with <span className="text-[#5b51e5]">precision</span>.
        </h1>

        <p className="text-base sm:text-lg text-gray-500 font-medium max-w-2xl mb-10 leading-relaxed">
          Forecast your CGPA with smart target analytics, track attendance across active courses, and stay organized through an integrated academic planner.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center max-w-md">
          <Link 
            href="/register" 
            className="w-full sm:w-auto bg-[#0f172a] hover:bg-gray-800 text-white font-bold text-sm px-8 py-4 rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
          >
            Create Free Account
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
          <Link 
            href="/login" 
            className="w-full sm:w-auto bg-white border border-gray-200 hover:border-gray-300 text-gray-800 font-bold text-sm px-8 py-4 rounded-2xl shadow-sm transition flex items-center justify-center"
          >
            Student Login
          </Link>
        </div>

        {/* Feature Grid Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20 text-left w-full">
          
          {/* Card 1: CGPA Forecast */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-bold mb-6">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Smart CGPA Forecast</h3>
            <p className="text-sm text-gray-500 font-medium leading-relaxed">
              Reverse-engineer your required target grades. Our simulator calculates the exact GPA needed to hit your academic goals.
            </p>
          </div>

          {/* Card 2: Attendance Tracking */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 font-bold mb-6">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Attendance Monitor</h3>
            <p className="text-sm text-gray-500 font-medium leading-relaxed">
              Keep track of attended classes, monitor attendance thresholds, and avoid credit penalties automatically.
            </p>
          </div>

          {/* Card 3: Unified Profile */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 font-bold mb-6">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Unified Profile</h3>
            <p className="text-sm text-gray-500 font-medium leading-relaxed">
              Store institutional profile data, active course schedules, and semester records securely under one account.
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-8 border-t border-gray-200/60 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-semibold text-gray-400">
        <p>© {new Date().getFullYear()} UniVerse. All rights reserved.</p>
        <div className="flex gap-6">
          <Link href="/login" className="hover:text-gray-600 transition">Login</Link>
          <Link href="/register" className="hover:text-gray-600 transition">Register</Link>
          <Link href="/cgpa-forecast" className="hover:text-gray-600 transition">CGPA Forecast</Link>
        </div>
      </footer>
    </div>
  );
}