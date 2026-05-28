'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Tab {
  id: number;
  label: string;
}

interface Lesson {
  id: number;
  icon: string;
  title: string;
  status: 'active' | 'done';
  description: string;
  progress: number;
  exercises: { completed: number; total: number };
}

const tabs: Tab[] = [
  { id: 1, label: '[1] TEXT STRUCTURE\nMASTERY' },
  { id: 2, label: '[2] SNAP-IN-GAP' },
  { id: 3, label: '[3] TAP THE CLUES' },
  { id: 4, label: '[4] FACT SCANNER' },
];

const skillNodeData: Record<number, { title: string; lessons: Lesson[] }> = {
  1: {
    title: 'TEXT STRUCTURE MASTERY',
    lessons: [
      {
        id: 1,
        icon: '⊕',
        title: 'Narration',
        status: 'active',
        description: 'Mapping the narration pattern of text development through paragraph sequencing.',
        progress: 75,
        exercises: { completed: 3, total: 4 },
      },
      {
        id: 2,
        icon: '⊞',
        title: 'Definition',
        status: 'active',
        description: 'Mapping the definition pattern of text development through paragraph sequencing.',
        progress: 60,
        exercises: { completed: 2, total: 4 },
      },
      {
        id: 3,
        icon: '◇',
        title: 'Comparison & Contrast',
        status: 'done',
        description: 'Mapping both the comparison and contrast patterns of text development through paragraph sequencing.',
        progress: 100,
        exercises: { completed: 4, total: 4 },
      },
      {
        id: 4,
        icon: '→',
        title: 'Cause-Effect',
        status: 'active',
        description: 'Mapping the cause-effect pattern of text development through paragraph sequencing.',
        progress: 45,
        exercises: { completed: 2, total: 4 },
      },
    ],
  },
  2: {
    title: 'SNAP-IN-GAP',
    lessons: [
      {
        id: 5,
        icon: '+',
        title: 'Addition & Sequence',
        status: 'active',
        description: 'Transitions like furthermore, next, additionally. Evaluate text coherence by selecting correct transition tiles.',
        progress: 70,
        exercises: { completed: 2, total: 3 },
      },
      {
        id: 6,
        icon: '⟷',
        title: 'Contrast & Opposition',
        status: 'active',
        description: 'Transitions like however, on the other hand. Bridging sentence gaps with coherent transitions.',
        progress: 55,
        exercises: { completed: 1, total: 3 },
      },
      {
        id: 7,
        icon: '→',
        title: 'Cause & Effect',
        status: 'done',
        description: 'Transitions like therefore, consequently. Connecting ideas through causal relationships.',
        progress: 100,
        exercises: { completed: 3, total: 3 },
      },
      {
        id: 8,
        icon: '⊡',
        title: 'Conclusion Signals',
        status: 'active',
        description: 'Transitions like ultimately, in conclusion. Signaling closure and synthesis of ideas.',
        progress: 40,
        exercises: { completed: 1, total: 3 },
      },
    ],
  },
  3: {
    title: 'TAP THE CLUES',
    lessons: [
      {
        id: 9,
        icon: '≈',
        title: 'Synonym Clues',
        status: 'active',
        description: 'Finding words nearby with similar meanings. Build vocabulary by tapping surrounding semantic clue words.',
        progress: 65,
        exercises: { completed: 2, total: 4 },
      },
      {
        id: 10,
        icon: '=',
        title: 'Definition Clues',
        status: 'active',
        description: 'Spotting exact definitions embedded in the text. Identify explicit meanings within the passage.',
        progress: 80,
        exercises: { completed: 3, total: 4 },
      },
      {
        id: 11,
        icon: '⬍',
        title: 'Antonym & Contrast Clues',
        status: 'done',
        description: 'Identifying opposite words that hint at the target word\'s meaning. Understanding meaning through opposition.',
        progress: 100,
        exercises: { completed: 4, total: 4 },
      },
      {
        id: 12,
        icon: '◈',
        title: 'Example & Inference Clues',
        status: 'active',
        description: 'Deducing meaning from scenarios or settings described nearby. Understanding through context and examples.',
        progress: 50,
        exercises: { completed: 2, total: 4 },
      },
    ],
  },
  4: {
    title: 'FACT SCANNER',
    lessons: [
      {
        id: 13,
        icon: '⏰',
        title: 'Currency',
        status: 'active',
        description: 'Identifying outdated information. Apply the CRAAP framework to highlight and quarantine flawed sentences.',
        progress: 60,
        exercises: { completed: 2, total: 4 },
      },
      {
        id: 14,
        icon: '◎',
        title: 'Relevance',
        status: 'active',
        description: 'Spotting information that doesn\'t answer the prompt or match the audience level. Filtering irrelevant claims.',
        progress: 75,
        exercises: { completed: 3, total: 4 },
      },
      {
        id: 15,
        icon: '👤',
        title: 'Authority',
        status: 'done',
        description: 'Highlighting unsupported claims or lack of credentials/sources. Evaluating source credibility.',
        progress: 100,
        exercises: { completed: 4, total: 4 },
      },
      {
        id: 16,
        icon: '✓',
        title: 'Accuracy',
        status: 'active',
        description: 'Identifying factual errors, bias, or unverified data. Detecting misinformation and logical fallacies.',
        progress: 55,
        exercises: { completed: 2, total: 4 },
      },
      {
        id: 17,
        icon: '🎯',
        title: 'Purpose',
        status: 'active',
        description: 'Quarantining sentences that show extreme bias, propaganda, or hidden agendas. Recognizing manipulative intent.',
        progress: 45,
        exercises: { completed: 1, total: 3 },
      },
    ],
  },
};

