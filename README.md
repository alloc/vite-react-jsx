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

### FAQ

- **What are the benefits of using the new JSX runtime?**  
  1) You don't need to `import React` manually anymore.  
  2) Better performance now and in the future. The [Motivations](https://github.com/reactjs/rfcs/blob/createlement-rfc/text/0000-create-element-changes.md#motivation) section in the RFC explains the specifics of performance issues with `React.createElement`.  
  3) In the future, you won't need `React.forwardRef` anymore.  
  4) Depending on your setup, slightly smaller bundle sizes (according to the React team).  
  5) Faster parsing of JavaScript by web browser (`.createElement` cannot be minified).

- **How much does this affect Vite's performance?**  
  In serve mode, the performance effects are unnoticeable, since Babel is only used when bundling.  
  Otherwise, you'll see ~40% longer build times in the `./demo` folder, but this % largely depends on how many kB of JavaScript need to be parsed and transformed by Babel.

- **Do I need React 17+ to use the new JSX runtime?**  
  No. Support for the new runtime was backported to React 16.14.0, React 15.7.0, and React 0.14.10.

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
