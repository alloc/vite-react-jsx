import type { Plugin } from 'vite'
import resolve from 'resolve'
import path from 'path'

type PluginConfig = {}

export default (config: PluginConfig = {}): Plugin => {
  return {
    name: 'vite:react-jsx',
    enforce: 'pre',
    configResolved(config) {
      if (config.command === 'build') {
        const babelImport = import('@babel/core')
        const babelJsxSyntax = import('@babel/plugin-syntax-jsx').then(
          module => module.default
        )
        const babelTransformJsx = import('@babel/plugin-transform-react-jsx')
        const babelRestoreJsx = import('./restore-jsx')

        const runtimeEntryId = '/@react-jsx-runtime'
        const runtimePath = resolve.sync('react/jsx-runtime', {
          basedir: config.root,
        })

        this.resolveId = id =>
          id === runtimeEntryId || id === runtimePath
            ? { id, moduleSideEffects: 'no-treeshake' }
            : null

        this.load = function (id) {
          if (id === runtimeEntryId) {
            return `import * as jsx from '${runtimePath}'; console.log(jsx)`
            // return [
            //   `import * as jsxRuntime from '${runtimePath}'`,
            //   ...['jsx', 'jsxs', 'Fragment'].map(
            //     id => `export const ${id} = jsxRuntime.${id}`
            //   ),
            // ].join('\n')
          }
        }

        let runtimeId: string

        this.buildStart = function (opts) {
          runtimeId = this.emitFile({
            type: 'chunk',
            name: 'jsx-runtime',
            id: runtimeEntryId,
          })
        }

        this.renderChunk = async function (code, chunk, opts: any) {
          opts.__vite_skip_esbuild__ = true

          // Ensure all React.createElement calls use the same React.
          // Otherwise, the `babelRestoreJsx` plugin won't affect them.
          code = code.replace(/\bReact\$[0-9]+\b/g, 'React')

          // Strip "pure annotations" before each React.createElement call.
          code = code.replace(/\/\* @__PURE__ \*\//g, '')

          const runtimePath = path.relative(
            config.build.assetsDir,
            this.getFileName(runtimeId)
          )

          return transform(code, chunk.map, [
            [babelJsxSyntax, babelRestoreJsx],
            [[babelTransformJsx, { runtime: 'automatic' }]],
            // Import jsx-runtime from the local chunk.
            code => code.replace(/"react\/jsx-runtime"/g, `"./${runtimePath}"`),
          ])
        }

        async function transform(
          code: string,
          map: any,
          pipeline: (any[] | ((code: string) => string))[]
        ) {
          const babel = await babelImport
          for (const plugins of pipeline) {
            if (typeof plugins === 'function') {
              code = plugins(code)
              continue
            }
            const result = await babel.transformAsync(code, {
              plugins: await Promise.all(
                plugins.map(async plugin =>
                  Array.isArray(plugin) ? [await plugin[0], plugin[1]] : plugin
                )
              ),
              sourceMaps: config.build.sourcemap,
              inputSourceMap: map,
            })
            if (!result?.code) {
              return null
            }
            code = result.code
            map = result.map || undefined
          }
          return { code, map }
        }
      } else {
        // TODO: inject "import React from 'react'" in JSX/TSX files
        // this.transform = function (code, id) {
        //   return code
        // }
      }
    },
  }
}
