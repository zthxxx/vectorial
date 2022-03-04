import {
  NodeType,
  PageData,
  DocumentData,
} from '@vectorial/whiteboard/model'
import {
  SharedMap,
} from '@vectorial/whiteboard/utils'
import {
  BaseNodeMixin,
} from './mixin'
import {
  DocumentNode as DocumentNodeType,
} from './types'
import { PageNode } from './page'


export interface DocumentNodeProps extends Partial<DocumentData> {
  binding: SharedMap<DocumentData>
}

export class DocumentNode extends BaseNodeMixin() implements DocumentNodeType {
  declare type: NodeType.Document
  binding: SharedMap<DocumentData>
  pages: { [key: PageNode['id']]: PageNode }

  protected _pagesData: { [key: PageData['id']]: PageData }

  constructor(props: DocumentNodeProps) {
    const {
      binding,
      pages = {},
    } = props
    super(props)
    this.binding = binding
    this.type = NodeType.Document
    this._pagesData = pages
    this.pages = {}
  }

  createPage(page: PageData): PageNode | undefined {
    const pagesBinding = this.binding.get('pages')!
    const pageBinding = pagesBinding.get(page.id)
    if (!pageBinding) {
      return
    }
    const pageNode = new PageNode({
      ...page,
      binding: pageBinding,
    })
    this.pages[page.id] = pageNode
    return pageNode
  }

  add(page: PageNode): void {
    this.pages[page.id] = page
    this.binding.get('pages')!.set(page.id, page.binding)
  }

  get(id?: string): PageNode | undefined {
    if (!id) return
    const pagesBinding = this.binding.get('pages')!
    if (
      !this.pages[id]
      && this._pagesData[id]
      && pagesBinding.get(id)
    ) {
      return this.createPage(this._pagesData[id])
    }
    return this.pages[id]
  }

  delete(id: string): void {
    const page = this.get(id)!
    page.removed = true
    delete this.pages[id]
    this.binding.get('pages')!.delete(id)
  }

  serialize(): DocumentData {
    const pages: DocumentData['pages'] = Object.fromEntries(
      Object.values(this.pages)
      .map(page => [page.id, page.serialize()])
    )

    return {
      ...this.serializeBaseData(),
      type: NodeType.Document,
      pages,
    }
  }

  clone(): DocumentNode {
    return new DocumentNode({
      ...this.serializeBaseData(),
      type: NodeType.Document,
      binding: this.binding.clone(),
      pages: this._pagesData,
    })
  }
}
