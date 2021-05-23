import reactJsx from 'vite-react-jsx'
import reactRefresh from '@vitejs/plugin-react-refresh'
import type { UserConfig } from 'vite'

const config: UserConfig = {
  plugins: [reactRefresh(), reactJsx()],
  // Removing this line will break the bundle, because react-switch
  // is pre-minified and therefore is not supported.
  mode: 'development',
  build: {
    // The minified bundle works as expected.
    minify: false,
    // Source maps are generated properly.
    sourcemap: true,
  },
}

export default config
