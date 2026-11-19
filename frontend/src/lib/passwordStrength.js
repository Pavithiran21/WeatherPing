// The 4-step meter under new-password fields. It mostly rewards length, which matters
// most; the rule itself (8+ characters with a number) is the same as the backend's.

export function passwordStrength(password) {
  if (!password) {
    return 0;
  }
  if (password.length < 8 || !/\d/.test(password)) {
    return 1;
  }
  let score = 2;
  if (password.length >= 9) score += 1;
  if (password.length >= 12) score += 1;
  return score;
}

export const STRENGTH_WORDS = ['', 'Too weak', 'OK', 'Good', 'Strong password'];
