import reactJsx from 'vite-react-jsx'
import reactRefresh from '@vitejs/plugin-react-refresh'
import type { UserConfig } from 'vite'

const config: UserConfig = {
  plugins: [reactRefresh(), reactJsx()],
  build: {
    sourcemap: true,
    minify: false,
  },
}

export default config
