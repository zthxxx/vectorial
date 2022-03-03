import {
  Pane as TweakPane,
  FolderApi,
  TabApi,
  TabPageApi,
} from 'tweakpane'
import * as EssentialsPlugin from '@tweakpane/plugin-essentials'

export class Pane {
  public pane: TweakPane
  public tab: TabApi

  public paramters: TabPageApi
  public actions: FolderApi
  public shape: FolderApi
  public fill: FolderApi
  public stroke: FolderApi
  public shadow: FolderApi
  public blur: FolderApi
  public export: FolderApi

  public develop: TabPageApi
  public misc: FolderApi
  public lastEvent: FolderApi


  constructor() {
    this.pane = new TweakPane()

    this.pane.registerPlugin(EssentialsPlugin);
    this.tab = this.pane.addTab({
      pages: [
        { title: 'Develop' },
        { title: 'Parameters' },
      ],
    })

    this.paramters = this.tab.pages[1]
    this.develop = this.tab.pages[0]

    this.actions = this.paramters.addFolder({ title: 'Actions' })
    this.shape = this.paramters.addFolder({ title: 'Shape' })
    this.fill = this.paramters.addFolder({ title: 'Fill' })
    this.stroke = this.paramters.addFolder({ title: 'Stroke' })
    this.shadow = this.paramters.addFolder({ title: 'Shadow' })
    this.blur = this.paramters.addFolder({ title: 'blur' })
    this.export = this.paramters.addFolder({ title: 'export' })

    this.misc = this.develop.addFolder({ title: 'Misc' })
    this.lastEvent = this.develop.addFolder({ title: 'Last Event' })
  }
}
