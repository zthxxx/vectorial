import {
  nanoid,
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
