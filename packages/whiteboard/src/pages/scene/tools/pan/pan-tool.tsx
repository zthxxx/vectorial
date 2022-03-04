import { ReactElement } from 'react'

import {
  Hand,
} from '@vectorial/whiteboard/assets/icon'
import {
  ToolDefine,
} from '../types'


export class PanTool extends ToolDefine {
  public name: string = 'PanTool'
  public label: string = 'Move Hand'
  public hotkey: string[] = ['KeyH']
  public hotkeyLabel: string = 'H'

  public get icon(): ReactElement | null {
    return (
      <Hand className='w-6 h-6' />
    )
  }
}
