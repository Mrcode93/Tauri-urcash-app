import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === "development";
  const isProd = mode === "production";

  return {
    server: {
      host: true,
      port: 3000,
    },
    base: "./",
    plugins: [
      react(),
      isDev && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      __DEV__: isDev,
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    css: {
      devSourcemap: isDev,
    },
    build: {
      outDir: "dist",
      assetsDir: "assets",
      emptyOutDir: true,
      chunkSizeWarningLimit: 350,
      assetsInlineLimit: 4096,
      minify: isProd ? 'terser' : false,
      sourcemap: false,
      target: 'es2015',
      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: isProd,
          pure_funcs: isProd ? ['console.log', 'console.info', 'console.debug'] : [],
          passes: 1,
          toplevel: false,
          unsafe: false,
        },
        mangle: {
          toplevel: false,
          safari10: true,
        },
        format: {
          comments: false,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            // Core libraries
            'react-vendor': ['react', 'react-dom'],
            'router': ['react-router-dom'],
            'redux': ['@reduxjs/toolkit', 'react-redux'],
            
            // Heavy libraries - Separate for better caching
            'charts': ['chart.js', 'react-chartjs-2', 'recharts'],
            'motion': ['framer-motion'],
            
            // UI Framework
            'radix-ui': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-slot',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-tabs',
              '@radix-ui/react-select',
              '@radix-ui/react-popover',
              '@radix-ui/react-alert-dialog',
              '@radix-ui/react-accordion',
              '@radix-ui/react-checkbox',
              '@radix-ui/react-collapsible',
              '@radix-ui/react-label',
              '@radix-ui/react-progress',
              '@radix-ui/react-scroll-area',
              '@radix-ui/react-separator',
              '@radix-ui/react-slider',
              '@radix-ui/react-switch',
              '@radix-ui/react-toggle',
            ],
            
            // Forms and validation
            'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
            
            // Utilities
            'utils': ['clsx', 'class-variance-authority', 'tailwind-merge', 'date-fns'],
            'icons': ['lucide-react'],
            'http': ['axios'],
            'query': ['@tanstack/react-query'],
            
            // UI Components
            'ui-components': [
              // (leave empty or only include used, present libraries)
            ],
            
            // Specialized features
            'specialized': [
              // Only keep libraries that are present and used
            ],
          },
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name;
            if (!name) return 'assets/[name]-[hash][extname]';
            
            const info = name.split('.');
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return `assets/images/[name]-[hash][extname]`;
            }
            if (/css/i.test(ext)) {
              return `assets/css/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
          chunkFileNames: "assets/js/[name]-[hash].js",
          entryFileNames: "assets/js/[name]-[hash].js",
        },
      },
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@reduxjs/toolkit',
        'react-redux',
        'axios',
        'clsx',
        'tailwind-merge',
      ],
    },
  };
});