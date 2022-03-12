import { IndexeddbPersistence } from 'y-indexeddb'
import { WebrtcProvider } from 'y-webrtc'
import { Awareness } from 'y-protocols/awareness'
import {
  atom,
  useAtom,
  useSetAtom,
  useAtomValue,
} from 'jotai'
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

export const state = {
  initial: atom(false),
  store: atom<LocalStore | null>(null),
  documents: atom<SharedDocuments | null>(null),
  cooperation: atom<WebrtcProvider | null>(null),
  awareness: atom<Awareness | undefined>(undefined),
}

export const useRootDoc = (): {
  store: LocalStore | null;
  documents: SharedDocuments | null;
} => {
  const [initial, setInitial] = useAtom(state.initial)
  const [store, setStore] = useAtom(state.store)
  const [documents, setDocuments] = useAtom(state.documents)
  const setCooperation = useSetAtom(state.cooperation)
  const setAwareness = useSetAtom(state.awareness)

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
    setStore(store)
  }

  const initializeDocuments = async () => {
    const documents = documentsDoc.getMap()
    const cooperation = new WebrtcProvider(cooperationDocsId, documentsDoc)
    const awareness = cooperation.awareness
    setCooperation(cooperation)
    setAwareness(awareness)

    const keys = [...documents.keys()]
    logger.info(`Documents persistence synced, found ${keys.length}:`, keys)
    setDocuments(documents)
  }

  storePersistence.synced
    ? initializeStore()
    : storePersistence.once('synced', initializeStore)

  documentsPersistence.synced
    ? initializeDocuments()
    : documentsPersistence.once('synced', initializeDocuments)

  setInitial(true)

  return {
    store,
    documents,
  }
}

/**
 * always used after initialize state
 */
export const useUser = (): User => {
  const store = useAtomValue(state.store)!
  const user = store.get('user')!.toJSON()
  return user
}
