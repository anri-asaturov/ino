import { Schema, ValidateEnv } from '@julr/vite-plugin-validate-env';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type UserConfig } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Keep plugin-react/OXC off built workspace package JS. With Vite 8, pnpm-linked
// @ino/* dist files resolve outside node_modules and can hit tsconfig lookup errors.
const reactPluginInclude = /\.tsx?$/;

export default defineConfig(() => {
  const isProduction = process.env.VITE_INO_ENV === 'production';
  const isLocal = process.env.VITE_INO_ENV === 'local';

  const config: UserConfig = {
    appType: 'spa',
    build: {
      sourcemap: isProduction ? 'hidden' : true, // Hidden in prod, visible in dev
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html')
        }
      }
    },
    server: {
      open: true,
      port: 3008,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:3007',
          rewrite: (path) => {
            return path.replace(/^\/api/, '');
          },
          xfwd: isLocal,
          changeOrigin: true
        }
      }
    },
    plugins: [
      ValidateEnv({
        validator: 'builtin',
        schema: {
          VITE_INO_ENV: Schema.enum(['local', 'development', 'production'])
        }
      }),
      react({ include: reactPluginInclude }),
      tailwindcss()
    ],

    resolve: {
      alias: {
        '@web': resolve(__dirname, './src')
      }
    }
  };
  return config;
});
