import { useState } from 'react'
import One from 'react-one'
import Two from 'react-two'
import Switch from 'react-switch'

export const Root = () => {
  const [checked, setChecked] = useState(false)
  return (
    <>
      <One />
      <Two />
      <Switch checked={checked} onChange={setChecked} />
    </>
  )
}
