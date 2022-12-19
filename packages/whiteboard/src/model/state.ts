import { IndexeddbPersistence } from 'y-indexeddb'
import { WebrtcProvider } from 'y-webrtc'
import { Awareness } from 'y-protocols/awareness'
import { create } from 'zustand'
import { shallow } from 'zustand/shallow'
import {
  YDoc,
  logger,
} from '@vectorial/whiteboard/utils'
import {
  User,
  Store,
  LocalStore,
  Documents,
  SharedDocuments,
} from './types'
import { initUser } from './user'


export const storeDocId = `vectorial:store-doc`
export const documentsDocId = `vectorial:documents-doc`
export const cooperationDocsId = `vectorial:cooperation-documents-doc:${location.host}`

export const storeDoc = new YDoc<Store>()

export const documentsDoc = new YDoc<Documents>()
export const documentsTransact = documentsDoc.transact.bind(documentsDoc)

export const storePersistence = new IndexeddbPersistence(storeDocId, storeDoc)
export const documentsPersistence = new IndexeddbPersistence(documentsDocId, documentsDoc)


export interface State {
  initial: boolean;
  store: LocalStore | null;
  documents: SharedDocuments | null;
  cooperation: WebrtcProvider | null;
  awareness?: Awareness;
  updateStore: (state: Partial<State>) => void;
  sceneContainer: HTMLDivElement | null;
}

export const useStore = create<State>((set) => ({
  initial: false,
  store: null,
  documents: null,
  cooperation: null,
  awareness: undefined,
  updateStore: (state: Partial<State>) => set(state),
  sceneContainer: null,
}))


export const useRootDoc = (): {
  store: LocalStore | null;
  documents: SharedDocuments | null;
} => {
  const { initial, store, documents, updateStore } = useStore(
    state => ({
      initial: state.initial,
      store: state.store,
      documents: state.documents,
      updateStore: state.updateStore,
    }),
    shallow,
  )

  if (initial) return { store, documents }

  logger.info(`loading root yjs document`)

  const initializeStore = async () => {
    logger.info(`Store persistence synced`)
    const store = storeDoc.getMap()

    if (!store.get('user')) {
      logger.info('Initializing user ...')
      await initUser(store)
    }

    const user: User = store.get('user')!.toJSON()
    logger.info(`User: ${user.name} (${user.id})`)
    updateStore({ store })
  }

  const initializeDocuments = async () => {
    const documents = documentsDoc.getMap()
    const awareness = new Awareness(documentsDoc)
    const cooperation = new WebrtcProvider(cooperationDocsId, documentsDoc, {
      signaling: ['wss://signaling.yjs.dev'],
      password: undefined,
      awareness,
      maxConns: 20 + Math.floor(Math.random() * 15),
      filterBcConns: true,
      peerOpts: {}
    })

    const keys = [...documents.keys()]
    logger.info(`Documents persistence synced, found ${keys.length}:`, keys)

    updateStore({ cooperation, awareness, documents })
  }

  storePersistence.synced
    ? initializeStore()
    : storePersistence.once('synced', initializeStore)

  documentsPersistence.synced
    ? initializeDocuments()
    : documentsPersistence.once('synced', initializeDocuments)

  updateStore({ initial: true })

  return {
    store,
    documents,
  }
}

/**
 * always used after initialize state
 */
export const useUser = (): User => {
  const store = useStore(state => state.store)!
  const user = store.get('user')!.toJSON()
  return user
}
