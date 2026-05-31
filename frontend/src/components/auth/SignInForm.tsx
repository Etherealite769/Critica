'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api';

export default function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email || !password) { setError('EMAIL AND PASSWORD ARE REQUIRED.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || data.detail || 'LOGIN FAILED. PLEASE CHECK YOUR CREDENTIALS.'); return; }
      localStorage.setItem('accessToken', data.tokens.access);
      localStorage.setItem('refreshToken', data.tokens.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));
      setSuccess('AUTHENTICATION SUCCESSFUL — REDIRECTING...');
      setTimeout(() => router.push('/dashboard'), 1200);
    } catch {
      setError('COULD NOT REACH THE SERVER. PLEASE CHECK YOUR CONNECTION.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.inner}>
      {/* Header — outlined box, centered */}
      <div style={s.hdrWrap}>
        <div style={s.hdr}>OFFICIAL STUDENT AUTHENTICATION DOCUMENT</div>
      </div>

      {/* Stamp flanked by lines */}
      <div style={s.stampRow}>
        <div style={s.stampLine} />
        <span style={s.stamp}>AUTHENTICATION FORM</span>
        <div style={s.stampLine} />
      </div>

      {/* Section label — text then line */}
      <div style={s.sec}>
        <span>IDENTIFICATION</span>
        <div style={s.hrLine} />
      </div>

      {/* Messages */}
      {error && <div style={{ ...s.msg, ...s.msgErr }}>{error}</div>}
      {success && <div style={{ ...s.msg, ...s.msgOk }}>{success}</div>}

      <form onSubmit={handleSubmit} style={{ position: 'relative', zIndex: 1, marginTop: '16px' }}>
        <div style={s.fieldGroup}>
          <label style={s.lbl}>EMAIL ADDRESS</label>
          <input
            style={s.inp}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email address here..."
            required
            onFocus={(e) => { e.target.style.borderColor = '#800020'; e.target.style.boxShadow = '0 0 0 2px rgba(128,0,32,0.1)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#C49A5A'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        <div style={s.fieldGroup}>
          <label style={s.lbl}>PASSWORD</label>
          <input
            style={s.inp}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password here..."
            required
            onFocus={(e) => { e.target.style.borderColor = '#800020'; e.target.style.boxShadow = '0 0 0 2px rgba(128,0,32,0.1)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#C49A5A'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Forgot password — right aligned */}
        <div style={s.fgtRow}>
          <button type="button" style={s.fgt} onClick={() => alert('Password recovery coming soon!')}>
            Forgot Password?
          </button>
        </div>

        <div style={s.subWrap}>
          <button
            type="submit"
            disabled={loading}
            style={{ ...s.btn, opacity: loading ? 0.55 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.boxShadow = '1px 1px 0 #432818'; e.currentTarget.style.transform = 'translate(2px,2px)'; }}}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '3px 3px 0 #432818'; e.currentTarget.style.transform = 'none'; }}
          >
            {loading ? 'Proceeding...' : 'Proceed to Access'}
          </button>
        </div>
      </form>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  inner: { fontFamily: "'Courier Prime', monospace", position: 'relative', zIndex: 1, padding: '8px 4px' },

  /* Header — outlined box, no fill */
  hdrWrap: { display: 'flex', justifyContent: 'center', marginBottom: '10px' },
  hdr: {
    border: '2px solid #6A381F',
    color: '#432818',
    padding: '7px 18px',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.22em',
    fontFamily: "'Courier Prime', monospace",
    textAlign: 'center',
    background: 'transparent',
  },

  /* Stamp row — line / stamp / line */
  stampRow: { display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0 16px' },
  stampLine: { flex: 1, height: '1.5px', background: '#C49A5A', opacity: 0.8 },
  stamp: {
    display: 'inline-block',
    border: '2.5px solid #6A381F',
    padding: '5px 14px',
    fontFamily: "'Courier Prime', monospace",
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.18em',
    color: '#6A381F',
    background: 'transparent',
    transform: 'rotate(-2deg)',
    whiteSpace: 'nowrap' as const,
  },

  /* Section dividers — label then line */
  sec: { display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0 10px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em', color: '#432818', fontFamily: "'Courier Prime', monospace" },
  hrLine: { flex: 1, height: '1.5px', background: '#C49A5A', opacity: 0.8 },

  /* Input groups */
  fieldGroup: { marginBottom: '16px' },
  msg: { borderRadius: '3px', padding: '7px 10px', fontSize: '10px', margin: '10px 0 4px', fontFamily: "'Courier Prime', monospace", letterSpacing: '0.05em' },
  msgErr: { background: '#f5d4cc', border: '1.5px solid #800020', color: '#800020' },
  msgOk:  { background: '#d4eed8', border: '1.5px solid #3a8050', color: '#1a5030' },
  lbl: {
    display: 'block', fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em',
    color: '#8C5A3C', marginBottom: '6px',
    fontFamily: "'Courier Prime', monospace",
  },
  inp: {
    width: '100%',
    background: '#FFFDF7',
    border: '1px solid #C49A5A',
    borderRadius: '8px',
    fontFamily: "'Courier Prime', monospace",
    fontSize: '13px',
    color: '#432818',
    padding: '8px 10px',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box',
  },

  /* Forgot password — right aligned */
  fgtRow: { display: 'flex', justifyContent: 'flex-end', marginTop: '4px', marginBottom: '20px' },
  fgt: {
    fontSize: '11px',
    fontStyle: 'italic',
    color: '#432818',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: "'Courier Prime', monospace",
    padding: 0,
  },

  subWrap: { textAlign: 'center' },
  btn: {
    fontFamily: "'Courier Prime', monospace",
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    color: '#432818',
    background: '#FFDFA7',
    border: '2px solid #8C5A3C',
    padding: '9px 26px',
    cursor: 'pointer',
    boxShadow: '3px 3px 0 #432818',
    transition: 'box-shadow 0.1s, transform 0.1s',
    borderRadius: '2px',
  },
};