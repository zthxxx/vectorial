
import type { Viewport } from 'pixi-viewport'
import { Plugin } from 'pixi-viewport'
import { Observable } from 'rxjs'
import {
  filter,
  tap,
} from 'rxjs/operators'
import type {
  FolderApi,
  MonitorBindingApi,
} from 'tweakpane'
import {
  InteractionEvent,
  EventKeyMatch,
  KeyTriggerType,
  MouseTriggerType,
} from './event'
import {
  SelectTool,
} from './select-tool'
import {
  VectorTool,
} from './vector-tool'


export interface ToolDefine {
  /** pixi-viewport plugin name */
  name: string;
  /** label to display */
  label: string;
  match: EventKeyMatch;
}

export const ToolList: ToolDefine[] = [
  {
    name: SelectTool.name,
    label: 'Move Tool',
    match: {
      modifiers: [],
      keys: ['KeyV'],
      mouse: [],
    },
  },
  {
    name: VectorTool.name,
    label: 'Vector Tool',
    match: {
      modifiers: [],
      keys: ['KeyP'],
      mouse: [],
    },
  },
]

export interface ToolboxProps {
  pane: FolderApi;
  interactionEvent$: Observable<InteractionEvent>;
  toolList?: ToolDefine[];
}

export class Toolbox extends Plugin {
  public status: string = ''
  private stateBlade: MonitorBindingApi<string>
  private interactionEvent$: Observable<InteractionEvent>
  public toolList: ToolDefine[]
  public actived?: string

  constructor(parent: Viewport, props: ToolboxProps) {
    const {
      pane,
      interactionEvent$,
      toolList = ToolList,
    } = props
    super(parent)
    this.interactionEvent$ = interactionEvent$
    this.toolList = toolList

    this.stateBlade = pane.addMonitor(this, 'status', {
      label: 'Tool',
      interval: 0,
    })

    this.setupTools()
  }

  public setupTools() {
    this.interactionEvent$.pipe(
      filter(event => (
        event.key?.type === KeyTriggerType.Down
        || event.mouse?.type === MouseTriggerType.Down
      )),
      tap(event => {
        const tool = this.toolList.find(
          item => event.match(item.match),
        )
        if (!tool) return
        this.switchTool(tool)
      }),
    ).subscribe()
  }

  public switchToolByName(name: string) {
    const tool = this.toolList.find(
      item => item.name === name,
    )
    if (!tool) return
    this.switchTool(tool)
  }

  public switchTool(tool: ToolDefine) {
    this.status = tool.label
    this.stateBlade.refresh()
    const plugin = this.parent.plugins.get(tool.name)
    if (!(plugin && plugin.paused)) return
    if (this.actived) {
      this.parent.plugins.get(this.actived)?.pause()
    }
    plugin?.resume()
    this.actived = tool.name
  }
}
