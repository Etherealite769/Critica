'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './profile-settings.module.css';
import { apiFetch } from '@/lib/api';
import InspectorCrit from '@/components/brand/InspectorCrit';
import {
  isSfxMuted as checkSfxMuted,
  setSfxMuted,
  playClickSound,
  playRightAnswerSound,
  playVictorySound,
} from '@/lib/sound-effects';
import {
  getThemeMuted,
  setThemeMuted,
  getThemeVolume,
  setThemeVolume,
  getSfxVolume,
  setSfxVolume,
  EVT_THEME_MUTE_CHANGED,
  EVT_THEME_VOLUME_CHANGED,
  EVT_SFX_MUTE_CHANGED,
  EVT_SFX_VOLUME_CHANGED,
} from '@/lib/audio-sync';
import { PASSWORD_RULES, passwordStrength, STRENGTH_LABELS } from '@/components/auth/passwordPolicy';
import {
  User,
  ShieldCheck,
  KeyRound,
  Radio,
  X,
  Mail,
  Flame,
  CircleCheck,
  Zap,
  Check,
  AlertTriangle,
  Volume2,
  VolumeX,
  Volume1,
  Disc,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Music,
  MousePointerClick,
  Sparkles,
  Calendar,
  Lock,
  Camera,
  Upload,
} from 'lucide-react';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated?: (user: { first_name: string; last_name: string; profile_picture?: string }) => void;
}

interface ProfileData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_picture?: string;
  account_status: string;
  is_verified: boolean;
  created_at: string | null;
  streak: number;
  total_xp: number;
  level: number;
  rank_title: string;
  completed_count: number;
}

type TabKey = 'account' | 'clearance' | 'security' | 'broadcast';

