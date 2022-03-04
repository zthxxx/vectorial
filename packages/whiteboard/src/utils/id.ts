import { customAlphabet, urlAlphabet } from 'nanoid'

export const nanoid = customAlphabet(urlAlphabet.replace(/[_-]/g, ''), 10)

