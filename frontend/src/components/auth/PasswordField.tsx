'use client';

import { Eye, EyeOff } from 'lucide-react';
import styles from './auth.module.css';

interface PasswordFieldProps {
  id: string;
  label: string;
  name?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  visible: boolean;
  onToggleVisible: () => void;
  autoComplete?: string;
  placeholder?: string;
}

/** Password input with an eye toggle on the right that switches password ⇄ text. */
export default function PasswordField({
  id, label, name, value, onChange, visible, onToggleVisible, autoComplete, placeholder,
}: PasswordFieldProps) {
  return (
    <div className={styles.field}>
      <label className={styles.lbl} htmlFor={id}>{label}</label>
      <div className={styles.pwWrap}>
        <input
          id={id}
          className={styles.inp}
          type={visible ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
        />
        <button
          type="button"
          className={styles.pwToggle}
          onClick={onToggleVisible}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          aria-controls={id}
          title={visible ? 'Hide' : 'Show'}
        >
          {visible ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        </button>
      </div>
    </div>
  );
}
