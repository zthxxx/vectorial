import { FC, useEffect, useState, memo } from 'react'
import {
  useParams,
} from 'react-router-dom'
import {
  Awareness,
} from 'y-protocols/awareness'
import {
  useStore,
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
  UndoRedoPlugin,
  AwareCursorsPlugin,
  HighlightSelectedPlugin,
} from '@vectorial/whiteboard/scene'
import {
  CanvasContainer,
} from './components'
import {
  Toolbox,
} from './tools'


export const userScene = ({ user, page, awareness }: {
  user?: User,
  page?: PageNode;
  awareness?: Awareness;
}) => {
  const container = useStore(state => state.sceneContainer)
  const [scene, setScene] = useState<Scene | null>(null)
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

    if (import.meta.env.DEV) {
      (window as any).scene = scene
    }

    scene.use(new ViewportPlugin({ user, scene }))
    scene.use(new UndoRedoPlugin({ user, scene }))
    scene.use(new AwareCursorsPlugin({ user, scene }))
    scene.use(new HighlightSelectedPlugin({ user, scene }))

    setScene(scene)
  }, [container, user, page, awareness, ready])

  return scene
}

export const SceneView: FC = memo(() => {
  const { id } = useParams<{ id: string }>()
  const store = useStore(state => state.store)
  const user: User | undefined = store?.get('user')?.toJSON()
  const awareness: Awareness | undefined = useStore(state => state.awareness)

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
      {user && scene && page && (
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
