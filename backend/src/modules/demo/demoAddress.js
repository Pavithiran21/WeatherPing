// Demo accounts all use this reserved .test domain, so no real person can own such an address.
const DEMO_EMAIL_DOMAIN = 'demo.weatherping.test';

function isDemoAddress(email) {
  return typeof email === 'string' && email.toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`);
}

module.exports = { DEMO_EMAIL_DOMAIN, isDemoAddress };
