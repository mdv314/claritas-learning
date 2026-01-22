import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <header className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-600/20">
            C
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-900">Claritas Learning</span>
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-500">
          <Link href="/" className="text-gray-900">Home</Link>
          <Link href="/generate" className="hover:text-blue-600 transition-colors">Create Course</Link>
          <Link href="#" className="hover:text-blue-600 transition-colors">Library</Link>
        </nav>
        <div className="flex gap-4">
          <Link href="/generate">
            <button className="px-6 py-2.5 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
              Get Started
            </button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-8 pt-20 pb-32">
        <div className="flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Now with Gemini 3 AI
            </div>

            <h1 className="text-6xl font-bold text-gray-900 tracking-tight leading-tight">
              Learn anything <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                your heart desires.
              </span>
            </h1>

            <p className="text-xl text-gray-600 leading-relaxed max-w-lg">
              Claritas Learning uses advanced AI to generate comprehensive, personalized course plans for any topic, age, or skill level.
            </p>

            <div className="flex gap-4 pt-4">
              <Link href="/generate">
                <button className="px-8 py-4 rounded-xl bg-gray-900 text-white font-bold text-lg hover:bg-black transition-all hover:scale-105 active:scale-95 duration-200">
                  Start Learning Now
                </button>
              </Link>
              <button className="px-8 py-4 rounded-xl bg-gray-100 text-gray-900 font-bold text-lg hover:bg-gray-200 transition-all">
                View Demo
              </button>
            </div>

            <div className="pt-8 flex items-center gap-4 text-sm text-gray-500">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`w-8 h-8 rounded-full border-2 border-white bg-gray-${i * 200} bg-gradient-to-br from-gray-200 to-gray-400`} />
                ))}
              </div>
              <p>Trusted by 10,000+ learners</p>
            </div>
          </div>

          <div className="flex-1 relative">
            <div className="absolute top-0 right-0 -z-10 bg-gradient-to-bl from-blue-100 to-purple-100 rounded-full blur-3xl w-[120%] h-[120%] opacity-60 transform translate-x-20 -translate-y-20"></div>
            <div className="relative bg-white/50 backdrop-blur-xl border border-white/50 p-6 rounded-3xl shadow-2xl transform rotate-3 hover:rotate-0 transition-all duration-500">
              {/* Abstract UI representation of a course card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
                <div className="h-48 rounded-xl bg-gray-100 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 opacity-10"></div>
                  <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur rounded-lg p-3">
                    <div className="h-2 w-24 bg-gray-200 rounded mb-2"></div>
                    <div className="h-2 w-16 bg-gray-200 rounded"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-3/4 bg-gray-900 rounded opacity-10"></div>
                  <div className="h-4 w-1/2 bg-gray-900 rounded opacity-10"></div>
                </div>
                <div className="flex gap-2 pt-2">
                  <div className="h-8 w-20 bg-blue-100 rounded-lg"></div>
                  <div className="h-8 w-20 bg-purple-100 rounded-lg"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
