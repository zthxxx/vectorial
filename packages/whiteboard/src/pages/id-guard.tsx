import { FC } from 'react'
import {
  useMatch,
} from 'react-router-dom'
import { useCheckToNewScene } from '@vectorial/whiteboard/service'

export const SceneIdGuard: FC<{ routePath: string }> = ({ routePath, children }) => {
  const exactMatch = useMatch(routePath)
  useCheckToNewScene(!!exactMatch)

  return exactMatch ? null :(<>{children}</>)
}

export default SceneIdGuard
