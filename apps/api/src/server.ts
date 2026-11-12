import { app } from './app';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/db';
import { logger } from './utils/logger';
import cron from 'node-cron';
import { processEmailQueue } from './services/emailQueue.service';

async function main() {
  await connectDB();

  cron.schedule('*/5 * * * *', () => {
  void processEmailQueue().catch((error) => {
    logger.error({ error }, 'Email queue worker failed');
  });
});

  const server = app.listen(env.PORT, () => {
    logger.info(`API running on http://localhost:${env.PORT}/api/v1`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start');
  process.exit(1);
});