interface UserData {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState<number>(1);
  const [scrollPosition, setScrollPosition] = useState<number>(0);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [totalXP, setTotalXP] = useState<number>(0);
  const [isClient, setIsClient] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    // Mark that we're on the client
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    // Load user data from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserData(user);
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }

    // Fetch progression data from API
    const fetchProgression = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
          console.log('No user data found in localStorage, using defaults');
          setStreak(0);
          setTotalXP(0);
          return;
        }

        let user;
        try {
          user = JSON.parse(storedUser);
        } catch (parseError) {
          console.error('Failed to parse user data:', parseError);
          setStreak(0);
          setTotalXP(0);
          return;
        }

        const userEmail = user?.email || user?.Email;

        if (!userEmail) {
          console.log('No user email found, using defaults. User data:', user);
          setStreak(0);
          setTotalXP(0);
          return;
        }

        console.log('Fetching progression for email:', userEmail);

        const response = await fetch('http://localhost:8000/api/progression/', {
          method: 'GET',
          headers: {
            'X-User-Email': userEmail,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.warn('Progression API returned status:', response.status);
          setStreak(0);
          setTotalXP(0);
          return;
        }

        const data = await response.json();
        console.log('Progression data received:', data);
        setStreak(data.streak || 0);
        setTotalXP(data.total_xp || 0);
      } catch (error) {
        console.error('Error fetching progression:', error);
        // Keep default values if fetch fails
        setStreak(0);
        setTotalXP(0);
      }
    };

    fetchProgression();
  }, [isClient]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.push('/auth');
  };

  const displayName = userData
    ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim()
    : 'Student';

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-[#eee] font-serif">
      {/* TOPBAR */}
      <header className="h-[52px] bg-[#1e1e1e] flex items-center justify-end gap-9 px-9 border-b border-[#333]">
        <div className="flex items-center gap-2 font-mono text-xs text-[#ddd]">
          <span className="text-sm">🔥</span>
          <strong>Streak:</strong>&nbsp;{streak} Days
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-[#ddd]">
          <span className="text-sm">⭐</span>
          <strong>Total:</strong>&nbsp;{totalXP} XP
        </div>
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 font-mono text-xs text-[#ddd] hover:text-[#fff] cursor-pointer transition-colors"
          >
            <span className="text-sm">👤</span>{displayName}
          </button>
          {showProfileMenu && (
            <div className="absolute top-full right-0 mt-2 bg-[#2b2b2b] border border-[#444] rounded-sm shadow-lg z-50 min-w-[150px]">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-xs font-mono text-[#ddd] hover:bg-[#3a3a3a] hover:text-[#fff] transition-colors border-t border-[#444] first:border-t-0"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* DARK SPACER */}
      <div className="h-20 bg-[#2b2b2b]" />

      {/* BODY ROW */}
      <div className="flex h-[calc(100vh-52px-80px)] bg-[#2b2b2b]">
        {/* LEFT COLUMN */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* TABS */}
          <div className="flex items-end flex-shrink-0 bg-[#2b2b2b]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-7 h-[52px] flex items-center justify-center font-mono text-xs font-bold uppercase tracking-wider cursor-pointer border-none outline-none whitespace-pre-wrap text-center transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#c8c4bc] text-[#111] h-[60px]'
                    : 'bg-[#444] text-[#aaa] hover:bg-[#505050] hover:text-[#ccc]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* CONTENT PANEL */}
          <div className="flex-1 bg-[#c8c4bc] overflow-hidden flex">
            <div
              className="flex-1 overflow-y-auto px-9 pt-[30px] pb-[30px]"
              onScroll={(e) =>
                setScrollPosition(
                  (e.currentTarget.scrollTop /
                    (e.currentTarget.scrollHeight -
                      e.currentTarget.clientHeight)) *
                    100
                )
              }
            >
              {/* Doc Header */}
              <div className="text-center mb-6">
                <div className="inline-block border-[1.5px] border-[#777] px-6 py-1 font-mono text-xs tracking-widest text-[#333] bg-white bg-opacity-20 mb-4">
                  OFFICIAL STUDENT DASHBOARD DOCUMENT
                </div>
                <div className="flex items-center gap-0">
                  <div className="flex-1 h-px bg-[#888]" />
                  <div className="border-2 border-[#555] px-4 py-[7px] font-mono text-sm font-bold uppercase tracking-wider text-[#111] bg-[#ddd9d0] whitespace-nowrap">
                    {skillNodeData[activeTab].title}
                  </div>
                  <div className="flex-1 h-px bg-[#888]" />
                </div>
              </div>

              {/* Bullet above card 1 */}
              <div className="flex flex-col items-start gap-1.5 my-1.5 ml-0">
                <div className="w-3 h-3 rounded-full bg-[#888] border-2 border-[#aaa] flex-shrink-0" />
              </div>

              {/* CARDS */}
              {skillNodeData[activeTab].lessons.map((lesson, idx) => (
                <div key={lesson.id}>
                  {/* Card Row */}
                  <div className="flex items-start gap-2.5 mb-1.5">
                    <div className="w-[14px] h-[14px] rounded-full bg-[#888] border-2 border-[#aaa] flex-shrink-0 mt-[14px]" />

                    {/* Card */}
                    <div className="flex-1 bg-[#f0ece4] border border-[#bbb] rounded-sm p-4 text-[#111] relative min-w-0">
                      {/* Card Top */}
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-[#111] rounded-sm flex items-center justify-center text-white text-xs flex-shrink-0">
                            {lesson.icon}
                          </div>
                          <div className="font-mono text-xs font-bold uppercase tracking-wider">
                            {lesson.title}
                          </div>
                        </div>
                        <div
                          className={`font-mono text-xs tracking-wider px-[7px] py-[3px] border uppercase flex-shrink-0 ${
                            lesson.status === 'active'
                              ? 'text-[#55aaff] border-[#55aaff] bg-blue-100 bg-opacity-10'
                              : 'text-[#4ddd94] border-[#4ddd94] bg-green-100 bg-opacity-10'
                          }`}
                        >
                          {lesson.status === 'active'
                            ? 'UNLOCKED / ACTIVE'
                            : 'COMPLETED / DONE'}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs leading-relaxed text-[#555] mb-2.5">
                        {lesson.description}
                      </p>

                      {/* Inner Bullet */}
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#aaa] border-[1.5px] border-[#ccc] flex-shrink-0" />
                      </div>

                      {/* Progress Bar */}
                      <div className="h-[5px] bg-[#bbb] rounded-sm mb-3 overflow-hidden">
                        <div
                          className="h-full bg-[#222] rounded-sm transition-all"
                          style={{ width: `${lesson.progress}%` }}
                        />
                      </div>

                      {/* Card Footer */}
                      <div className="flex justify-between items-end">
                        <div className="font-mono text-[10px] text-[#555] leading-6">
                          PROGRESS — {lesson.progress}%
                          <br />
                          {lesson.exercises.completed}/{lesson.exercises.total}{' '}
                          EXERCISES
                        </div>
                        <button className="font-mono text-xs font-bold uppercase tracking-wider text-center px-4 py-[9px] bg-[#d8d4cc] border-[1.5px] border-[#888] text-[#111] cursor-pointer leading-snug transition-all hover:bg-[#111] hover:text-[#eee] flex-shrink-0 whitespace-nowrap">
                          PULL PAPER &<br />
                          START TRAINING
                        </button>
                      </div>

                      {/* Completed Stamp */}
                      {lesson.status === 'done' && (
                        <div className="absolute top-1/2 left-[44%] -translate-x-1/2 -translate-y-1/2 -rotate-12 pointer-events-none">
                          <div className="font-mono text-4xl text-[#4ddd94] border-4 border-[#4ddd94] px-3 opacity-[0.72] bg-green-100 bg-opacity-5 whitespace-nowrap tracking-wider">
                            COMPLETED
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bullets between cards */}
                  {idx < skillNodeData[activeTab].lessons.length - 1 && (
                    <div className="flex flex-col items-start gap-1.5 my-1.5 ml-0">
                      <div className="w-3 h-3 rounded-full bg-[#888] border-2 border-[#aaa] flex-shrink-0" />
                      <div className="w-3 h-3 rounded-full bg-[#888] border-2 border-[#aaa] flex-shrink-0" />
                    </div>
                  )}
                </div>
              ))}

              {/* Trailing bullets */}
              <div className="flex flex-col items-start gap-1.5 my-1.5 ml-0">
                <div className="w-3 h-3 rounded-full bg-[#888] border-2 border-[#aaa] flex-shrink-0" />
                <div className="w-3 h-3 rounded-full bg-[#888] border-2 border-[#aaa] flex-shrink-0" />
              </div>
            </div>

            {/* Scroll Dots Column */}
            <div className="w-8 flex flex-col items-center justify-between py-[30px] flex-shrink-0 pr-1">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="w-3.5 h-3.5 rounded-full bg-[#999] border-2 border-[#bbb] cursor-pointer hover:bg-[#777] transition-all"
                  style={{
                    opacity: Math.abs(i / 7 * 100 - scrollPosition) < 20 ? 1 : 0.5,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <aside className="w-[300px] flex-shrink-0 bg-[#2b2b2b] border-l border-[#333] flex flex-col gap-3 p-3.5 overflow-y-auto">
          {[
            { icon: '📋', label: 'LEXICAL\nCLIPBOARD' },
            { icon: '📄', label: 'QUICK\nREVIEW' },
            { icon: '📈', label: 'METRIC\nLOG' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex-1 bg-[#d0ccc4] rounded-sm flex flex-row items-start justify-center gap-3 px-5.5 py-4.5 cursor-pointer transition-all hover:bg-[#dedad2] min-h-[90px]"
            >
              <div className="text-2xl text-[#222] flex-shrink-0 mt-0.5">
                {item.icon}
              </div>
              <div className="font-mono text-sm font-bold uppercase tracking-wider text-[#111] leading-relaxed text-left whitespace-pre-line">
                {item.label}
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
