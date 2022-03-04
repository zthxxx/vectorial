import { FC } from 'react'
import {
  useOutlet,
} from 'react-router-dom'

export const SceneLayout: FC = () => {
  const outlet = useOutlet()
  return outlet
}

export default SceneLayout
