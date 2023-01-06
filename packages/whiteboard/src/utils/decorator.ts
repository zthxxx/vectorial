import { isEqual } from 'lodash-es'
import * as Y from 'yjs'
import {
  YMap,
  toSharedTypes,
  YEventAction,
} from './yjs'

// https://github.com/tc39/proposal-decorators#class-auto-accessors
export type ClassAutoAccessorDecorator<This, Value> = (
  value: ClassAccessorDecoratorTarget<This, Value>,
  context: ClassAccessorDecoratorContext<This, Value>,
) => ClassAccessorDecoratorResult<This, Value>


export type ClassSetterDecorator<This, Value> = (
  setter: (this: This, value: Value) => void,
  context: ClassSetterDecoratorContext<This, Value>
) => typeof setter | void;

export const onSet = <This, Value>(
  callback: (this: This, value: Value) => void,
): ClassAutoAccessorDecorator<This, Value> => {
  return function(target, context) {
    return {
      get: target.get,
      set(value) {
        target.set.call(this, value)
        callback.call(this, value)
      },
    }
  }
}

export const binding = <
  This extends { binding: YMap<any> },
  Value extends string | number | boolean | null | undefined | object,
>(option?: {
  /**
   * changed by instance,
   * data flow: instance -> binding -> onChange()
   */
  onChange?: (this: This, value: Value) => void;
  /**
   * sync updated by binding,
   * data flow: binding -> onUpdate() -> instance -> onChange()
   */
  onUpdate?: (this: This, params: {
    /** current value */
    value: Value;
    action: YEventAction;
  }) => void;
}): ClassAutoAccessorDecorator<This, Value> => {
  const {
    onChange,
    onUpdate,
  } = option ?? {}

  return function(target, context) {
    const field = context.name as string

    if (onUpdate) {
      context.addInitializer(function() {
        this.binding.observe((event, transaction) => {
          /**
           * ignore self trigger update.
           * not set origin in transact manually,
           * so origin will be null in local client, but be Room from remote
           */
          if (!transaction.origin) return

          const action = event.keys.get(field)
          if (action) {
            const data = this.binding.get(field)
            onUpdate.call(this, {
              value: data instanceof Y.Map
                ? data.toJSON()
                : data,
              action: action.action,
            })
          }
        })
      })
    }

    return {
      get() {
        const data = this.binding.get(field)
        return data instanceof Y.Map
          ? data.toJSON()
          : data
      },
      set(value) {
        if (this.binding.get(field) === value) return

        this.binding.set(field, typeof value === 'object'
          ? toSharedTypes(value)
          : value
        )

        onChange?.call(this, value)
      },
    }
  }
}


export const bindingSetter = <
  This extends { binding: YMap<any> },
  Value extends string | number | boolean | null | undefined | object,
>(option?: {
  /**
   * sync updated by binding,
   * data flow: binding -> onUpdate() -> instance
   */
  onUpdate?: (this: This, params: {
    /** current value */
    value: Value;
    action: YEventAction;
  }) => void;
  /**
   * changed by instance,
   * data flow: instance -> binding -> onChange()
   */
  onChange?: (this: This, value: Value) => void;
}): ClassSetterDecorator<This, Value> => {
  const {
    onChange,
    onUpdate,
  } = option ?? {}

  return function(setter, context) {
    const field = context.name as string

    if (onUpdate) {
      context.addInitializer(function() {
        this.binding.observe((event, transaction) => {
          /**
           * ignore self trigger update.
           * not set origin in transact manually,
           * so origin will be null in local client, but be Room from remote
           */
          if (!transaction.origin) return

          const action = event.keys.get(field)
          if (action) {
            const data = this.binding.get(field)
            onUpdate.call(this, {
              value: data instanceof Y.Map
                ? data.toJSON()
                : data,
              action: action.action,
            })
          }
        })
      })
    }

    return function(value: Value) {
      setter.call(this, value)

      const data = this.binding.get(field)
      const current = data instanceof Y.Map
        ? data.toJSON()
        : data

      if (!isEqual(current, value)) {
        onChange?.call(this, value)
      }
    }
  }
}
