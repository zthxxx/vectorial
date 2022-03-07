import { FC, HTMLAttributes } from 'react'

export interface BarProps extends HTMLAttributes<HTMLDivElement> {}

export const Bar: FC<BarProps> = ({ className, ...props }) => (
    <div
      {...props}
      className={[
        `
          absolute top-2 px-8 py-1
          flex justify-center items-center
          rounded-lg drop-shadow  bg-white
        `,
        className,
      ].filter(Boolean).join('')}
    />
)
