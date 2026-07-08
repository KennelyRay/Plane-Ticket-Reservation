import { createServer } from 'http';
import app from './app';
import { env } from './config/env';
import { initSocket } from './sockets';
import { prisma } from './config/db';

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(env.port, () => {
  console.log(`🚀 Server running on http://localhost:${env.port} [${env.nodeEnv}]`);
});

const shutdown = async () => {
  console.log('Shutting down...');
  httpServer.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
