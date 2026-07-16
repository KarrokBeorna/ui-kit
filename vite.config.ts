import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default defineConfig({
  plugins: [
    react(),
    dts({ insertTypesEntry: true }),
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'UIKit',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      plugins: [
        nodeResolve({
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        }),
        commonjs({
          include: /node_modules/,
          transformMixedEsModules: true,
        }),
      ],
      output: {
        format: 'es',
        exports: 'named',
        interop: 'auto',         
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});