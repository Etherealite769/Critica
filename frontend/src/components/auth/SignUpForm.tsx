'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api';

interface SignUpFormData {
  firstName: string; lastName: string; email: string; password: string; passwordConfirm: string;
}

export default function SignUpForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<SignUpFormData>({
    firstName: '', lastName: '', email: '', password: '', passwordConfirm: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const { firstName, lastName, email, password, passwordConfirm } = formData;
    if (!firstName || !lastName || !email || !password || !passwordConfirm) { setError('ALL FIELDS ARE REQUIRED.'); return; }
    if (password !== passwordConfirm) { setError('PASSWORDS DO NOT MATCH.'); return; }
    if (password.length < 8) { setError('PASSWORD MUST BE AT LEAST 8 CHARACTERS.'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, email, password, password_confirm: passwordConfirm }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || JSON.stringify(data)); return; }
      localStorage.setItem('accessToken', data.tokens.access);
      localStorage.setItem('refreshToken', data.tokens.refresh);
      localStorage.setItem('user', JSON.stringify(data.user));
      setSuccess('ENROLLMENT SUCCESSFUL — REDIRECTING...');
      setTimeout(() => router.push('/dashboard'), 1200);
    } catch {
      setError('COULD NOT REACH THE SERVER. PLEASE CHECK YOUR CONNECTION.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.inner}>
      {/* Document header — outlined box, centered */}
      <div style={s.hdrWrap}>
        <div style={s.hdr}>NEW STUDENT ENROLLMENT FORM</div>
      </div>

      {/* Stamp flanked by lines */}
      <div style={s.stampRow}>
        <div style={s.stampLine} />
        <span style={s.stamp}>ENROLLMENT FORM</span>
        <div style={s.stampLine} />
      </div>

      {/* Section Divider */}
      <div style={s.sec}>
        <span>PERSONAL INFORMATION</span>
        <div style={s.hrLine} />
      </div>

      {/* Messages */}
      {error && <div style={{ ...s.msg, ...s.msgErr }}>{error}</div>}
      {success && <div style={{ ...s.msg, ...s.msgOk }}>{success}</div>}

      <form onSubmit={handleSubmit} style={{ position: 'relative', zIndex: 1, marginTop: '12px' }}>
        <div style={s.twoCol}>
          <div>
            <label style={s.lbl}>FIRST NAME</label>
            <input style={s.inp} type="text" name="firstName" value={formData.firstName} onChange={handle} required />
          </div>
          <div>
            <label style={s.lbl}>LAST NAME</label>
            <input style={s.inp} type="text" name="lastName" value={formData.lastName} onChange={handle} required />
          </div>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={s.lbl}>EMAIL ADDRESS</label>
          <input style={s.inp} type="email" name="email" value={formData.email} onChange={handle} required />
        </div>

        {/* Credentials Section */}
        <div style={{ ...s.sec, marginTop: '20px' }}>
          <span>ACCESS CREDENTIALS</span>
          <div style={s.hrLine} />
        </div>

        <div style={s.twoCol}>
          <div>
            <label style={s.lbl}>PASSWORD</label>
            <input style={s.inp} type="password" name="password" value={formData.password} onChange={handle} required />
          </div>
          <div>
            <label style={s.lbl}>CONFIRM PASSWORD</label>
            <input style={s.inp} type="password" name="passwordConfirm" value={formData.passwordConfirm} onChange={handle} required />
          </div>
        </div>

        <div style={s.subWrap}>
          <button
            type="submit"
            disabled={loading}
            style={{ ...s.btn, opacity: loading ? 0.55 : 1 }}
            onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.boxShadow = '1px 1px 0 #432818'; e.currentTarget.style.transform = 'translate(2px,2px)'; }}}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '3px 3px 0 #432818'; e.currentTarget.style.transform = 'none'; }}
          >
            {loading ? 'Submitting...' : 'Submit Enrollment Form'}
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
    whiteSpace: 'nowrap',
  },

  /* Section dividers — label then line */
  sec: { display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0 10px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em', color: '#432818', fontFamily: "'Courier Prime', monospace" },
  hrLine: { flex: 1, height: '1.5px', background: '#C49A5A', opacity: 0.8 },

  /* Messages */
  msg: { borderRadius: '3px', padding: '7px 10px', fontSize: '10px', margin: '10px 0 4px', fontFamily: "'Courier Prime', monospace", letterSpacing: '0.05em' },
  msgErr: { background: '#f5d4cc', border: '1.5px solid #800020', color: '#800020' },
  msgOk: { background: '#d4eed8', border: '1.5px solid #3a8050', color: '#1a5030' },

  /* Labels & inputs */
  lbl: { display: 'block', fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', color: '#8C5A3C', marginBottom: '5px', fontFamily: "'Courier Prime', monospace" },
  inp: { width: '100%', background: '#FFFDF7', border: '1px solid #C49A5A', borderRadius: '8px', fontFamily: "'Courier Prime', monospace", fontSize: '13px', color: '#432818', padding: '8px 10px', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s', boxSizing: 'border-box', marginBottom: '12px' },

  /* Grid & button */
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  subWrap: { textAlign: 'center', marginTop: '20px' },
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