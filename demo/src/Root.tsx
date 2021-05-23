import { useState } from 'react'
import One from 'react-one'
import Two from 'react-two'
import Switch from 'react-switch'
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
