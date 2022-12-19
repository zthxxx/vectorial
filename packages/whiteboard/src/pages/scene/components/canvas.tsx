import { memo } from 'react'
import {
  useStore,
} from '@vectorial/whiteboard/model'


export const CanvasContainer = memo(() => {
  const setState = useStore.setState

  return (
    <div
      className="absolute w-full h-full overflow-hidden"
      ref={(ref) => setState({ sceneContainer: ref })}
    />
  )
})
