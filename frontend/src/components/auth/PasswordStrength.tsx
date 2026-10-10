'use client';

import { Check, ShieldAlert, ShieldCheck, ShieldHalf } from 'lucide-react';
import { PASSWORD_RULES, STRENGTH_LABELS, passwordStrength } from './passwordPolicy';
import styles from './auth.module.css';

const LEVEL_ICON = { weak: ShieldAlert, medium: ShieldHalf, strong: ShieldCheck };

/** Strength bar (Unsecured / Guarded / Vault-Locked) + live rule checklist. */
export default function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const { met, level } = passwordStrength(password);
  const LevelIcon = LEVEL_ICON[level];

  return (
    <div className={styles.strength} aria-live="polite">
      <div className={styles.strengthRow}>
        <div className={styles.strengthBar} aria-hidden>
          <div
            className={`${styles.strengthFill} ${styles[`strength_${level}`]}`}
            style={{ width: `${Math.max(12, (met / PASSWORD_RULES.length) * 100)}%` }}
          />
        </div>
        <span className={`${styles.strengthLabel} ${styles[`strengthText_${level}`]}`}>
          <LevelIcon size={12} aria-hidden /> {STRENGTH_LABELS[level]}
        </span>
      </div>
      <ul className={styles.rules} aria-label="Password requirements">
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <li key={rule.id} className={`${styles.rule} ${ok ? styles.ruleMet : ''}`}>
              <Check size={10} aria-hidden className={styles.ruleTick} />
              {rule.label}
              <span className="sr-only">{ok ? ' — met' : ' — not met'}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
