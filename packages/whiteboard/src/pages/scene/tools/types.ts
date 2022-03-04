import { ReactElement } from 'react'
import {
  ScenePlugin,
  ScenePluginProps,
} from '@vectorial/whiteboard/scene'


export interface ToolProps extends ScenePluginProps {
  switchTool: (name: string) => void;
}

export abstract class ToolDefine extends ScenePlugin {
  /**
   * tool label to display
   */
  public abstract label: string
  /**
   * https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code/code_values
   */
  public abstract hotkey: string[]
  public abstract hotkeyLabel: string
  public switchTool: (name: string) => void

  constructor(props: ToolProps) {
    super(props)
    const {
      switchTool,
    } = props
    this.switchTool = switchTool
  }

  public get icon(): ReactElement | null {
    return null
  }
}
