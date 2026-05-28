'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
      const res = await fetch('http://localhost:8000/api/auth/register/', {
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
      {/* Document header */}
      <div style={s.hdrWrap}>
        <div style={s.hdr}>
          <div style={s.logo}>
            <div style={s.oval1} />
            <div style={s.oval2} />
          </div>
          <div style={s.hdrTitle}>NEW STUDENT ENROLLMENT FORM</div>
        </div>
      </div>

      {/* Ink Stamp */}
      <div style={s.stampWrap}>
        <span style={s.stamp}>ENROLLMENT FORM</span>
      </div>

      {/* Section Divider */}
      <div style={s.sec}>
        <div style={s.secDot} />
        <span>PERSONAL INFORMATION</span>
        <div style={s.hrLine} />
      </div>

      {/* Messages */}
      {error && <div style={{ ...s.msg, ...s.msgErr }}>{error}</div>}
      {success && <div style={{ ...s.msg, ...s.msgOk }}>{success}</div>}

      <form onSubmit={handleSubmit} style={{ position: 'relative', zIndex: 1, marginTop: '16px' }}>
        <div style={s.twoCol}>
          <div>
            <label style={s.lbl}>FIRST NAME</label>
            <input style={s.inp} type="text" name="firstName" value={formData.firstName} onChange={handle} placeholder="Juan" required />
          </div>
          <div>
            <label style={s.lbl}>LAST NAME</label>
            <input style={s.inp} type="text" name="lastName" value={formData.lastName} onChange={handle} placeholder="dela Cruz" required />
          </div>
        </div>

        <label style={s.lbl}>EMAIL ADDRESS</label>
        <input style={s.inp} type="email" name="email" value={formData.email} onChange={handle} placeholder="juan@email.com" required />

        {/* Credentials Section */}
        <div style={{ ...s.sec, marginTop: '24px' }}>
          <div style={s.secDot} />
          <span>ACCESS CREDENTIALS</span>
          <div style={s.hrLine} />
        </div>

        <div style={s.twoCol}>
          <div>
            <label style={s.lbl}>PASSWORD</label>
            <input style={s.inp} type="password" name="password" value={formData.password} onChange={handle} placeholder="••••••••" required />
          </div>
          <div>
            <label style={s.lbl}>CONFIRM PASSWORD</label>
            <input style={s.inp} type="password" name="passwordConfirm" value={formData.passwordConfirm} onChange={handle} placeholder="••••••••" required />
          </div>
        </div>

        {/* Separator before final submission */}
        <div style={{...s.hrLine, margin: '24px 0'}} />

        <div style={s.subWrap}>
          <button
            type="submit"
            disabled={loading}
            style={{ ...s.btn, opacity: loading ? 0.55 : 1 }}
            onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.boxShadow = '1px 1px 0 #1a1209'; e.currentTarget.style.transform = 'translate(2px,2px)'; }}}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '3px 3px 0 #1a1209'; e.currentTarget.style.transform = 'none'; }}
          >
            {loading ? 'SUBMITTING...' : 'SUBMIT ENROLLMENT FORM'}
          </button>
        </div>
      </form>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  inner: { fontFamily: "'Courier Prime', monospace", position: 'relative', zIndex: 1, padding: '24px' },
  hdrWrap: { textAlign: 'left', marginBottom: '16px', display: 'flex', justifyContent: 'flex-start' },
  hdr: { background: '#1a1209', color: '#f0e6cc', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '1px', maxWidth: '400px' },
  logo: { position: 'relative', width: '36px', height: '22px', flexShrink: 0 },
  oval1: { width: '24px', height: '15px', borderRadius: '50%', background: '#6A4CFF', position: 'absolute', left: 0, top: '3px' },
  oval2: { width: '24px', height: '15px', borderRadius: '50%', background: '#20C4B4', position: 'absolute', left: '12px', top: '3px', opacity: 0.85 },
  hdrTitle: { fontSize: '10px', fontWeight: 700, letterSpacing: '0.16em', color: '#f0e6cc' },
  sec: { display: 'flex', alignItems: 'center', gap: '10px', margin: '14px 0 8px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em', color: '#5c4a28' },
  secDot: { width: '10px', height: '10px', borderRadius: '50%', background: '#c4b48a', flexShrink: 0 },
  hrLine: { flex: 1, height: '1.5px', background: '#c4b48a', opacity: 0.7 },
  stampWrap: { textAlign: 'center', margin: '30px 0', display: 'flex', justifyContent: 'center' },
  stamp: { display: 'inline-block', border: '3px solid #20C4B4', padding: '7px 20px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', color: '#20C4B4', background: 'rgba(32,196,180,0.08)', transform: 'rotate(5deg)', opacity: 0.8 },
  msg: { borderRadius: '2px', padding: '7px 10px', fontSize: '10px', margin: '10px 0 4px', letterSpacing: '0.05em' },
  msgErr: { background: '#f5d4cc', border: '1.5px solid #c05040', color: '#7a2010' },
  msgOk: { background: '#ccf0d8', border: '1.5px solid #3a8050', color: '#1a5030' },
  lbl: { display: 'block', fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em', color: '#5c4a28', marginBottom: '6px' },
  inp: { width: '100%', background: 'transparent', border: 'none', borderBottom: '2px solid #c4b48a', fontSize: '13px', color: '#1a1209', padding: '7px 4px', outline: 'none', boxSizing: 'border-box' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
  subWrap: { textAlign: 'center', marginTop: '16px' },
  btn: { fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', color: '#1a1209', background: '#d4c9a8', border: '2px solid #1a1209', padding: '10px 30px', cursor: 'pointer', boxShadow: '3px 3px 0 #1a1209', transition: 'box-shadow 0.1s, transform 0.1s' },
};