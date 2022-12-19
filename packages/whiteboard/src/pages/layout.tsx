import { FC, useEffect, useState, memo } from 'react'
import {
  useOutlet,
} from 'react-router-dom'
import { Spin } from '@vectorial/whiteboard/components'
import {
  useRootDoc,
} from '@vectorial/whiteboard/model'
import { logger } from '@vectorial/whiteboard/utils'

const useLoading = () => {
  const { store, documents } = useRootDoc()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (store && documents && loading) {
      setTimeout(
        () => setLoading(false),
        // time to loading documents from peers
        1000,
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
