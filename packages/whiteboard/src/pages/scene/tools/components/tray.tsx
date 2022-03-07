import { FC, HTMLAttributes } from 'react'

export interface TrayProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  active?: boolean;
  disable?: boolean;
}

export const Tray: FC<TrayProps> = ({ active, disable, className,  ...props }) => (
    <div
      {...props}
      className={[
        `
          flex justify-center items-center
          w-10 h-10
          rounded-md
        `,
        disable && `text-gray-300 pointer-events-none`,
        !disable && active && `bg-pink-400 text-white`,
        !disable && !active && `
          text-gray-700
          hover:text-pink-400
        `,
        className,
      ].filter(Boolean).join(' ')}
    />
)
