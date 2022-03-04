import { FC, useEffect, memo } from 'react'
import {
  useParams,
} from 'react-router-dom'
import { atom, useAtom, useAtomValue } from 'jotai'
import {
  useCheckToNewScene,
  useGetDocumentPage,
} from '@vectorial/whiteboard/service'
import { Scene } from '@vectorial/whiteboard/scene'
import {
  CanvasContainer,
  containerAtom,
  Toolbox,
} from './components'

export const sceneAtom = atom<Scene | null>(null)


export const SceneView: FC = memo(() => {
  const { id } = useParams<{ id: string }>()
  const container = useAtomValue(containerAtom)
  const [scene, setScene] = useAtom(sceneAtom)
  useCheckToNewScene(!id)

  const { page } = useGetDocumentPage(id)

  useEffect(() => {
    if (!container || !page || scene) return

    setScene(new Scene({
      element: container,
      page: page,
    }))
  }, [container, page])

  return (
    <>
      <CanvasContainer />
      <Toolbox />
    </>
  )
})

export default SceneView
