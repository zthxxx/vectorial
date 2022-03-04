import { IndexeddbPersistence } from 'y-indexeddb'
import { WebrtcProvider } from 'y-webrtc'
import {
  atom,
  useAtom,
  useSetAtom,
} from 'jotai'
import {
  YDoc,
  YMap,
  logger,
} from '@vectorial/whiteboard/utils'
import {
  Store,
  LocalStore,
  Documents,
  SharedDocuments,
} from './types'
import { initUser } from './user'


export const storeDocId = `vectorial:store-doc`
export const documentsDocId = `vectorial:documents-doc`
export const cooperationDocsId = `vectorial:cooperation-documents-doc`


export const storeDoc = new YDoc<Store>()
export const storeTransact = storeDoc.transact.bind(storeDoc)

export const documentsDoc = new YDoc<Documents>()
export const documentTransact = documentsDoc.transact.bind(documentsDoc)

export const storePersistence = new IndexeddbPersistence(storeDocId, storeDoc)
export const documentsPersistence = new IndexeddbPersistence(documentsDocId, documentsDoc)

export const cooperation = new WebrtcProvider(cooperationDocsId, documentsDoc)
export const awareness = cooperation.awareness


export const state = {
  initialized: atom(false),
  store: atom<LocalStore | null>(null),
  storeLoading: atom(false),
  documents: atom<SharedDocuments | null>(null),
}


export const useRootDoc = () => {
  const [initialized, setInitialized] = useAtom(state.initialized)
  const [store, setStore] = useAtom(state.store)
  const [documents, setDocuments] = useAtom(state.documents)

  if (!initialized) {
    logger.info(`loading root yjs document`)
    setInitialized(true)

    const initialStore = () => {
      logger.info(`Store persistence synced`)
      const store = storeDoc.getMap()

      if (!store.get('user')) {
        logger.info('Initializing user ...')
        initUser(store)
      }

      setStore(store)
    }

    const initialDocuments = () => {
      logger.info(`Documents persistence synced`)
      const documents = documentsDoc.getMap()
      setDocuments(documents)
    }

    storePersistence.synced
      ? initialStore()
      : storePersistence.once('synced', initialStore)

    documentsPersistence.synced
      ? initialDocuments()
      : documentsPersistence.once('synced', initialDocuments)
  }

  return {
    store,
    documents,
  }
}

