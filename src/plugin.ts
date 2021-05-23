import type { Plugin } from 'vite'
import type { TransformOptions } from '@babel/core'
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
        const babelJsxSyntax = import('@babel/plugin-syntax-jsx')
        const babelTransformJsx = import('@babel/plugin-transform-react-jsx')
        const babelRestoreJsx = import('./restore-jsx')

        const runtimeEntryId = '/@react-jsx-runtime'
        const runtimePath = resolve.sync('react/jsx-runtime', {
          basedir: config.root,
        })
        // const reactPath = resolve.sync('react', {
        //   basedir: config.root,
        // })

        this.resolveId = id => (id === runtimeEntryId ? id : null)
        this.load = function (id) {
          if (id === runtimeEntryId) {
            const exports = ['jsx', 'jsxs', 'Fragment'].join(',')
            return `export {${exports}} from '${runtimePath}'`
          }
        }

        // this.transform = async function (code, id) {
        //   if (id.includes('/node_modules/') && /\.[tj]sx$/.test(id)) {
        //     const babel = await babelImport
        //     const result = await babel.transformAsync(code, {
        //       plugins: [[await babelTransformJsx, { runtime: 'automatic' }]],
        //       sourceMaps: config.build.sourcemap,
        //     })
        //     if (result?.code) {
        //       return result as any
        //     }
        //   }
        // }

        let runtimeId: string

        this.buildStart = function () {
          runtimeId = this.emitFile({
            id: runtimeEntryId,
            type: 'chunk',
            name: 'jsx-runtime',
            preserveSignature: 'allow-extension',
          })
        }

        this.renderChunk = async function (code, chunk) {
          // Skip chunks without a `React.createElement` call.
          if (!/\bReact(\$[0-9]+)?\.createElement\b/.test(code)) {
            return null
          }

          // Ensure all `React.createElement` calls use the same React.
          // Otherwise, the `babelRestoreJsx` plugin won't affect them.
          code = code.replace(/\bReact\$[0-9]+\b/g, 'React')

          // Strip "pure annotation" before each `React.createElement` call.
          code = code.replace(/\/\* @__PURE__ \*\//g, '')

          return transform(code, chunk.map, [
            [babelJsxSyntax, babelRestoreJsx],
            [[babelTransformJsx, { runtime: 'automatic' }]],
            code =>
              chunk.modules[runtimePath]
                ? fixVendorImports(code)
                : // Import jsx-runtime from the local chunk.
                  code.replace(
                    /"react\/jsx-runtime"/g,
                    `"./${path.relative(
                      config.build.assetsDir,
                      this.getFileName(runtimeId)
                    )}"`
                  ),
          ])
        }

        // Use jsx-runtime from the same chunk.
        function fixVendorImports(code: string) {
          const usedExports: string[] = []

          code = code.replace(
            /^import { (\w+)[^\n]+ "react\/jsx-runtime";/gm,
            (_, name) => {
              // Track which "react/jsx-runtime" exports are needed.
              usedExports.push(name)
              // These imports are circular, so remove them.
              return ''
            }
          )

          // After the jsx-runtime module is ready, declare a variable
          // for each used export.
          code = code.replace(
            /(jsxRuntime\.exports = [\w\W]+?})/,
            '$1 const' +
              usedExports
                .map(name => ` _${name} = jsxRuntime.exports.${name}`)
                .join(',')
          )

          return code
        }

        async function transform(
          code: string,
          map: any,
          pipeline: (any[] | ((code: string) => string))[]
        ) {
          const babel = await babelImport

          let ast: any
          for (let i = 0; i < pipeline.length; i++) {
            const action = pipeline[i]

            if (typeof action === 'function') {
              ast = null
              code = action(code)
              continue
            }

            const generateAst = Array.isArray(pipeline[i + 1])
            const options: TransformOptions = {
              plugins: await Promise.all(
                action.map(async plugin =>
                  Array.isArray(plugin)
                    ? [await plugin[0], plugin[1]]
                    : plugin.default || plugin
                )
              ),
              ast: generateAst,
              code: !generateAst,
              sourceMaps: config.build.sourcemap,
              inputSourceMap: map || undefined,
            }

            const result = ast
              ? await babel.transformFromAstAsync(ast, undefined, options)
              : await babel.transformAsync(code, options)

            if (!result) {
              break
            }
            if (result.code) {
              code = result.code
            }
            ast = result.ast
            map = result.map
          }

          return { code, map }
        }
      } else {
        const jsxRE = /\.[tj]sx$/
        const reactRE = /(^|\n)import React /

        // Just use React.createElement in dev mode
        this.transform = function (code, id) {
          if (jsxRE.test(id) && !reactRE.test(code)) {
            return `import React from 'react'; ` + code
          }
        }
      }
    },
  }
}
