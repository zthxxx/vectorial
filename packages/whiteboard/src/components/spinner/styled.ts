import styled from '@emotion/styled'


export const SpinIcon = styled.div<{ size: number, color?: string }>`
  @keyframes ball-clip-rotate-multiple-rotate {
    0% {
      transform: translate(-50%, -50%) rotate(0deg);
    }
    50% {
      transform: translate(-50%, -50%) rotate(180deg);
    }
    100% {
      transform: translate(-50%, -50%) rotate(360deg);
    }
  }

  margin: 20px;

  &,
  & > div {
    position: relative;
    box-sizing: border-box;
  }
  & {
    display: block;
    font-size: 0;
    color: ${({ color }) => color ?? '#679'};
  }
  & > div {
    display: inline-block;
    float: none;
    background-color: currentColor;
    border: 0 solid currentColor;
  }
  & {
    width: ${({ size }) => size}px;
    height: ${({ size }) => size}px;
  }
  & > div {
    position: absolute;
    top: 50%;
    left: 50%;
    background: transparent;
    border-style: solid;
    border-width: ${props => props.size / 16}px;
    border-radius: 100%;
    animation: ball-clip-rotate-multiple-rotate 1s ease-in-out infinite;
  }
  & > div:first-of-type {
    position: absolute;
    width: ${({ size }) => size}px;
    height: ${({ size }) => size}px;
    border-right-color: transparent;
    border-left-color: transparent;
  }
  & > div:last-of-type {
    width: ${props => props.size / 2}px;
    height: ${props => props.size / 2}px;
    border-top-color: transparent;
    border-bottom-color: transparent;
    animation-duration: .5s;
    animation-direction: reverse;
  }
`
