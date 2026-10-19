import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn, type ChildProcess } from 'child_process';
import net from 'net';

/**
 * Self-healing plugin that ensures the Express backend server (server/index.ts)
 * is running whenever the Vite dev server is active.
 *
 * If the backend is already running (e.g. via concurrently or standalone),
 * it leaves it untouched. If not, it automatically spawns the process and
 * terminates it cleanly when Vite exits.
 */
function autoBackendPlugin(): Plugin {
  let backendProcess: ChildProcess | null = null;

  const isPortInUse = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const client = new net.Socket();
      client.setTimeout(300);
      client.once('connect', () => {
        client.destroy();
        resolve(true);
      });
      client.once('error', () => {
        client.destroy();
        resolve(false);
      });
      client.once('timeout', () => {
        client.destroy();
        resolve(false);
      });
      client.connect(port, '127.0.0.1');
    });
  };

  return {
    name: 'auto-backend-plugin',
    apply: 'serve',
    async configureServer(server) {
      const port = 3001;
      const inUse = await isPortInUse(port);
      if (inUse) {
        return;
      }

      console.log('\x1b[36m[vite-auto-backend]\x1b[0m Starting ResumeFit API server on port 3001...');
      backendProcess = spawn('node', ['--watch', '--import', 'tsx', 'server/index.ts'], {
        stdio: 'inherit',
        shell: true,
      });

      backendProcess.on('error', (err) => {
        console.error('\x1b[31m[vite-auto-backend]\x1b[0m Failed to start backend server:', err);
      });

      const cleanup = () => {
        if (backendProcess && !backendProcess.killed) {
          try {
            if (process.platform === 'win32' && backendProcess.pid) {
              spawn('taskkill', ['/pid', backendProcess.pid.toString(), '/f', '/t'], { shell: true });
            } else {
              backendProcess.kill('SIGTERM');
            }
          } catch (_) {}
          backendProcess = null;
        }
      };

      server.httpServer?.on('close', cleanup);
      process.on('exit', cleanup);
      process.on('SIGINT', () => {
        cleanup();
        process.exit();
      });
      process.on('SIGTERM', () => {
        cleanup();
        process.exit();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), autoBackendPlugin()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (res && 'writeHead' in res && !(res as any).headersSent) {
              (res as any).writeHead(503, { 'Content-Type': 'application/json' });
              (res as any).end(
                JSON.stringify({
                  error: 'Backend API server is starting up or temporarily unavailable. Please retry shortly.',
                  code: 'BACKEND_STARTING',
                })
              );
            }
          });
        },
      },
    },
  },
});
