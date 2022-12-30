import { Polygon } from '@pixi/math'
import {
  type SVGPathNode,
  type Path,
  FILL_RULE,
} from '@pixi-essentials/svg'


export const evenOddFill = (node: SVGPathNode) => {
    // https://github.com/ShukantPal/pixi-essentials/blob/v1.1.6/packages/svg/src/SVGPathNode.ts#L331-L336

    // @ts-expect-error  `currentPath2` is define as private any in `SVGPathNode`, but we need use it
    const currentPath: Path = node.currentPath2
    if (currentPath) {
      currentPath.fillRule = FILL_RULE.EVENODD
      node.drawShape(currentPath as any as Polygon)
      // @ts-expect-error  `currentPath2` is define as private any in `SVGPathNode`, but we need use it
      node.currentPath2 = null
    }
}