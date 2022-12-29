import { FC, useEffect, memo } from 'react'
import {
  useParams,
} from 'react-router-dom'
import { shallow } from 'zustand/shallow'
import {
  useStore,
  useLoadDocument,
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
  Spin,
} from '@vectorial/whiteboard/components'
import {
  CanvasContainer,
} from './components'
import {
  Toolbox,
} from './tools'


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

  const { loading, store } = useStore(
    state => ({
      loading: !state.initial,
      store: state.store,
    }),
    shallow,
  )

  useCheckToNewScene(!id)

  const { pageNode } = useGetDocumentPage(id)

  const user: User | undefined = store?.get('user')?.toJSON()
  const scene = userScene({ user, page: pageNode })

  if (loading) {
    return (<Spin />)
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
