import { FC, useEffect, memo } from 'react'
import {
  useOutlet,
} from 'react-router-dom'
import {
  atom,
  useAtom,
  useAtomValue,
} from 'jotai'
import { Spin } from '@vectorial/whiteboard/components'
import {
  useRootDoc,
  cooperationAtom,
} from '@vectorial/whiteboard/model'
import { logger } from '@vectorial/whiteboard/utils'


const layoutLoadingAtom = atom<boolean>(true)

const useLoading = () => {
  const { store, documents } = useRootDoc()
  const [loading, setLoading] = useAtom(layoutLoadingAtom)

  useEffect(() => {
    if (store && documents && loading) {
      setTimeout(
        () => setLoading(false),
        // time to loading documents from peers
        2500,
      )
    }
  }, [store, documents, loading])

  return loading
}

export const HomeLayout: FC = memo(() => {
  const outlet = useOutlet()
  const loading = useLoading()

  if (!loading) {
    logger.info('Layout load, state initiated')
  }

  return (
    <div className='w-full h-full flex justify-center items-center'>
      {loading
        ? <Spin />
        : outlet
      }
    </div>
  )
})

export default HomeLayout
