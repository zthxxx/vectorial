import { ReactElement } from 'react'

import {
  Pen,
} from '@vectorial/whiteboard/assets/icon'
import {
  ToolDefine,
} from '../types'


export class VectorTool extends ToolDefine {
  public name: string = 'VectorTool'
  public label: string = 'Vector Pen'
  public hotkey: string[] = ['KeyP']
  public hotkeyLabel: string = 'P'

  public get icon(): ReactElement | null {
    return (
      <Pen className='w-6 h-6' />
    )
  }
}