export default function ProfileSettingsModal({ isOpen, onClose, onUserUpdated }: ProfileSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('account');
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states - Account Info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState('');
  const [accountError, setAccountError] = useState('');

  // Form states - Profile Picture (Avatar)
  const [profilePicture, setProfilePicture] = useState<string>('');
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [avatarSuccess, setAvatarSuccess] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states - Email Verification
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [clearanceSuccess, setClearanceSuccess] = useState('');
  const [clearanceError, setClearanceError] = useState('');

  // Form states - Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Audio Environment state (synced with topbar player)
  const [themeMuted, setThemeMutedState] = useState(false);
  const [themeVol, setThemeVolState] = useState(0.35);
  const [sfxMuted, setSfxMutedState] = useState(false);
  const [sfxVol, setSfxVolState] = useState(0.6);

  // Load profile from API
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/auth/profile/');
      if (data && typeof data === 'object') {
        setProfile(data);
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setProfilePicture(data.profile_picture || '');
      }
    } catch (err: any) {
      console.warn('Could not fetch cadet profile:', err);
      // Fallback from localStorage
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setProfile({
            id: parsed.id || 'CAD-001',
            email: parsed.email || '',
            first_name: parsed.first_name || '',
            last_name: parsed.last_name || '',
            profile_picture: parsed.profile_picture || '',
            account_status: 'active',
            is_verified: true,
            created_at: null,
            streak: 0,
            total_xp: 0,
            level: 1,
            rank_title: 'Cadet Sleuth (Level 1)',
            completed_count: 0,
          });
          setFirstName(parsed.first_name || '');
          setLastName(parsed.last_name || '');
          setProfilePicture(parsed.profile_picture || '');
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
      // Initialize audio state from synchronizer
      setThemeMutedState(getThemeMuted());
      setThemeVolState(getThemeVolume());
      setSfxMutedState(checkSfxMuted());
      setSfxVolState(getSfxVolume());
    }
  }, [isOpen, fetchProfile]);

  // Audio synchronization listeners
  useEffect(() => {
    const onThemeMute = (e: Event) => {
      const customEvent = e as CustomEvent<{ muted: boolean }>;
      if (customEvent.detail !== undefined) setThemeMutedState(customEvent.detail.muted);
    };
    const onThemeVol = (e: Event) => {
      const customEvent = e as CustomEvent<{ volume: number }>;
      if (customEvent.detail !== undefined) setThemeVolState(customEvent.detail.volume);
    };
    const onSfxMute = (e: Event) => {
      const customEvent = e as CustomEvent<{ muted: boolean }>;
      if (customEvent.detail !== undefined) setSfxMutedState(customEvent.detail.muted);
    };
    const onSfxVol = (e: Event) => {
      const customEvent = e as CustomEvent<{ volume: number }>;
      if (customEvent.detail !== undefined) setSfxVolState(customEvent.detail.volume);
    };

    window.addEventListener(EVT_THEME_MUTE_CHANGED, onThemeMute);
    window.addEventListener(EVT_THEME_VOLUME_CHANGED, onThemeVol);
    window.addEventListener(EVT_SFX_MUTE_CHANGED, onSfxMute);
    window.addEventListener(EVT_SFX_VOLUME_CHANGED, onSfxVol);

    return () => {
      window.removeEventListener(EVT_THEME_MUTE_CHANGED, onThemeMute);
      window.removeEventListener(EVT_THEME_VOLUME_CHANGED, onThemeVol);
      window.removeEventListener(EVT_SFX_MUTE_CHANGED, onSfxMute);
      window.removeEventListener(EVT_SFX_VOLUME_CHANGED, onSfxVol);
    };
  }, []);

  // Cooldown countdown for verification resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Keyboard escape handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Save Account Information
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError('');
    setAccountSuccess('');

    if (!firstName.trim() || !lastName.trim()) {
      setAccountError('First and last name cannot be empty.');
      return;
    }

    try {
      setSavingAccount(true);
      playClickSound();
      const res = await apiFetch('/auth/profile/', {
        method: 'PUT',
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        }),
      });

      setProfile((prev) => (prev ? { ...prev, first_name: firstName.trim(), last_name: lastName.trim() } : prev));
      setAccountSuccess('Personnel record updated successfully.');
      playRightAnswerSound();

      // Sync local storage
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.first_name = firstName.trim();
          parsed.last_name = lastName.trim();
          localStorage.setItem('user', JSON.stringify(parsed));
        } catch {}
      }

      if (onUserUpdated) {
        onUserUpdated({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          profile_picture: profilePicture,
        });
      }
    } catch (err: any) {
      setAccountError(err.error || 'Failed to update personnel record.');
    } finally {
      setSavingAccount(false);
    }
  };

  // Handle file selection and client-side resize/crop to 256x256
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError('');
    setAvatarSuccess('');

    // Clear file input so same file can be selected again
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setAvatarError('Image file is too large (must be under 8MB before compression).');
      return;
    }

    setSavingAvatar(true);
    playClickSound();

    const reader = new FileReader();
    reader.onerror = () => {
      setAvatarError('Failed to read image file.');
      setSavingAvatar(false);
    };

    reader.onload = () => {
      const img = new Image();
      img.onerror = () => {
        setAvatarError('Failed to load image format.');
        setSavingAvatar(false);
      };
      img.onload = async () => {
        try {
          // Center crop and downscale to 256x256 canvas
          const canvas = document.createElement('canvas');
          const size = 256;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Canvas rendering context unavailable');
          }

          // Center crop calculations
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

          // Generate lightweight JPEG data url (quality 0.88)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

          // Save to backend API
          const res = await apiFetch('/auth/profile/', {
            method: 'PATCH',
            body: JSON.stringify({ profile_picture: dataUrl }),
          });

          const savedPicture = res.profile_picture || dataUrl;
          setProfilePicture(savedPicture);
          setProfile((prev) => (prev ? { ...prev, profile_picture: savedPicture } : prev));
          setAvatarSuccess('Cadet photograph successfully registered into bureau dossier.');
          playRightAnswerSound();

          // Sync localStorage
          const stored = localStorage.getItem('user');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              parsed.profile_picture = savedPicture;
              localStorage.setItem('user', JSON.stringify(parsed));
            } catch {}
          }

          if (onUserUpdated) {
            onUserUpdated({
              first_name: firstName.trim() || profile?.first_name || '',
              last_name: lastName.trim() || profile?.last_name || '',
              profile_picture: savedPicture,
            });
          }
        } catch (err: any) {
          setAvatarError(err.error || 'Failed to update cadet profile picture.');
        } finally {
          setSavingAvatar(false);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Reset to default avatar (the worm detective)
  const handleResetToDefaultAvatar = async () => {
    setAvatarError('');
    setAvatarSuccess('');
    try {
      setSavingAvatar(true);
      playClickSound();

      await apiFetch('/auth/profile/', {
        method: 'PATCH',
        body: JSON.stringify({ profile_picture: '' }),
      });

      setProfilePicture('');
      setProfile((prev) => (prev ? { ...prev, profile_picture: '' } : prev));
      setAvatarSuccess('Avatar restored to Inspector Crit (The Worm Detective mascot).');
      playRightAnswerSound();

      // Sync localStorage
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.profile_picture = '';
          localStorage.setItem('user', JSON.stringify(parsed));
        } catch {}
      }

      if (onUserUpdated) {
        onUserUpdated({
          first_name: firstName.trim() || profile?.first_name || '',
          last_name: lastName.trim() || profile?.last_name || '',
          profile_picture: '',
        });
      }
    } catch (err: any) {
      setAvatarError(err.error || 'Failed to reset profile picture.');
    } finally {
      setSavingAvatar(false);
    }
  };

  // Dispatch Verification Code
  const handleDispatchCode = async () => {
    if (cooldown > 0 || sendingCode) return;
    setClearanceError('');
    setClearanceSuccess('');
    try {
      setSendingCode(true);
      playClickSound();
      const res = await apiFetch('/auth/send-verification/', { method: 'POST' });
      setClearanceSuccess(res.message || 'Verification code dispatched to your cadet email.');
      setCooldown(res.cooldown || 60);
    } catch (err: any) {
      if (err.status === 429) {
        setCooldown(err.retry_after || 60);
        setClearanceError(err.error || 'Please wait before requesting another code.');
      } else {
        setClearanceError(err.error || 'Failed to dispatch verification code.');
      }
    } finally {
      setSendingCode(false);
    }
  };

  // Confirm Verification Code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setClearanceError('');
    setClearanceSuccess('');

    const cleanCode = verificationCode.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setClearanceError('Please enter the 6-digit verification code.');
      return;
    }

    try {
      setVerifying(true);
      playClickSound();
      const res = await apiFetch('/auth/verify-email/', {
        method: 'POST',
        body: JSON.stringify({
          email: profile?.email,
          code: cleanCode,
        }),
      });

      setProfile((prev) => (prev ? { ...prev, account_status: 'active', is_verified: true } : prev));
      setClearanceSuccess('Bureau clearance confirmed! Your account is now fully cleared.');
      setVerificationCode('');
      playVictorySound();

      if (res.tokens?.access) {
        localStorage.setItem('accessToken', res.tokens.access);
      }
    } catch (err: any) {
      setClearanceError(err.error || 'Invalid or expired verification code.');
    } finally {
      setVerifying(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all passphrase fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passphrases do not match.');
      return;
    }

    try {
      setSavingPassword(true);
      playClickSound();
      const res = await apiFetch('/auth/change-password/', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      setPasswordSuccess(res.message || 'Security passphrase successfully updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      playRightAnswerSound();
    } catch (err: any) {
      setPasswordError(err.error || 'Failed to update security passphrase.');
    } finally {
      setSavingPassword(false);
    }
  };

  // Audio adjustments from modal
  const handleThemeVolSlider = (val: number) => {
    setThemeVolState(val);
    setThemeVolume(val);
    if (val > 0 && themeMuted) {
      setThemeMutedState(false);
      setThemeMuted(false);
    }
  };

  const handleToggleThemeMute = () => {
    const next = !themeMuted;
    setThemeMutedState(next);
    setThemeMuted(next);
  };

  const handleSfxVolSlider = (val: number) => {
    setSfxVolState(val);
    setSfxVolume(val);
    if (val > 0 && sfxMuted) {
      setSfxMutedState(false);
      setSfxMuted(false);
    }
  };

  const handleToggleSfxMute = () => {
    const next = !sfxMuted;
    setSfxMutedState(next);
    setSfxMuted(next);
    if (!next) playClickSound(true);
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const strength = passwordStrength(newPassword);
  const isPlayingTheme = !themeMuted && themeVol > 0;

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.dossierContainer} onClick={(e) => e.stopPropagation()}>
        {/* ── Folder Header ── */}
        <header className={styles.folderHeader}>
          <div className={styles.headerLeft}>
            <span className={styles.headerBadge}>Dossier File</span>
            <h2 className={styles.headerTitle}>
              <InspectorCrit height={24} decorative />
              Cadet Personnel Dossier &amp; Bureau Settings
            </h2>
          </div>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className={styles.closeButton}
            aria-label="Close dossier">
            <X size={14} /> Close Dossier
          </button>
        </header>

        {/* ── Sub Navigation Tabs ── */}
        <nav className={styles.subNavBar} aria-label="Settings Tabs">
          <button
            className={`${styles.navTab} ${activeTab === 'account' ? styles.navTabActive : ''}`}
            onClick={() => {
              playClickSound();
              setActiveTab('account');
            }}>
            <User size={14} /> Personnel Record
          </button>

          <button
            className={`${styles.navTab} ${activeTab === 'clearance' ? styles.navTabActive : ''}`}
            onClick={() => {
              playClickSound();
              setActiveTab('clearance');
            }}>
            <ShieldCheck size={14} /> Bureau Clearance
            {profile && !profile.is_verified && (
              <span className="w-2 h-2 rounded-full bg-[var(--amber)] animate-pulse" />
            )}
          </button>

          <button
            className={`${styles.navTab} ${activeTab === 'security' ? styles.navTabActive : ''}`}
            onClick={() => {
              playClickSound();
              setActiveTab('security');
            }}>
            <KeyRound size={14} /> Security Key
          </button>

          <button
            className={`${styles.navTab} ${activeTab === 'broadcast' ? styles.navTabActive : ''}`}
            onClick={() => {
              playClickSound();
              setActiveTab('broadcast');
            }}>
            <Radio size={14} /> Bureau Broadcast &amp; Audio
          </button>
        </nav>

        {/* ── Content Body ── */}
        <main className={styles.contentBody}>
          {/* ================= TAB 1: PERSONNEL RECORD ================= */}
          {activeTab === 'account' && (
            <div>
              {/* Cadet ID Card Badge */}
              <div className={styles.idCardBox}>
                <div className={styles.idCardTop}>
                  <div className={styles.avatarBadge}>
                    {profilePicture && profilePicture !== 'default' ? (
                      <img
                        src={profilePicture}
                        alt="Cadet Photograph"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <InspectorCrit height={52} priority />
                    )}
                  </div>
                  <div className={styles.idCardDetails}>
                    <h3 className={styles.cadetNameTitle}>
                      {profile?.first_name} {profile?.last_name || 'Cadet'}
                    </h3>
                    <div className={styles.cadetMetaRow}>
                      <span className={styles.metaPill}>
                        <InspectorCrit height={12} decorative /> {profile?.rank_title || 'Novice Analyst'}
                      </span>
                      <span className={styles.metaPill}>
                        ID: <strong className="text-[var(--ink)]">CAD-{profile?.id.slice(-6).toUpperCase() || '001'}</strong>
                      </span>
                      {profile?.created_at && (
                        <span className={styles.metaPill}>
                          <Calendar size={11} /> Enlisted: {new Date(profile.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    {profile?.is_verified ? (
                      <span className={`${styles.stampBox} ${styles.stampBoxVerified}`}>
                        [CLEARED: OFFICIAL CADET]
                      </span>
                    ) : (
                      <span className={`${styles.stampBox} ${styles.stampBoxWarning}`}>
                        [RESTRICTED CLEARANCE]
                      </span>
                    )}
                  </div>
                </div>

                {/* Service Record Statistics Bar */}
                <div className={styles.statsGrid}>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Active Streak</span>
                    <span className={`${styles.statValue} flex items-center gap-1 text-[var(--amber)]`}>
                      <Flame size={16} /> {profile?.streak ?? 0} Days
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Experience</span>
                    <span className={`${styles.statValue} flex items-center gap-1 text-[var(--lime)]`}>
                      <Zap size={16} /> {profile?.total_xp ?? 0} XP
                    </span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Bureau Level</span>
                    <span className={styles.statValue}>LVL {profile?.level ?? 1}</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Cases Solved</span>
                    <span className={`${styles.statValue} flex items-center gap-1 text-[var(--crimson)]`}>
                      <CircleCheck size={16} /> {profile?.completed_count ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cadet Avatar Customization Box */}
              <div className={styles.avatarSectionBox}>
                <div className={styles.avatarSectionHeader}>
                  <span className={styles.avatarSectionTitle}>
                    <Camera size={15} /> Cadet Identification Photograph
                  </span>
                  {profilePicture && profilePicture !== 'default' ? (
                    <span className={`${styles.stampBox} ${styles.stampBoxVerified}`}>
                      [CUSTOM CADET PHOTOGRAPH]
                    </span>
                  ) : (
                    <span className={`${styles.stampBox} ${styles.stampBoxWarning}`}>
                      [DEFAULT: THE WORM DETECTIVE]
                    </span>
                  )}
                </div>

                {avatarSuccess && (
                  <div className={styles.alertSuccess}>
                    <Check size={16} /> {avatarSuccess}
                  </div>
                )}
                {avatarError && (
                  <div className={styles.alertError}>
                    <AlertTriangle size={16} /> {avatarError}
                  </div>
                )}

                <div className={styles.avatarCustomizerRow}>
                  {/* Circular Avatar Preview */}
                  <div className={styles.avatarPreviewContainer}>
                    {profilePicture && profilePicture !== 'default' ? (
                      <img
                        src={profilePicture}
                        alt="Cadet Avatar Preview"
                        className={styles.avatarImage}
                      />
                    ) : (
                      <InspectorCrit height={58} priority />
                    )}
                  </div>

                  {/* Actions & Instructions */}
                  <div className={styles.avatarButtonsCol}>
                    <div className={styles.avatarButtonsRow}>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*"
                        className="hidden"
                        aria-label="Upload profile photograph"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={savingAvatar}
                        className={styles.primaryButton}>
                        <Upload size={14} />
                        {savingAvatar ? 'Compressing & Saving...' : 'Upload Custom Photo'}
                      </button>

                      {profilePicture && profilePicture !== 'default' && (
                        <button
                          type="button"
                          onClick={handleResetToDefaultAvatar}
                          disabled={savingAvatar}
                          className={styles.secondaryButton}>
                          <RotateCcw size={13} />
                          Reset to Worm Detective (Default)
                        </button>
                      )}
                    </div>
                    <p className={styles.avatarHelpNotice}>
                      Official Bureau recommendation: The Worm Detective (Inspector Crit) is the default emblem of honor. 
                      You may upload any PNG or JPG photo (automatically scaled and centered to 256×256 px).
                    </p>
                  </div>
                </div>
              </div>

              {/* Editable Name Form */}
              <form onSubmit={handleSaveAccount}>
                {accountSuccess && (
                  <div className={styles.alertSuccess}>
                    <Check size={16} /> {accountSuccess}
                  </div>
                )}
                {accountError && (
                  <div className={styles.alertError}>
                    <AlertTriangle size={16} /> {accountError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={styles.formGroup}>
                    <div className={styles.labelRow}>
                      <label className={styles.label} htmlFor="cadet-first-name">First Name</label>
                    </div>
                    <input
                      id="cadet-first-name"
                      type="text"
                      className={styles.inputField}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Sherlock"
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <div className={styles.labelRow}>
                      <label className={styles.label} htmlFor="cadet-last-name">Last Name</label>
                    </div>
                    <input
                      id="cadet-last-name"
                      type="text"
                      className={styles.inputField}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Holmes"
                      required
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <div className={styles.labelRow}>
                    <label className={styles.label} htmlFor="cadet-email-display">Official Bureau Email Address</label>
                    <span className="text-xs text-[#7a6b57]">Linked to forensic records</span>
                  </div>
                  <input
                    id="cadet-email-display"
                    type="email"
                    className={styles.inputField}
                    value={profile?.email || ''}
                    disabled
                  />
                  <p className={styles.helpText}>
                    To update clearance or verify this email address, navigate to the Bureau Clearance tab.
                  </p>
                </div>

                <div className="flex justify-end mt-4">
                  <button type="submit" className={styles.primaryButton} disabled={savingAccount}>
                    <Save size={14} />
                    {savingAccount ? 'Recording...' : 'Commit Personnel Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================= TAB 2: BUREAU CLEARANCE (EMAIL) ================= */}
          {activeTab === 'clearance' && (
            <div>
              <div className="mb-6">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <h3 className="text-base font-bold text-[var(--ink)] tracking-wider uppercase">
                    Clearance Dispatch &amp; Verification
                  </h3>
                  {profile?.is_verified ? (
                    <span className={`${styles.stampBox} ${styles.stampBoxVerified}`}>
                      [STATUS: CLEARED]
                    </span>
                  ) : (
                    <span className={`${styles.stampBox} ${styles.stampBoxWarning}`}>
                      [STATUS: PENDING]
                    </span>
                  )}
                </div>

                {profile?.is_verified ? (
                  <div className={styles.alertSuccess}>
                    <Check size={18} />
                    <div>
                      <strong>Clearance Confirmed:</strong> Your email ({profile.email}) is officially verified in
                      the bureau archives. All advanced case dossiers and investigations are fully unlocked.
                    </div>
                  </div>
                ) : (
                  <div className={styles.alertWarning}>
                    <AlertTriangle size={18} />
                    <div>
                      <strong>Verification Pending:</strong> Your cadet account requires email clearance. Please
                      confirm the 6-digit clearance code dispatched to <strong>{profile?.email}</strong>.
                    </div>
                  </div>
                )}
              </div>

              {clearanceSuccess && (
                <div className={styles.alertSuccess}>
                  <Check size={16} /> {clearanceSuccess}
                </div>
              )}
              {clearanceError && (
                <div className={styles.alertError}>
                  <AlertTriangle size={16} /> {clearanceError}
                </div>
              )}

              {/* 6-Digit Code Entry */}
              {!profile?.is_verified && (
                <form onSubmit={handleVerifyCode} className={styles.codeEntryBox}>
                  <p className="text-xs font-bold text-[#5a4230] uppercase tracking-wider mb-2 text-center">
                    Enter Monospace 6-Digit Clearance Code
                  </p>
                  <input
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className={styles.codeInput}
                    aria-label="6-digit verification clearance code"
                    autoFocus
                  />
                  <div className="flex items-center gap-3 mt-4">
                    <button
                      type="submit"
                      className={styles.primaryButton}
                      disabled={verifying || verificationCode.length !== 6}>
                      <ShieldCheck size={15} />
                      {verifying ? 'Verifying Code...' : 'Submit Clearance Code'}
                    </button>

                    <button
                      type="button"
                      onClick={handleDispatchCode}
                      className={styles.secondaryButton}
                      disabled={sendingCode || cooldown > 0}>
                      <RotateCcw size={13} className={sendingCode ? 'animate-spin' : ''} />
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Dispatch Fresh Code'}
                    </button>
                  </div>
                </form>
              )}

              {profile?.is_verified && (
                <div className="p-4 bg-[#fbf7ee] border border-[#e3d6bd] rounded text-xs space-y-2">
                  <p className="font-bold uppercase tracking-wider text-[#4e3629]">Cadet Security Protocols:</p>
                  <p className="text-[#6d5b47]">
                    • Email verification protects your field progress, XP ranks, and investigation telemetry logs.
                  </p>
                  <p className="text-[#6d5b47]">
                    • If you ever need to change your primary dispatch address, contact the Senior Bureau Examiner.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: SECURITY KEY (PASSWORD) ================= */}
          {activeTab === 'security' && (
            <div>
              <div className="mb-4">
                <h3 className="text-base font-bold text-[var(--ink)] tracking-wider uppercase mb-1">
                  Modify Security Passphrase
                </h3>
                <p className="text-xs text-[#7a6b57]">
                  Ensure your new passphrase satisfies bureau forensic complexity standards.
                </p>
              </div>

              {passwordSuccess && (
                <div className={styles.alertSuccess}>
                  <Check size={16} /> {passwordSuccess}
                </div>
              )}
              {passwordError && (
                <div className={styles.alertError}>
                  <AlertTriangle size={16} /> {passwordError}
                </div>
              )}

              <form onSubmit={handleChangePassword}>
                {/* Current Password */}
                <div className={styles.formGroup}>
                  <div className={styles.labelRow}>
                    <label className={styles.label} htmlFor="current-pw">Current Security Passphrase</label>
                  </div>
                  <div className="relative">
                    <input
                      id="current-pw"
                      type={showCurrentPw ? 'text' : 'password'}
                      className={styles.inputField}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current passphrase"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw(!showCurrentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a6b57] hover:text-[#2b2016]">
                      {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className={styles.formGroup}>
                  <div className={styles.labelRow}>
                    <label className={styles.label} htmlFor="new-pw">New Security Passphrase</label>
                    <span className="text-xs font-bold text-[#4e3629]">
                      Strength: {STRENGTH_LABELS[strength.level]}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      id="new-pw"
                      type={showNewPw ? 'text' : 'password'}
                      className={styles.inputField}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new strong passphrase"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPw(!showNewPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a6b57] hover:text-[#2b2016]">
                      {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  <div className="w-full h-1.5 bg-[#e3d6bd] rounded-full mt-2 overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-300 ${
                        strength.level === 'strong'
                          ? 'bg-[var(--lime)] w-full'
                          : strength.level === 'medium'
                          ? 'bg-[var(--amber)] w-2/3'
                          : strength.met > 0
                          ? 'bg-[var(--crimson)] w-1/3'
                          : 'w-0'
                      }`}
                    />
                  </div>

                  {/* Policy Checklist */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-2.5">
                    {PASSWORD_RULES.map((rule) => {
                      const met = rule.test(newPassword);
                      return (
                        <div
                          key={rule.id}
                          className={`flex items-center gap-1.5 text-[11px] font-mono ${
                            met ? 'text-[var(--lime-bright)] font-bold' : 'text-[#8b7a67]'
                          }`}>
                          <span
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                              met ? 'bg-[var(--lime)] text-white' : 'bg-[#e3d6bd] text-[#7a6b57]'
                            }`}>
                            ✓
                          </span>
                          {rule.label}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className={styles.formGroup}>
                  <div className={styles.labelRow}>
                    <label className={styles.label} htmlFor="confirm-pw">Confirm New Security Passphrase</label>
                  </div>
                  <div className="relative">
                    <input
                      id="confirm-pw"
                      type={showConfirmPw ? 'text' : 'password'}
                      className={styles.inputField}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new passphrase"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPw(!showConfirmPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a6b57] hover:text-[#2b2016]">
                      {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-[var(--crimson)] font-bold mt-1">Passphrases do not match.</p>
                  )}
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={savingPassword || !newPassword || newPassword !== confirmPassword}>
                    <Lock size={14} />
                    {savingPassword ? 'Updating...' : 'Update Passphrase'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ================= TAB 4: BUREAU BROADCAST (THEME SONG) ================= */}
          {activeTab === 'broadcast' && (
            <div className="space-y-6">
              {/* Gramophone / Turntable Reel Player */}
              <div className={styles.audioDeckContainer}>
                <div className={styles.deckHeader}>
                  <div>
                    <span className="text-[11px] font-bold text-[#7a6b57] uppercase tracking-wider block">
                      Bureau Audio Dispatch System
                    </span>
                    <h3 className="text-base font-bold text-[var(--ink)] tracking-wide">
                      Gramophone &amp; Atmospheric Broadcast
                    </h3>
                  </div>
                  <div>
                    {isPlayingTheme ? (
                      <span className={`${styles.stampBox} ${styles.stampBoxVerified}`}>
                        [BROADCAST: PLAYING LOOPED]
                      </span>
                    ) : (
                      <span className={`${styles.stampBox} ${styles.stampBoxWarning}`}>
                        [BROADCAST: MUTED]
                      </span>
                    )}
                  </div>
                </div>

                {/* Turntable + Track Information */}
                <div className={styles.turntableSection}>
                  {/* Vinyl disc with spinning animation */}
                  <div className={`${styles.vinylDisc} ${isPlayingTheme ? styles.vinylSpinning : ''}`}>
                    <div className={styles.vinylLabel}>
                      <div className={styles.vinylHole} />
                    </div>
                  </div>

                  <div className={styles.trackInfoBox}>
                    <h4 className={styles.trackTitle}>Critica Theme Song</h4>
                    <p className={styles.trackArtist}>Bureau Forensic Investigation Department Soundtrack</p>

                    {/* Animated Equalizer Wave */}
                    <div className={styles.equalizerBars}>
                      <span className={`${styles.eqBar} ${isPlayingTheme ? styles.eqBarActive1 : ''}`} />
                      <span className={`${styles.eqBar} ${isPlayingTheme ? styles.eqBarActive2 : ''}`} />
                      <span className={`${styles.eqBar} ${isPlayingTheme ? styles.eqBarActive3 : ''}`} />
                      <span className={`${styles.eqBar} ${isPlayingTheme ? styles.eqBarActive4 : ''}`} />
                      <span className={`${styles.eqBar} ${isPlayingTheme ? styles.eqBarActive5 : ''}`} />
                    </div>
                  </div>

                  {/* Play / Mute Toggle Button */}
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        playClickSound();
                        handleToggleThemeMute();
                      }}
                      className={styles.primaryButton}>
                      {isPlayingTheme ? <VolumeX size={15} /> : <Volume2 size={15} />}
                      {isPlayingTheme ? 'Mute Theme Song' : 'Unmute & Play Theme'}
                    </button>
                  </div>
                </div>

                {/* Theme Music Volume Slider */}
                <div className={styles.audioSliderRow}>
                  <div className={styles.sliderHeader}>
                    <span>Theme Song Volume</span>
                    <span className={styles.volumePercent}>{Math.round(themeVol * 100)}%</span>
                  </div>
                  <div className={styles.sliderControls}>
                    <Volume1 size={16} className="text-[#7a6b57]" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={themeVol}
                      onChange={(e) => handleThemeVolSlider(parseFloat(e.target.value))}
                      className={styles.rangeInput}
                      aria-label="Theme song volume slider"
                    />
                    <Volume2 size={16} className="text-[#2b2016]" />
                  </div>
                </div>
              </div>

              {/* Sound Effects Controls & Audio Test Bench */}
              <div className={styles.audioDeckContainer}>
                <div className={styles.deckHeader}>
                  <div>
                    <span className="text-[11px] font-bold text-[#7a6b57] uppercase tracking-wider block">
                      Investigation Feedback
                    </span>
                    <h4 className="text-sm font-bold text-[var(--ink)] tracking-wide">
                      Bureau Sound Effects (SFX)
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound(true);
                      handleToggleSfxMute();
                    }}
                    className={styles.secondaryButton}>
                    {sfxMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                    {sfxMuted ? 'Unmute SFX' : 'Mute SFX'}
                  </button>
                </div>

                {/* SFX Volume Slider */}
                <div className={styles.audioSliderRow}>
                  <div className={styles.sliderHeader}>
                    <span>SFX Master Volume</span>
                    <span className={styles.volumePercent}>{Math.round(sfxVol * 100)}%</span>
                  </div>
                  <div className={styles.sliderControls}>
                    <MousePointerClick size={16} className="text-[#7a6b57]" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={sfxVol}
                      onChange={(e) => handleSfxVolSlider(parseFloat(e.target.value))}
                      className={styles.rangeInput}
                      aria-label="Sound effects volume slider"
                    />
                    <Volume2 size={16} className="text-[#2b2016]" />
                  </div>
                </div>

                {/* Audio Test Bench */}
                <div>
                  <span className="text-[11px] font-bold text-[#7a6b57] uppercase tracking-wider block mb-2">
                    Audio Calibration Bench (Click to sample sounds):
                  </span>
                  <div className={styles.sfxTestRow}>
                    <button
                      type="button"
                      onClick={() => playClickSound(true)}
                      className={styles.sfxChipButton}>
                      <MousePointerClick size={12} /> Test Select Click
                    </button>

                    <button
                      type="button"
                      onClick={() => playRightAnswerSound(true)}
                      className={styles.sfxChipButton}>
                      <Sparkles size={12} className="text-[var(--lime)]" /> Test Clearance Chime
                    </button>

                    <button
                      type="button"
                      onClick={() => playVictorySound(true)}
                      className={styles.sfxChipButton}>
                      <Zap size={12} className="text-[var(--amber)]" /> Test Victory Fanfare
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>,
    document.body
  );
}
