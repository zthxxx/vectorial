import * as S from './styled'

export const Spin = ({ size = 32, color }: { size?: number, color?: string }) => {
  return (
    <S.SpinIcon
      size={size}
      color={color}
    >
      <div></div>
      <div></div>
    </S.SpinIcon>
  )
}
