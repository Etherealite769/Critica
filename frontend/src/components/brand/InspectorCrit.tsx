import Image from 'next/image';

/** Single source for the Inspector Crit mascot artwork (public/images). */
export const INSPECTOR_CRIT_SRC = '/images/inspector-crit.png';

// Intrinsic artwork ratio (width / height) from inspector-crit.svg (198.3 × 230.5)
const ASPECT = 198.31761 / 230.54849;

interface InspectorCritProps {
  /** Rendered height in px; width follows the artwork's aspect ratio. */
  height: number;
  className?: string;
  priority?: boolean;
  /** Purely decorative use (e.g. avatar beside a visible name): hides it from screen readers. */
  decorative?: boolean;
}

/** Inspector Crit mascot — transparent PNG rendered without distortion. */
export default function InspectorCrit({ height, className, priority, decorative }: InspectorCritProps) {
  return (
    <Image
      src={INSPECTOR_CRIT_SRC}
      alt={decorative ? '' : 'Inspector Crit'}
      width={Math.round(height * ASPECT)}
      height={height}
      className={className}
      style={{ objectFit: 'contain', width: 'auto', height: height }}
      priority={priority}
    />
  );
}
