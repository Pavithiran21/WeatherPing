const { createApp } = require('./app');
const { env } = require('./config/env');
const { connectDb, disconnectDb } = require('./db/mongoose');
const { startEvaluatorSchedule } = require('./modules/evaluator/scheduler');
const { logger } = require('./utils/logger');

async function main() {
  await connectDb();

  const app = createApp();
  const server = app.listen(env.PORT, (error) => {
    if (error) {
      logger.fatal({ err: error }, 'Could not start the HTTP server');
      process.exit(1);
    }
    logger.info({ port: env.PORT }, 'WeatherPing API listening');
  });

  // Tests trigger the evaluator themselves, so the schedule runs everywhere else.
  const evaluatorTask = env.NODE_ENV === 'test' ? null : startEvaluatorSchedule();

  const shutdown = (signal) => {
    logger.info({ signal }, 'Shutting down');
    evaluatorTask?.stop();
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  logger.fatal({ err: error }, 'WeatherPing API failed to start');
  process.exit(1);
});
