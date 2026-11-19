/**
 * Creates a brand-new Ethereal test account (fake SMTP: accepts mail, never delivers it)
 * and writes its SMTP settings into the project's .env (or ENV_FILE).
 * The same user name and password log in to the web inbox at https://ethereal.email/login.
 *
 * Usage: npm run ethereal:new
 * Also used by make-env.js, so every test run gets an empty inbox.
 */
const fs = require('node:fs');
const path = require('node:path');

/**
 * The same call Nodemailer's createTestAccount() makes, made here on every call: Nodemailer keeps the first
 * account it creates for the life of the process, so asking it twice (SMTP_* and DEMO_SMTP_*) gives one inbox.
 */
async function createEtherealAccount() {
  const response = await fetch('https://api.nodemailer.com/user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestor: 'weatherping', version: '1.0.0' }),
  });
  const account = await response.json();
  if (!response.ok || account.status !== 'success') {
    throw new Error(`Ethereal did not create an account: ${account.error ?? response.status}`);
  }
  return account;
}

function setEnvValue(text, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  return pattern.test(text) ? text.replace(pattern, line) : `${text.trimEnd()}\n${line}\n`;
}

/**
 * Creates the account, writes it into envFile and returns its user name.
 * prefix 'SMTP' replaces the main sender; 'DEMO_SMTP' fills the demo inbox and leaves
 * the main sender (Brevo) alone.
 */
async function writeNewEtherealAccount(envFile, prefix = 'SMTP') {
  if (!fs.existsSync(envFile)) {
    throw new Error(`No env file at ${envFile}`);
  }

  const account = await createEtherealAccount();

  let text = fs.readFileSync(envFile, 'utf8');
  text = setEnvValue(text, `${prefix}_HOST`, account.smtp.host);
  text = setEnvValue(text, `${prefix}_PORT`, String(account.smtp.port));
  text = setEnvValue(text, `${prefix}_USER`, account.user);
  text = setEnvValue(text, `${prefix}_PASS`, account.pass);
  if (prefix === 'DEMO_SMTP') {
    text = setEnvValue(text, 'DEMO_SMTP_FROM', '"WeatherPing Demo <alerts@demo.weatherping.test>"');
  }
  fs.writeFileSync(envFile, text);

  return account.user;
}

async function main() {
  const envFile = process.env.ENV_FILE ?? path.resolve(__dirname, '../.env');
  // npm run ethereal:new -- --demo   writes the demo inbox (DEMO_SMTP_*) instead of SMTP_*
  const prefix = process.argv.includes('--demo') ? 'DEMO_SMTP' : 'SMTP';
  const user = await writeNewEtherealAccount(envFile, prefix);

  // The password stays in the env file only.
  console.log(`New Ethereal inbox saved to ${path.basename(envFile)} (${prefix}_*).`);
  console.log(`Web inbox: https://ethereal.email/login (user ${user}, password = ${prefix}_PASS)`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { setEnvValue, writeNewEtherealAccount };
