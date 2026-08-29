import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'react-render-guardian',
      formats: ['es', 'cjs'],
      fileName: (format) => `react-render-guardian.${format}.js`
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    },
    sourcemap: 'inline'
  }
})