import { FC, memo } from 'react'
import {
  useMatch,
} from 'react-router-dom'
import {
  useRootDoc,
} from '@vectorial/whiteboard/model'
import { useCheckToNewScene } from '@vectorial/whiteboard/service'

export const SceneIdGuard: FC<{
  routePath: string,
  resumeLastScene?: boolean,
}> = memo(({
  routePath,
  children,
  resumeLastScene,
}) => {
  const { store, documents } = useRootDoc()
  const exactMatch = useMatch(routePath)

  const currentDocId = store?.get('currentDocId')

  const willJump = Boolean(exactMatch && store && documents)

  useCheckToNewScene(
    willJump,
    resumeLastScene ? currentDocId : undefined,
  )

  if (willJump) {
    return null
  }

  return (<>{ children }</>)
})

export default SceneIdGuard
