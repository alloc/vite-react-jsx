# vite-react-jsx

[![npm](https://img.shields.io/npm/v/vite-react-jsx.svg)](https://www.npmjs.com/package/vite-react-jsx)
[![Code style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://paypal.me/alecdotbiz)

> React 17's automatic JSX runtime for your entire bundle 

&nbsp;

### Features

- Replaces `React.createElement` calls in your **entire** bundle (even for **pre-minified**, compiled React components from `node_modules`) with [the automatic JSX runtime](https://reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html) introduced in React 17
- Injects `import React` statements in server mode, but not for modules where React is already imported
- Deduplicates `react` and `react-dom` imports by setting `resolve.dedupe` for you

&nbsp;

### Usage

```ts
import reactJsx from 'vite-react-jsx'

export default {
  plugins: [
    reactJsx(),
  ]
}
```
