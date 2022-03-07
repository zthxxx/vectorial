import { useState, useEffect } from 'react'
import { Observable } from 'rxjs'

export const useSubscribe = <T>(observable: Observable<T>): T | undefined => {
  const [value, setValue] = useState<T>()
  useEffect(() => {
    const subscription = observable.subscribe(setValue)
    return () => subscription.unsubscribe()
  }, [observable])

  return value
}
