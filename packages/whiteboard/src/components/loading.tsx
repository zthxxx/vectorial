import {
  Spin,
} from './spinner'


export const Loading = ({ message }: { message?: string }) => (
  <div
    className='flex flex-col justify-center items-center'
  >
    <Spin />
    <div
      className='text-gray-500 text-sm h-6'
    >
      {message}
    </div>
  </div>
)