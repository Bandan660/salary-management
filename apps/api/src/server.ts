import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

// A proxy in front of us (the Next.js rewrite, a load balancer) reuses pooled
// connections. With Node's 5s default the server could close a socket just as the
// proxy reuses it, surfacing as ECONNRESET / 502s. Keep sockets alive longer than
// any upstream idle timeout; headersTimeout must exceed keepAliveTimeout.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

// Graceful shutdown: finish in-flight requests before exiting (important on hosting platforms).
const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down...`);
  server.close(() => process.exit(0));
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
