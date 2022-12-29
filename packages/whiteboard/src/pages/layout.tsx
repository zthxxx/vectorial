import { FC, memo } from 'react'
import {
  useOutlet,
} from 'react-router-dom'

export const HomeLayout: FC = memo(() => {
  const outlet = useOutlet()

  return (
    <div className='w-full h-full flex justify-center items-center'>
      {outlet}
    </div>
  )
})

export default HomeLayout
