import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    dts({
      // (опционально) включаем только файлы из src
      include: ['src'],
      // (опционально) можно указать exclude
      exclude: ['src/**/*.test.ts', 'src/**/*.stories.ts'],
      // Генерируем один файл с типами (rollupTypes: true по умолчанию)
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],               // только ES-модули
      fileName: 'index',
    },
    rollupOptions: {
      // Исключаем React из бандла
      external: ['react', 'react-dom'],
      output: {
        // Переименовываем выходной CSS-файл в dist/styles/global.css
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') {
            return 'styles/global.css';
          }
          return assetInfo.name;
        },
      },
    },
    // Разделяем CSS в отдельный файл (иначе он будет встроен в JS)
    cssCodeSplit: true,
    sourcemap: true, // опционально
    // Минимизация включена по умолчанию для production
  },
});