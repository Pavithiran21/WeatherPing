/**
 * Writes a git-ignored env file for a test run, copied from the project's .env with:
 *   - MONGODB_URI pointing at weatherping_test (same cluster and credentials)
 *   - the settings below for that target
 *   - a brand-new Ethereal account, so the run's (or demo's) inbox starts empty
 *
 * Demo accounts need no env file of their own: their Ethereal inbox is DEMO_SMTP_* in backend/.env.
 *
 * Usage: npm run env:test   (scripts/e2e.ps1 runs it before every Playwright run)
 */
const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const { withDatabaseName } = require('../src/utils/mongoUri');
const { setEnvValue, writeNewEtherealAccount } = require('./new-ethereal');
const { TEST_DATABASES } = require('./seed-helpers');

const projectRoot = path.resolve(__dirname, '../..');

const TARGETS = {
  test: {
    fileName: '.env.test',
    databaseName: 'weatherping_test',
    values: {
      NODE_ENV: 'test',
      RATE_LIMITS_ENABLED: 'false',
      WEATHER_TIMEOUT_MS: '1000',
      DEMO_MODE: 'true',
      FRONTEND_URL: 'http://127.0.0.1:5273',
      // The scheduler is parked on 1 January, so only the tests' own evaluator runs happen.
      EVALUATOR_CRON: '0 0 1 1 *',
      // Open-Meteo is replaced by e2e/mocks/open-meteo-stub.js: no internet and no quota needed.
      OPEN_METEO_FORECAST_URL: 'http://127.0.0.1:8090/v1/forecast',
      OPEN_METEO_AIR_QUALITY_URL: 'http://127.0.0.1:8090/v1/air-quality',
      OPEN_METEO_GEOCODING_URL: 'http://127.0.0.1:8090/v1/search',
    },
  },
};

async function main() {
  const targetName = process.argv[2];
  const target = TARGETS[targetName];
  if (!target) {
    throw new Error(`Usage: node scripts/make-env.js <${Object.keys(TARGETS).join('|')}>`);
  }
  if (targetName === 'test' && !TEST_DATABASES.includes(target.databaseName)) {
    throw new Error(`The test database must be ${TEST_DATABASES.join(' or ')}, not "${target.databaseName}".`);
  }

  const sourceFile = path.join(projectRoot, 'backend', '.env');
  if (!fs.existsSync(sourceFile)) {
    throw new Error(`No .env at ${sourceFile}. See README.md.`);
  }

  let text = fs.readFileSync(sourceFile, 'utf8');
  const source = parseEnv(text);
  text = setEnvValue(text, 'MONGODB_URI', withDatabaseName(source.MONGODB_URI ?? '', target.databaseName));
  for (const [key, value] of Object.entries(target.values)) {
    text = setEnvValue(text, key, value);
  }

  const targetFile = path.join(projectRoot, target.fileName);
  fs.writeFileSync(targetFile, text);
  const etherealUser = await writeNewEtherealAccount(targetFile);
  // A second new inbox for the demo addresses (@demo.weatherping.test), so tests can tell which inbox got what.
  await writeNewEtherealAccount(targetFile, 'DEMO_SMTP');

  const newSecret = target.values.JWT_SECRET ? ', new login secret' : '';
  console.log(`Wrote ${target.fileName}: database ${target.databaseName}${newSecret}, new Ethereal inbox ${etherealUser}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
