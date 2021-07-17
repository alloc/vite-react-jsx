import reactJsx from 'vite-react-jsx'
import reactRefresh from '@vitejs/plugin-react-refresh'
import tsconfigPaths from 'vite-tsconfig-paths'
import type { UserConfig } from 'vite'

const config: UserConfig = {
  plugins: [reactRefresh(), tsconfigPaths(), reactJsx()],
  // PROBLEM: Current setup does not work with `optimizeDeps`
  // It will say something like this in the browser console:
  // File.tsx:3 Uncaught ReferenceError: React is not defined
  optimizeDeps: {
    include: ['@/shared/ui'],
  },
}

export default config
