'use client';

import { useState } from 'react';
import SignUpForm from '@/components/auth/SignUpForm';
import SignInForm from '@/components/auth/SignInForm';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<'signup' | 'signin'>('signup');

  return (
    <main className="auth-page">
      <div className="folder-unit">

        {/* Folder Tabs */}
        <div className="tab-row">
          <button
            onClick={() => setActiveTab('signup')}
            className={`tab-btn ${activeTab === 'signup' ? 'tab-active' : 'tab-inactive'}`}
          >
            Sign Up
          </button>
          <button
            onClick={() => setActiveTab('signin')}
            className={`tab-btn ${activeTab === 'signin' ? 'tab-active' : 'tab-inactive'}`}
          >
            Sign In
          </button>
        </div>

        {/* Folder Body */}
        <div className="folder-body">

          {/* Binder punch holes */}
          <div className="binder-holes">
            <div className="hole" />
            <div className="hole" />
            <div className="hole" />
            <div className="hole" />
          </div>

          {/* Form content directly on folder */}
          <div className="form-content">
            {activeTab === 'signup' ? <SignUpForm /> : <SignInForm />}
          </div>

        </div>
      </div>

      <style>{`
        html, body {
          background: #1a0000 !important;
          margin: 0;
          padding: 0;
          min-height: 100%;
        }

        .auth-page {
          min-height: 100vh;
          background: radial-gradient(ellipse at center, #7a1a1a 0%, #4a0a0a 40%, #1a0000 75%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          font-family: 'Courier New', Courier, monospace;
        }

        .folder-unit {
          width: 560px;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        /* ── Tabs ── */
        .tab-row {
          display: flex;
          flex-direction: row;
          align-items: flex-end;
          justify-content: flex-end;
          gap: 4px;
          padding-bottom: 0;
          padding-right: 40px;
        }

        .tab-btn {
          padding: 9px 28px;
          font-family: 'Courier New', Courier, monospace;
          font-size: 13px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          letter-spacing: 0.05em;
          border-radius: 8px 8px 0 0;
          transition: background 0.12s, color 0.12s;
          line-height: 1;
        }

        .tab-active {
          background: #F2DEC1 !important;
          color: #432818;
          padding: 10px 28px 12px;
        }

        .tab-inactive {
          background: #C49A5A;
          color: #432818;
          padding: 8px 28px 10px;
        }

        .tab-inactive:hover {
          background: #B8905A;
          color: #1a0000;
        }

        /* ── Folder Body ── */
        .folder-body {
          background: #F2DEC1;
          border-radius: 12px 12px 12px 12px;
          padding: 16px 16px 24px 12px;
          position: relative;
          width: 100%;
          box-sizing: border-box;
          box-shadow: 0 8px 32px rgba(26,0,0,0.55);
        }

        /* ── Punch Holes ── */
        .binder-holes {
          position: absolute;
          left: 16px;
          top: 20px;
          bottom: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-around;
        }

        .hole {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: rgba(196, 168, 130, 0.15);
          border: 2px solid rgba(196, 168, 130, 0.35);
          box-sizing: border-box;
        }

        /* ── Form Content ── */
        .form-content {
          padding: 8px 16px 16px 52px;
          box-sizing: border-box;
        }
      `}</style>
    </main>
  );
}