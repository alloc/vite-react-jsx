import type { Plugin, ResolvedConfig } from 'vite'
import type { NodePath, PluginItem } from '@babel/core'
import type { ImportDeclaration, ImportSpecifier } from '@babel/types'
import resolve from 'resolve'

export default (): Plugin => {
  return {
    name: 'vite:react-jsx',
    enforce: 'pre',
    config: () => ({
      resolve: {
        dedupe: ['react', 'react-dom'],
      },
    }),
    configResolved(config) {
      if (config.command === 'build') {
        Object.assign(this, getBuildPlugin(config))
      } else {
        const jsxRE = /\.[tj]sx$/
        const reactRE = /(^|\n)import React /

        // Just use React.createElement in serve mode
        this.transform = function (code, id) {
          if (jsxRE.test(id) && !reactRE.test(code)) {
            return `import React from 'react'; ` + code
          }
        }
      }
    },
  }
}

function getBuildPlugin(config: ResolvedConfig): Plugin {
  const babelImport = import('@babel/core')
  const babelTransformJsx = import('@babel/plugin-transform-react-jsx')

  const runtimeId = 'react/jsx-runtime'
  const runtimePath = resolve.sync('react/jsx-runtime', {
    basedir: config.root,
  })

  return {
    name: 'vite:react-jsx',
    resolveId: id => (id === runtimeId ? id : null),
    load(id) {
      if (id === runtimeId) {
        const exports = ['jsx', 'jsxs', 'Fragment']
        return [
          `import * as jsxRuntime from '${runtimePath}'`,
          // We can't use `export * from` or else any callsite that uses
          // this module will be compiled to `jsxRuntime.exports.jsx`
          // instead of the more concise `jsx` alias.
          ...exports.map(name => `export const ${name} = jsxRuntime.${name}`),
        ].join('\n')
      }
    },
    async transform(code, id) {
      if (/.+\/node_modules\/.+\.jsx?$/.test(id)) {
        let match = code.match(
          /\b(var|let|const) +(\w+) *= *require\(["']react["']\)/
        )
        if (match) {
          return nodeModulesTransform(code, match[2], true)
        }
        match = code.match(/^import (\w+).+? from ["']react["']/m)
        if (match) {
          return nodeModulesTransform(code, match[1])
        }
      } else if (/\.[tj]sx$/.test(id)) {
        const babel = await babelImport
        const res = await babel.transformAsync(code, {
          plugins: [[await babelTransformJsx, { runtime: 'automatic' }]],
          sourceMaps: config.build.sourcemap,
        })
        if (res?.code) {
          return {
            code: res.code,
            map: res.map,
          }
        }
      }
    },
  }

  async function nodeModulesTransform(
    code: string,
    reactAlias: string,
    isCommonJS?: boolean
  ) {
    const reactJsxRE = new RegExp(
      '\\b' + reactAlias + '\\.(createElement|Fragment)\\b',
      'g'
    )

    let hasCompiledJsx = false
    code = code.replace(reactJsxRE, (_, prop) => {
      hasCompiledJsx = true
      // Replace with "React" so JSX can be reverse compiled.
      return 'React.' + prop
    })

    // Assume node_modules never contains uncompiled JSX.
    if (!hasCompiledJsx) {
      return
    }

    // Support modules that use `import {Fragment} from 'react'`
    code = code.replace(
      /createElement\(Fragment,/g,
      'createElement(React.Fragment,'
    )

    const babel = await babelImport

    // Restore JSX from React.createElement calls
    let res = await babel.transformAsync(code, {
      ast: true,
      code: false,
      plugins: await Promise.all([
        import('@babel/plugin-syntax-jsx').then(mod => mod.default),
        import('./restore-jsx'),
      ]),
    })

    // Then apply the JSX automatic runtime transform
    if (res?.ast) {
      const plugins: PluginItem[] = [
        [await babelTransformJsx, { runtime: 'automatic' }],
      ]
      if (isCommonJS) {
        // Replace this:
        //    import { jsx as _jsx } from "react/jsx-runtime"
        // with this:
        //    var _jsx = require("react/jsx-runtime").jsx
        plugins.push(babelImportToRequire)
      }
      res = await babel.transformFromAstAsync(res.ast, undefined, {
        plugins,
        sourceMaps: config.build.sourcemap,
      })
      if (res?.code) {
        return {
          code: res.code,
          map: res.map,
        }
      }
    }
  }

  function babelImportToRequire({ types: t }: typeof import('@babel/core')) {
    return {
      visitor: {
        ImportDeclaration(path: NodePath) {
          const decl = path.node as ImportDeclaration
          const spec = decl.specifiers[0] as ImportSpecifier

          path.replaceWith(
            t.variableDeclaration('var', [
              t.variableDeclarator(
                spec.local,
                t.memberExpression(
                  t.callExpression(t.identifier('require'), [decl.source]),
                  spec.imported
                )
              ),
            ])
          )
        },
      },
    }
  }
}
