'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/auth');
      return;
    }
    setUser(JSON.parse(storedUser));
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="bg-slate-900 border-b border-slate-800 p-6">
        <div className="mx-auto max-w-6xl flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-cyan-300">
            Capstone Critica
          </Link>
          <button
            onClick={handleLogout}
            className="rounded-full bg-red-500 px-6 py-2 font-semibold text-white transition hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </nav>

      <section className="mx-auto flex min-h-[calc(100vh-80px)] max-w-6xl flex-col justify-center px-6 py-16">
        <div className="max-w-3xl space-y-8">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
            Welcome
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Hello, {user.first_name} {user.last_name}!
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-300">
            You are now logged in. This is your dashboard.
          </p>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8">
            <h2 className="text-2xl font-semibold text-white mb-4">Account Information</h2>
            <div className="space-y-3 text-slate-300">
              <p>
                <span className="font-semibold text-white">Name:</span> {user.first_name} {user.last_name}
              </p>
              <p>
                <span className="font-semibold text-white">Email:</span> {user.email}
              </p>
              <p>
                <span className="font-semibold text-white">User ID:</span> {user.id}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
