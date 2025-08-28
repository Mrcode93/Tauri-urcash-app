import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Ultra-minimal Vite configuration for smallest possible bundle size
export default defineConfig({
  server: {
    host: true,
    port: 3000,
  },
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    __DEV__: false,
    'process.env.NODE_ENV': '"production"',
  },
  css: {
    devSourcemap: false,
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
    chunkSizeWarningLimit: 200,
    assetsInlineLimit: 1024, // Reduced from 2048 to inline fewer assets
    minify: 'terser',
    sourcemap: false,
    target: 'es2015',
    cssCodeSplit: true,
    reportCompressedSize: false, // Disable for faster builds
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn', 'console.error'],
        passes: 3, // Increased passes for better compression
        toplevel: true,
        unsafe: true,
        unsafe_arrows: true,
        unsafe_comps: true,
        unsafe_math: true,
        unsafe_methods: true,
        unsafe_proto: true,
        unused: true,
        collapse_vars: true,
        reduce_vars: true,
        sequences: true,
        conditionals: true,
        booleans: true,
        loops: true,
        hoist_funs: true,
        hoist_props: true,
        hoist_vars: true,
        if_return: true,
        join_vars: true,
        side_effects: false,
        dead_code: true,
        evaluate: true,
        properties: true,
        inline: 3,
        keep_infinity: true,
        reduce_funcs: true,
        switches: true,
        typeofs: true,
      },
      mangle: {
        toplevel: true,
        safari10: true,
        properties: {
          regex: /^_/
        }
      },
      format: {
        comments: false,
        semicolons: false,
        beautify: false,
        preserve_annotations: false,
      },
    },
    rollupOptions: {
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
        unknownGlobalSideEffects: false
      },
      output: {
        manualChunks: {
          // Core libraries - consolidated for better compression
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-state': ['@reduxjs/toolkit', 'react-redux', '@tanstack/react-query'],
          'vendor-http': ['axios'],
          'vendor-ui': ['lucide-react', 'clsx', 'class-variance-authority', 'tailwind-merge'],
          
          // Large libraries that benefit from separate chunks
          'vendor-charts': ['chart.js', 'react-chartjs-2', 'recharts'],
          'vendor-motion': ['framer-motion'],
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
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
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          
          // Specialized features - only split if they're large
          'vendor-specialized': [
            // Only keep libraries that are present and used
          ]
        },
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name;
          if (!name) return 'assets/[hash][extname]';
          
          const info = name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/img/[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `assets/css/[hash][extname]`;
          }
          return `assets/[hash][extname]`;
        },
        chunkFileNames: "assets/js/[hash].js",
        entryFileNames: "assets/js/[hash].js",
        compact: true,
      },
      external: [], // Don't externalize anything for self-contained build
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
    ],
    exclude: [
      // Exclude heavy dependencies from pre-bundling to enable better tree-shaking
      'chart.js',
      'recharts',
      'framer-motion',
      'html5-qrcode',
      'react-barcode',
      'react-beautiful-dnd',
      'react-simple-keyboard',
      'simple-keyboard',
      'react-to-print',
    ],
  },
  esbuild: {
    drop: ['console', 'debugger'],
    legalComments: 'none',
    treeShaking: true,
  },
});
