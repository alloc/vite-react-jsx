import { useState } from 'react'

// This local package uses the automatic JSX runtime in a .jsx module
import One from 'react-one'

// This local package uses `import React from 'react'` in a .tsx module
import Two from 'react-two'

// This package has a minified CJS entry point and a development module
import Switch from 'react-switch'

// This package has a ESM entry point
import Dropzone from 'react-dropzone'

export const Root = () => {
  const [checked, setChecked] = useState(false)
  return (
    <>
      <One />
      <Two />
      <Switch checked={checked} onChange={setChecked} />
      <FileZone />
    </>
  )
}

const FileZone = () => (
  <div style={{ width: 200, margin: '50px auto' }}>
    <Dropzone>
      {state => (
        <div {...state.getRootProps()}>
          <input {...state.getInputProps()} />
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: 10,
              background: `hsla(0, 0%, 100%, ${
                state.isDragActive ? 0.3 : 0.1
              })`,
              color: 'white',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
            }}>
            Drop a file on me!
          </div>
        </div>
      )}
    </Dropzone>
  </div>
)
