import { ComponentType, forwardRef } from 'react'


const joinTemplates = (
  template: TemplateStringsArray,
  templateElements: (string | undefined | null)[],
): string => {
  return template.reduce((acc, cur, i) => {
    const element = templateElements[i] ?? ''
    return acc + cur + element
  })
}

export const tailwind = <T extends ComponentType<any>>(Component: T):
  (
    <Props extends object = {}>(
      template: TemplateStringsArray,
      ...templateElements: ((props: React.ComponentPropsWithRef<T> & Props) => string | undefined | null)[]
    ) => T
  ) => {
  return (template, ...templateElements) => {

    const Styled: T = forwardRef<any, any>((props, ref) => (
      <Component
        {...props}
        ref={ref}
        className={[
          joinTemplates(template, templateElements.map(fn => fn(props))),
          props.className,
        ].filter(Boolean).join(' ')}
      />
    )) as ComponentType<any> as T

    Styled.displayName = Component.displayName || Component.name || 'TailwindStyledComponent'

    return Styled
  }
}
