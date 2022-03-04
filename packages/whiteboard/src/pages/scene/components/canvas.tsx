import { useEffect, useRef, RefObject, memo } from 'react'
import { atom, useSetAtom } from 'jotai'

export const containerAtom = atom<HTMLDivElement | null>(null)

export const CanvasContainer = memo(() => {
  const setRef = useSetAtom(containerAtom)

  return (
    <div
      className="absolute w-full h-full overflow-hidden"
      ref={(ref) => setRef(() => ref)}
    />
  )
})
