'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StudentDashboard from '@/components/dashboard/StudentDashboard';

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

  if (loading) {
    return (
      <main className="min-h-screen bg-[#1e1e1e] text-white flex items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return <StudentDashboard />;
}
