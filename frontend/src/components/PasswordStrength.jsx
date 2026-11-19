import { IconCircleCheck } from '@tabler/icons-react';
import { passwordStrength, STRENGTH_WORDS } from '../lib/passwordStrength';

const RULE = 'At least 8 characters, with a number.';

/** The four bars under a new-password field (decorative; StrengthHint says the same in words). */
export function StrengthMeter({ password }) {
  const score = passwordStrength(password);
  return (
    <div className="meter" aria-hidden="true">
      {[1, 2, 3, 4].map((step) => (
        <span key={step} className={score >= step ? 'on' : undefined} />
      ))}
    </div>
  );
}

/** Goes in TextField's hint, so it is linked to the input with aria-describedby. */
export function StrengthHint({ password }) {
  const score = passwordStrength(password);
  if (score === 4) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-mint-ink">
        <IconCircleCheck size={18} aria-hidden="true" /> Strong password
      </span>
    );
  }
  return score === 0 ? RULE : `${STRENGTH_WORDS[score]}. ${RULE}`;
}
