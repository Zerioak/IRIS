import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'api-handler',
        configureServer(server) {
          // Internal state for dev mode
          const state = {
            memories: [{ id: '1', content: 'IRIS system initialized.', timestamp: new Date().toISOString() }],
            tasks: [] as any[]
          };

          server.middlewares.use((req, res, next) => {
            if (req.url?.startsWith('/api/')) {
              res.setHeader('Content-Type', 'application/json');
              
              if (req.url.startsWith('/api/memories')) {
                if (req.method === 'GET') {
                  return res.end(JSON.stringify(state.memories));
                }
                if (req.method === 'POST') {
                  let body = '';
                  req.on('data', chunk => body += chunk);
                  req.on('end', () => {
                    const { content } = JSON.parse(body);
                    const newMem = { id: Date.now().toString(), content, timestamp: new Date().toISOString() };
                    state.memories.push(newMem);
                    res.end(JSON.stringify(newMem));
                  });
                  return;
                }
              }

              if (req.url.startsWith('/api/tasks')) {
                if (req.method === 'GET') {
                  return res.end(JSON.stringify(state.tasks));
                }
                if (req.method === 'POST') {
                  let body = '';
                  req.on('data', chunk => body += chunk);
                  req.on('end', () => {
                    const task = JSON.parse(body);
                    const newTask = { ...task, id: Date.now().toString(), createdAt: new Date().toISOString() };
                    state.tasks.push(newTask);
                    res.end(JSON.stringify(newTask));
                  });
                  return;
                }
              }
            }
            next();
          });
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'framer-motion'],
            three: ['three', '@react-three/fiber', '@react-three/drei'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
