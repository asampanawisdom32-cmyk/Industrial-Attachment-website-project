/**
 * Cluster entry point — scales the application across all available CPU cores.
 * 
 * Usage:
 *   node cluster.js          # Production: runs one worker per CPU core
 *   NODE_ENV=development node cluster.js   # Dev: single worker
 * 
 * For more advanced process management, use PM2:
 *   npx pm2 start app.js -i max
 *   npx pm2 monit
 */
const cluster = require('cluster');
const os = require('os');

// Use only 1 worker in development mode, all cores in production
const WORKERS = process.env.NODE_ENV === 'production'
  ? parseInt(process.env.CLUSTER_WORKERS || os.cpus().length, 10)
  : 1;

if (cluster.isPrimary && WORKERS > 1) {
  console.log(`Primary process ${process.pid} is running`);
  console.log(`Spawning ${WORKERS} workers...`);

  for (let i = 0; i < WORKERS; i++) {
    cluster.fork();
  }

  // Restart a worker if it crashes
  cluster.on('exit', (worker, code, signal) => {
    console.warn(`Worker ${worker.process.pid} died (code: ${code}, signal: ${signal}). Restarting...`);
    cluster.fork();
  });

  console.log('Cluster started successfully.');
} else {
  // Worker (or single process) — start the application
  // The worker MUST call app.listen() to accept connections.
  // In cluster mode, the OS automatically distributes connections
  // to workers listening on the same port.
  const app = require('./app');
  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, () => {
    console.log(`Worker ${process.pid} started on port ${PORT}`);
  });

  // Set timeout on the worker's server instance
  const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '30000', 10);
  server.timeout = TIMEOUT;
}
