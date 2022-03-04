import { FC, useEffect, memo } from 'react'
import {
  useParams,
} from 'react-router-dom'
import {
  Awareness,
} from 'y-protocols/awareness'
import { atom, useAtom, useAtomValue } from 'jotai'
import {
  state,
  User,
  documentsTransact,
} from '@vectorial/whiteboard/model'
import {
  useCheckToNewScene,
  useGetDocumentPage,
} from '@vectorial/whiteboard/service'
import {
  logger,
} from '@vectorial/whiteboard/utils'
import {
  PageNode,
} from '@vectorial/whiteboard/nodes'
import {
  Scene,
  ViewportPlugin,
} from '@vectorial/whiteboard/scene'
import {
  CanvasContainer,
  containerAtom,
  Toolbox,
  AwareCursors,
} from './components'

export const sceneAtom = atom<Scene | null>(null)


export const userScene = ({ user, page, awareness }: {
  user?: User,
  page?: PageNode;
  awareness?: Awareness;
}) => {
  const container = useAtomValue(containerAtom)
  const [scene, setScene] = useAtom(sceneAtom)
  const ready = !!scene

  useEffect(() => {
    if (
      ready
      || !container || !user || !page || !awareness
    ) return

    logger.info('Creating the world scene ...')
    const scene = new Scene({
      element: container,
      page,
      awareness,
      docTransact: documentsTransact,
    })

    scene.use(
      new ViewportPlugin({
        user,
        scene,
      })
    )

    setScene(scene)
  }, [container, user, page, awareness, ready])

  return scene
}

export const SceneView: FC = memo(() => {
  const { id } = useParams<{ id: string }>()
  const user: User | undefined = useAtomValue(state.store)?.get('user')?.toJSON()
  const awareness: Awareness | undefined = useAtomValue(state.awareness)

  useCheckToNewScene(!id)

  logger.info('Getting current page ...')
  const { page } = useGetDocumentPage(id)

  const scene = userScene({ user, page, awareness })

  if (scene) {
    logger.info('Current page', page)
  }

  return (
    <>
      <CanvasContainer />
      {scene && page && (
        <AwareCursors
          pageId={page.id}
          viewMatrix={scene.viewMatrix}
          viewMatrix$={scene.viewMatrix$}
          interactEvent$={scene.interactEvent$}
        />
      )}
      <Toolbox />
    </>
  )
})

export default SceneView