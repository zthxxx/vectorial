import {
  useState,
  useRef,
  memo,
  useLayoutEffect,
} from 'react'
import { Observable, asyncScheduler } from 'rxjs'
import {
  filter,
  tap,
  map,
  throttleTime,
  distinctUntilChanged,
} from 'rxjs/operators'
import { isEqual } from 'lodash-es'
import {
  Awareness,
} from 'y-protocols/awareness'
import {
  Vector,
  Matrix,
  applyMatrix,
} from 'vectorial'
import {
  Arrow,
} from '@vectorial/whiteboard/assets/cursor'
import {
  UserAwareness,
  getUidColor,
  useStore,
  User,
  ClientAwareness,
  filterUserAwareness,
} from '@vectorial/whiteboard/model'
import {
  InteractEvent,
} from '@vectorial/whiteboard/scene'


export const Cursor = memo(({ clientID, user, viewMatrix }: {
  clientID: Awareness['clientID'];
  user: UserAwareness;
  viewMatrix: Matrix;
}) => {
  const { id, name, position } = user
  const positionRef = useRef<Vector | undefined>(position)

  const positionChange = !isEqual(positionRef.current, position)

  useLayoutEffect(() => {
    positionRef.current = position
  })

  if (!id || !name || !position) return null

  const color = getUidColor(clientID)
  const point = applyMatrix(position, viewMatrix)

  return (
    <div
      className={`
        absolute
        ease-linear duration-100
        ${positionChange ? 'transition-transform' : 'transition-none'}
      `}
      style={{
        top: 0,
        left: 0,
        transform: `translate(${point.x}px, ${point.y}px)`,
      }}
    >
      <Arrow
        className='absolute block text-4xl'
        style={{ color }}
      />
      <span
        className='
          absolute block
          top-6 left-5 px-1
          text-white text-xs
          rounded-sm drop-shadow-md
          whitespace-nowrap break-normal
        '
        style={{
          background: color,
          textShadow: 'rgb(0 0 0 / 25%) 1px 2px 2px',
        }}
      >
        {name}
      </span>
    </div>
  )
}, isEqual)


export const useUsersAware = ({ pageId, interactEvent$ }: {
  pageId: string;
  interactEvent$: Observable<InteractEvent>;
}): ClientAwareness => {
  const [initialized, setInitial] = useState(false)
  const [users, setUsers] = useState<ClientAwareness>([])
  const usersRef = useRef<ClientAwareness>(users)
  const store = useStore(state => state.store)
  const user: User | undefined = store?.get('user')?.toJSON()
  const awareness: Awareness | undefined = useStore(state => state.awareness)
  if (
    initialized
    || !user
    || !awareness
  ) return users

  interactEvent$.pipe(
    filter(event => Boolean(event.lastMouse)),
    map(event => event.lastMouse!),
    distinctUntilChanged((prev, next) => isEqual(prev, next)),
    throttleTime(150, asyncScheduler, { trailing: true }),
    tap(position => {
      const userAwareness: UserAwareness = {
        ...awareness.getLocalState() as UserAwareness,
        id: user.id,
        name: user.name,
        pageId,
        position,
      }
      awareness.setLocalState(userAwareness)
    }),
  ).subscribe()

  awareness.on('change', () => {
    const updatedUsers = filterUserAwareness({
      awareness,
      pageId,
    })
      .map(([uid, user]) => [uid, {
        id: user.id,
        name: user.name,
        pageId: user.pageId,
        position: user.position,
      }] as [Awareness['clientID'], UserAwareness])


    if (isEqual(updatedUsers, usersRef.current)) return
    usersRef.current = updatedUsers
    setUsers(updatedUsers)
  })

  setInitial(true)
  return users
}

export interface AwareCursorsProps {
  pageId: string;
  viewMatrix$: Observable<Matrix>;
  interactEvent$: Observable<InteractEvent>;
}

export const AwareCursors = memo(({
  pageId,
  viewMatrix$,
  interactEvent$,
}: AwareCursorsProps) => {
  const [matrix, setMatrix] = useState<Matrix | null>(null)
  const users = useUsersAware({ pageId, interactEvent$ })

  useLayoutEffect(() => {
    const pipe = viewMatrix$.subscribe(setMatrix)
    return () => pipe.unsubscribe()
  }, [])

  return (
    <div
     className='absolute top-0 left-0 pointer-events-none select-none'
    >
      {matrix && users.map(([clientID, user]) => (
        <Cursor
          key={clientID}
          clientID={clientID}
          user={user}
          viewMatrix={matrix}
        />
      ))}
    </div>
  )
})
