import { useEffect } from 'react'
import {
  useNavigate,
} from 'react-router-dom'
import {
  useStore,
  createDefaultDocumentPage,
  DocumentData,
} from '@vectorial/whiteboard/model'
import {
  DocumentNode,
  PageNode,
} from '@vectorial/whiteboard/nodes'
import {
  nanoid,
  logger,
  toSharedTypes,
} from '@vectorial/whiteboard/utils'


export const useCheckToNewScene = (condition: boolean, id?: string | null) => {
  const navigate = useNavigate()

  useEffect(() => {
    if (condition) {
      navigate(`/scene/${id ?? genDocId()}`, { replace: true })
    }
  }, [condition, id])
}

export const genDocId = () => nanoid(18)


export const docsRef: {
  document?: DocumentNode,
  page?: PageNode,
} = {}


export const useGetDocumentPage = (id?: string): {
  document?: DocumentNode,
  page?: PageNode,
} => {
  const store = useStore(state => state.store)
  const documents = useStore(state => state.documents)

  if (!store || !documents || !id) return {}
  if (docsRef.document && docsRef.page) {
    return docsRef
  }

  if (store.get('currentDocId') !== id) {
    store.set('currentDocId', id)
  }

  if (!documents.get(id)) {
    logger.info(`Document of id ${id} missed, creating a default one ...`)
    const { document, page } = createDefaultDocumentPage(id)
    documents.set(id, toSharedTypes(document))
    store.set('currentPageId', page.id)
  }

  const binding = documents.get(id)!
  const documentData = binding.toJSON() as DocumentData
  logger.info(`Document ${id} loaded.`, documentData)

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

  docsRef.document = documentNode
  docsRef.page = pageNode

  return docsRef
}

