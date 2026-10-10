'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StudentDashboard from '@/components/dashboard/StudentDashboard';
import desk from '@/components/dashboard/desk.module.css';

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
      <main
        className={`${desk.desk} min-h-screen text-[#C4A882] font-mono text-sm flex items-center justify-center`}>
        <p>Loading...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return <StudentDashboard />;
}
