
import {
  Awareness,
} from 'y-protocols/awareness'
import {
  nanoid,
  toSharedTypes,
} from '@vectorial/whiteboard/utils'
import {
  User,
  UserAwareness,
  LocalStore,
} from './types'

export const userColors: string[] = [
  '#ffbc42',
  '#ffaC2f',
  '#1be5c1',
  '#6eeb83',
  '#5ea800',
  '#ee6352',
  '#fa169f',
  '#e800ed',
  '#9300ed',
  '#30bced',
  '#1b84e5',
  '#333333',
]

export const getRandColor = (): string => (
  userColors[Math.floor(Math.random() * userColors.length)]
)

/**
 * simple work and non-secure
 * https://stackoverflow.com/questions/6122571/simple-non-secure-hash-function-for-javascript
 */
const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash<<5)-hash)+char
      hash = hash & hash
  }
  return Math.abs(hash)
}

const userColorMap: { [uid: string]: string } = {}

export const getUidColor = (uid: string | number): string => {
  if (!userColorMap[uid]) {
    const index = typeof uid === 'string'
      ? simpleHash(uid)
      : uid
    userColorMap[uid] = userColors[index % userColors.length]
  }
  return userColorMap[uid]
}

export const fakerUserNames: string[] = [
  'Saber',
  'Archer',
  'Lancer',
  'Rider',
  'Caster',
  'Assassin',
  'Berserker',
  'Ruler',
  'Avenger',
  'Shielder',
  'Beast',
]


export const getRandName = (): string => (
  fakerUserNames[Math.floor(Math.random() * fakerUserNames.length)]
)

export const initUser = async (store: LocalStore): Promise<User> => {
  /**
   * mock user here
   * @TODO fetch real user data from server
   */
  const user: User = {
    id: nanoid(),
    name: getRandName(),
  }
  store.set('user', toSharedTypes(user))
  return user
}


export type ClientAwareness = [Awareness['clientID'], UserAwareness][]

export const filterUserAwareness = ({
  awareness,
  pageId,
}: {
  awareness: Awareness;
  pageId: string;
}): ClientAwareness => {
  return ([...awareness.getStates().entries()] as ClientAwareness)
    .filter(([clientID, user]: [number, UserAwareness]) => (
      clientID
      && clientID !== awareness.clientID
      && user.pageId === pageId
      // by initial connect, user may be empty object
      && user.id && user.name && user.position
    ))
}
