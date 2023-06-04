import hat from 'hat'
import { randomBytes } from 'crypto'

export const generateToken = () => hat()

export const generateSalt = () => randomBytes(32).toString('base64url')