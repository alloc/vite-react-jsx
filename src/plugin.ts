import type { Plugin } from 'vite'
import type { types as t, NodePath, PluginItem } from '@babel/core'
import type { ImportDeclaration, ImportSpecifier } from '@babel/types'
import resolve from 'resolve'

export default function viteReactJsx(): Plugin {
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
        Object.assign(this, getRuntimeLoader(config))
        this.transform = getTransformer({
          sourceMaps: !!config.build.sourcemap,
        })
      } else {
        const jsxRE = /\.[tj]sx$/
        const reactRE = /(^|\n)import React[ ,]/

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

viteReactJsx.getRuntimeLoader = getRuntimeLoader
viteReactJsx.restoreJSX = restoreJSX

function getRuntimeLoader(opts: { root: string }) {
  const runtimeId = 'react/jsx-runtime'
  return {
    name: 'vite:react-jsx',
    enforce: 'pre',
    resolveId(id: string) {
      return id === runtimeId ? id : null
    },
    load(id: string) {
      if (id === runtimeId) {
        const runtimePath = resolve.sync(runtimeId, {
          basedir: opts.root,
        })
        const exports = ['jsx', 'jsxs', 'Fragment']
        return [
          `import * as jsxRuntime from ${JSON.stringify(runtimePath)}`,
          // We can't use `export * from` or else any callsite that uses
          // this module will be compiled to `jsxRuntime.exports.jsx`
          // instead of the more concise `jsx` alias.
          ...exports.map(name => `export const ${name} = jsxRuntime.${name}`),
        ].join('\n')
      }
    },
  }
}

function getTransformer(opts: { sourceMaps?: boolean }) {
  const babelImport = import('@babel/core')
  const babelTransformJsx = import('@babel/plugin-transform-react-jsx')

  return async function transform(code: string, id: string) {
    if (/.+\/node_modules\/.+\.jsx?$/.test(id)) {
      const babel = await babelImport

      // Reverse-compile any React.createElement calls
      let [ast, isCommonJS] = await viteReactJsx.restoreJSX(babel, code, id)

      // Then apply the JSX automatic runtime transform
      if (ast) {
        const plugins: PluginItem[] = [
          [await babelTransformJsx, { runtime: 'automatic' }],
        ]
        if (isCommonJS) {
          plugins.push(babelImportToRequire)
        }
        const result = await babel.transformFromAstAsync(ast, undefined, {
          plugins,
          sourceMaps: opts.sourceMaps,
          filename: id
        })
        if (result?.code) {
          return {
            code: result.code,
            map: result.map,
          }
        }
      }
    } else if (/\.[tj]sx$/.test(id)) {
      const syntaxPlugins: PluginItem[] = []
      if (id.endsWith('.tsx')) {
        syntaxPlugins.push(await babelTSX())
      }
      const babel = await babelImport
      const res = await babel.transformAsync(code, {
        plugins: [
          ...syntaxPlugins,
          [await babelTransformJsx, { runtime: 'automatic' }],
        ],
        sourceMaps: opts.sourceMaps,
        filename: id
      })
      if (res?.code) {
        return {
          code: res.code,
          map: res.map,
        }
      }
    }
  }

  async function babelTSX() {
    return [
      await import('@babel/plugin-syntax-typescript').then(m => m.default),
      { isTSX: true },
    ]
  }
}

type RestoredJSX = [result: t.File | null | undefined, isCommonJS: boolean]

let babelRestoreJSX: any

/** Restore JSX from `React.createElement` calls */
async function restoreJSX(
  babel: typeof import('@babel/core'),
  code: string,
  id: string
): Promise<RestoredJSX> {
  const [reactAlias, isCommonJS] = parseReactAlias(code)
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

  if (!hasCompiledJsx) {
    return [null, false]
  }

  // Support modules that use `import {Fragment} from 'react'`
  code = code.replace(
    /createElement\(Fragment,/g,
    'createElement(React.Fragment,'
  )

  babelRestoreJSX ||= import('./babelRestoreJsx')

  const result = await babel.transformAsync(code, {
    ast: true,
    code: false,
    parserOpts: {
      plugins: ['jsx'],
    },
    plugins: [await babelRestoreJSX],
    filename: id
  })

  return [result?.ast, isCommonJS]
}

function parseReactAlias(
  code: string
): [alias: string | undefined, isCommonJS: boolean] {
  let match = code.match(
    /\b(var|let|const) +(\w+) *= *require\(["']react["']\)/
  )
  if (match) {
    return [match[2], true]
  }
  match = code.match(/^import (\w+).+? from ["']react["']/m)
  if (match) {
    return [match[1], false]
  }
  return [undefined, false]
}

/**
 * Replace this:
 *
 *     import { jsx as _jsx } from "react/jsx-runtime"
 *
 * with this:
 *
 *     var _jsx = require("react/jsx-runtime").jsx
 */
export function babelImportToRequire({
  types: t,
}: typeof import('@babel/core')) {
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
