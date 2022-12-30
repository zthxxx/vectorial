import { useEffect } from 'react'
import type * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { SocketIOProvider } from 'y-socket.io'
import { Awareness } from 'y-protocols/awareness'
import { create } from 'zustand'
import { shallow } from 'zustand/shallow'
import {
  YDoc,
  YMap,
  logger,
} from '@vectorial/whiteboard/utils'
import type {
  DocumentNode,
  PageNode,
} from '@vectorial/whiteboard/nodes'
import type {
  User,
  Store,
  LocalStore,
  DocumentData,
  SharedDocument,
} from './types'
import type {
  Scene,
} from '@vectorial/whiteboard/scene'
import { initUser } from './user'

export const storeDocId = `vectorial:store-doc`
export const storeDoc = new YDoc<Store>()
export const storePersistence = new IndexeddbPersistence(storeDocId, storeDoc)

export const documentIdPrefix = `vectorial:document:${location.host}`
export const documentDoc = new YDoc<{ document: DocumentData; }>()


export interface State {
  initial: boolean;
  loadingMessage: string;

  /**
   * persistent store for user settings
   */
  store: LocalStore | null;

  /**
   * persistent local document
   */
  documentDoc: SharedDocument | null;
  docTransact?: Y.Doc['transact'];

  /**
   * cooperation with current document
   */
  cooperation: SocketIOProvider | null;
  cooperationConnected: boolean;
  documentSynced: boolean;

  awareness?: Awareness;

  documentNode?: DocumentNode;
  pageNode?: PageNode;

  scene?: Scene;
  sceneContainer: HTMLDivElement | null;
  
  updateStore: (state: Partial<State>) => void;
  setLoadingMessage: (message: string) => void;
}

export const useStore = create<State>((set) => ({
  initial: false,
  loadingMessage: '',

  store: null,

  documentDoc: null,

  cooperation: null,
  cooperationConnected: false,
  documentSynced: false,
  awareness: undefined,

  sceneContainer: null,
  updateStore: (state: Partial<State>) => set(state),
  setLoadingMessage: (loadingMessage: string) => {
    logger.info(`[loading] ${loadingMessage}`)
    set({ loadingMessage })
  },
}))


export const useLoadStore = () => {
  const { store, updateStore, setLoadingMessage } = useStore(
    state => ({
      store: state.store,
      updateStore: state.updateStore,
      setLoadingMessage: state.setLoadingMessage,
    }),
    shallow,
  )

  useEffect(() => {
    if (store) return

    setLoadingMessage(`Loading local persistent store ...`)

    const initializeStore = async () => {
      logger.info(`Store persistence synced`)
      const store = storeDoc.getMap()
  
      if (!store.get('user')) {
        setLoadingMessage('Initializing user ...')
        await initUser(store)
      }
  
      const user: User = store.get('user')!.toJSON()
      logger.info(`User: ${user.name} (${user.id})`)
  
      if (!store.get('documents')) {
        store.set('documents', new YMap())
      }
  
      updateStore({ store })
    }
  
    storePersistence.synced
      ? initializeStore()
      : storePersistence.once('synced', initializeStore)

  }, [store])
}


export const useUser = (): User | undefined => {
  const store = useStore(state => state.store)
  const user = store?.get('user')?.toJSON()
  return user
}
