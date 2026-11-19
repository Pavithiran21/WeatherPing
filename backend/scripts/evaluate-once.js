/**
 * Runs the alert evaluator once and prints the run summary.
 * Usage: npm run job:evaluate
 * Running it several times, or in two terminals at once, sends no duplicate emails.
 */
const { connectDb, disconnectDb } = require('../src/db/mongoose');
// Loading the evaluator registers every model it uses, so connectDb builds their indexes.
const { runEvaluation } = require('../src/modules/evaluator/evaluator.service');

async function main() {
  await connectDb();
  try {
    const summary = await runEvaluation({ trigger: 'script' });
    console.log(JSON.stringify(summary));
  } finally {
    await disconnectDb();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
