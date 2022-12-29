import { useEffect } from 'react'
import { BehaviorSubject, forkJoin } from 'rxjs'
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { SocketIOProvider } from 'y-socket.io'
import { Awareness } from 'y-protocols/awareness'
import { shallow } from 'zustand/shallow'
import {
  nanoid,
  logger,
  toSharedTypes,
} from '@vectorial/whiteboard/utils'
import {
  NodeType,
  DocumentData,
  FrameData,
  PageData,
} from './types'
import {
  newFrame,
} from './frame'
import {
  newPage,
} from './page'
import {
  useStore,
  documentIdPrefix,
  documentDoc,
} from './state'


const cooperationSocketUrl =
  (import.meta.env.VITE_SOCKET_IO_URL as string)
  // actually will auto suffix to `ws://{location.host}`/socket.io/`
  ?? `//${location.host}`

export const useLoadDocument = (id?: string) => {
  const { store, document, updateStore } = useStore(
    state => ({
      store: state.store,
      document: state.documentDoc,
      updateStore: state.updateStore,
    }),
    shallow,
  )

  useEffect(() => {
    if (!id || !store || document) return

    if (store.get('currentDocId') !== id) {
      store.set('currentDocId', id)
    }
  
    logger.info(`loading presistent local document`)
  
    const documentId = `${documentIdPrefix}:${id}`
    const documentPersistence = new IndexeddbPersistence(
      documentId,
      documentDoc,
    )
  
    const awareness = new Awareness(documentDoc)

    const cooperation = new SocketIOProvider(
      cooperationSocketUrl,
      documentId,
      documentDoc,
      {
        awareness,
      }
    )
  
    const persistentLoaded$ = new BehaviorSubject(null)
    const cooperationConnected$ = new BehaviorSubject(null)
    const cooperationSynced$ = new BehaviorSubject(null)

    forkJoin([
      persistentLoaded$,
      cooperationConnected$,
      cooperationSynced$,
    ]).subscribe(() => {
      logger.info(`Document local persistent loaded, cooperation connected and synced`)

      // mannually trigger sync steps in y-socket.io
      cooperation.socket.emit(
        'sync-step-1',
        Y.encodeStateVector(documentDoc),
        (update: Uint8Array) => {
          logger.info(`sync-step-2 in y-socket.io`)

          Y.applyUpdate(documentDoc, new Uint8Array(update), cooperation)
          
          setTimeout(() => {
            loadOrCreateDocument(id)
    
            updateStore({
              initial: true,
              documentDoc: documentDoc.getMap(),
              docTransact: documentDoc.transact.bind(documentDoc),
              cooperation,
              awareness,
            })
          }, 100)
        },
      )
    })

    const persistentLoaded = () => {
      logger.info(`Document local persistent loaded (${id})`)
      persistentLoaded$.complete()
    }
  
    documentPersistence.synced
      ? persistentLoaded()
      : documentPersistence.once('synced', persistentLoaded)
    
    cooperation.on('status', ({ status }: { status: 'disconnected' | 'connecting' | 'connected' }) => {
      logger.info('y-socket.io connect status', status)

      const connected = status === 'connected'
      if (useStore.getState().cooperationConnected !== connected) {
        updateStore({ cooperationConnected: connected })
      }
      if (connected) { cooperationConnected$.complete() }
    })

    cooperation.on('sync', (isSync: boolean) => {
      logger.info('y-socket.io sync', isSync)

      if (useStore.getState().documentSynced !== isSync) {
        updateStore({ documentSynced: isSync })
      }
      if (isSync) { cooperationSynced$.complete() }
    })

    /**
     * - have local persistent, exist in store.documents, use it
     * - no local persistent, fetch and merged from remote, 
     *     so not exist in store.documents, insert it and use it
     * - no local persistent or remote, not in store.documents, create it
     * - no local persistent or remote, exist in store.documents, it's lost, create it
     */
    const loadOrCreateDocument = (id: string) => {
      const documents = store.get('documents')!
      const doc = documentDoc.getMap()
      const document = doc.get('document')

      logger.info(`try to load document ${id}`, document, document?.get('id'))

      if (!document || (document.get('id') !== id)) {
        logger.info(`create new document (${id})`)

        const { document, page } = createDefaultDocumentPage(id)
        store.set('currentPageId', page.id)
        doc.set('document', toSharedTypes(document))

        documents.set(id, toSharedTypes({
          id: document.id,
          name: document.name,
          size: 0,
        }))

        return
      }

      if (!documents.get(id)) {
        logger.info(`insert remote new document (${id}) to store.documents`)
        documents.set(id, toSharedTypes({
          id: doc.get('document')!.get('id')!,
          name: doc.get('document')!.get('name')!,
          size: 0,
        }))
      }
    }

  }, [id, store, document])
}

export const newDocument = (id?: string): DocumentData => ({
  id: id ?? nanoid(),
  name: 'Untitled',
  type: NodeType.Document,
  pages: {},
})

export const createDefaultDocumentPage = (id?: string) => {
  const frame: FrameData = newFrame()
  const page: PageData = newPage()
  const document: DocumentData = newDocument(id)

  page.nodes[frame.id] = frame
  page.children.push(frame.id)
  // hack page id for stable when create in default
  page.id = document.id
  document.pages[page.id] = page

  return {
    document,
    page,
  }
}
