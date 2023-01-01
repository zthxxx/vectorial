import { FC, useEffect, memo } from 'react'
import {
  useParams,
} from 'react-router-dom'
import { shallow } from 'zustand/shallow'
import {
  useStore,
  useLoadDocument,
  useUser,
  User,
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
  UndoRedoPlugin,
  AwareCursorsPlugin,
  HighlightSelectedPlugin,
} from '@vectorial/whiteboard/scene'
import {
  Loading,
} from '@vectorial/whiteboard/components'
import {
  Toolbox,
  CanvasContainer,
} from './components'


export const userScene = ({ user, page }: {
  user?: User,
  page?: PageNode;
}) => {
  const { scene, container, docTransact, updateStore, awareness } = useStore(
    state => ({
      scene: state.scene,
      container: state.sceneContainer,
      docTransact: state.docTransact,
      updateStore: state.updateStore,
      awareness: state.awareness,
    }),
    shallow,
  )

  const ready = !!scene

  useEffect(() => {
    if (
      ready
      || !container || !user || !page || !awareness || !docTransact
    ) return

    logger.info('Creating the world scene ...')
    const scene = new Scene({
      element: container,
      page,
      awareness,
      docTransact,
    })

    scene.use(new ViewportPlugin({ user, scene }))
    scene.use(new UndoRedoPlugin({ user, scene }))
    scene.use(new AwareCursorsPlugin({ user, scene }))
    scene.use(new HighlightSelectedPlugin({ user, scene }))

    updateStore({ scene })
  }, [container, user, page, awareness, ready])

  return scene
}

export const SceneView: FC = memo(() => {
  const { id } = useParams<{ id: string }>()

  useLoadDocument(id)

  const loading = useStore(state => !state.initial)
  const loadingMessage = useStore(state => state.loadingMessage)

  useCheckToNewScene(!id)

  const { pageNode } = useGetDocumentPage(id)

  const user = useUser()
  const scene = userScene({ user, page: pageNode })

  if (loading) {
    return (
      <Loading message={loadingMessage} />
    )
  }

  if (scene) {
    logger.info('Current page', pageNode)
  }

  return (
    <>
      <CanvasContainer />
      {user && scene && pageNode && (
        <>
          {scene.plugins['AwareCursorsPlugin']?.cursors}
          <Toolbox
            user={user}
            scene={scene}
          />
        </>
      )}
    </>
  )
})

export default SceneView
