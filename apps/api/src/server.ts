import http from 'http';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { initSocket } from './socket/socket.server.js';
import { ENV } from './config/env.js';

async function bootstrap() {
  // 1. Connect Database
  await connectDB();

  // 2. Setup Express & HTTP Server
  const app = createApp();
  const server = http.createServer(app);

  // 3. Initialize Realtime Socket.IO
  initSocket(server);

  const PORT = Number(ENV.PORT) || 5000;
  server.listen(PORT, () => {
    console.log(`=============================================`);
    console.log(`🚀 MasiCanteen API Server is running on port ${PORT}`);
    console.log(`🌐 Health endpoint: http://localhost:${PORT}/health`);
    console.log(`⚡ Realtime Socket.IO initialized`);
    console.log(`=============================================`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
