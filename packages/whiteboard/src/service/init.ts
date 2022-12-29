import { useEffect } from 'react'
import {
  useNavigate,
} from 'react-router-dom'
import { shallow } from 'zustand/shallow'
import {
  useStore,
  DocumentData,
} from '@vectorial/whiteboard/model'
import {
  DocumentNode,
  PageNode,
} from '@vectorial/whiteboard/nodes'
import {
  nanoid,
  logger,
} from '@vectorial/whiteboard/utils'


export const useCheckToNewScene = (condition: boolean, id?: string | null) => {
  const navigate = useNavigate()

  useEffect(() => {
    if (condition) {
      navigate(`/scene/${id ?? genDocId()}`, { replace: true })
    }
  }, [condition, id])
}

export const genDocId = () => nanoid(16)



export const useGetDocumentPage = (documentId?: string): {
  documentNode?: DocumentNode;
  pageNode?: PageNode;
} => {
  const { store, documentDoc, updateStore, ...documentRef } = useStore(
    state => ({
      store: state.store,
      documentDoc: state.documentDoc,
      updateStore: state.updateStore,
      documentNode: state.documentNode,
      pageNode: state.pageNode,
    }),
    shallow,
  )

  if (documentRef.documentNode && documentRef.pageNode) {
    return documentRef
  }

  if (!documentId || !store || !documentDoc) return {}

  logger.info('Getting current page ...')

  const binding = documentDoc.get('document')!

  const documentData = binding.toJSON() as DocumentData
  logger.info(`Document (${documentId}) loaded.`, documentData)

  const documentNode = new DocumentNode({
    ...documentData,
    binding,
  })

  const pages = documentData.pages

  if (!pages[store.get('currentPageId')!]) {
    const firstPageId = Object.keys(pages)[0]
    store.set('currentPageId', firstPageId)
  }

  const currentPageId = store.get('currentPageId')!
  const pageNode = documentNode.get(currentPageId)!

  updateStore({
    documentNode,
    pageNode,
  })

  return {
    documentNode,
    pageNode,
  }
}

