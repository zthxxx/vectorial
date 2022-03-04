import {
  nanoid,
  toSharedTypes,
} from '@vectorial/whiteboard/utils'
import {
  User,
  SharedStore,
} from './types'

export const userColors: string[] = [
  '#ffbc42',
  '#6eeb83',
  '#30bced',
  '#ecd444',
  '#ee6352',
  '#9ac2c9',
  '#8acb88',
  '#1be7ff',
]

export const getRandColor = (): string => (
  userColors[Math.floor(Math.random() * userColors.length)]
)

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

export const initUser = (store: SharedStore): User => {
  const user: User = {
    id: nanoid(),
    name: getRandName(),
  }
  store.set('user', toSharedTypes(user))
  return user
}
