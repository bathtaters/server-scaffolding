import BitMap, { BitMapInput } from '../libs/BitMap'
import { requirePassword } from '../config/users.cfg'
import { access, AccessTypes } from '../types/Users.d'

// TODO: Make BitMaps in Model auto-convert to BitMap class

const accessBitMap = new BitMap(access)
export default accessBitMap

export const passwordAccess = accessBitMap.create(requirePassword).int

export const accessInt = (accessArray: BitMapInput<AccessTypes>) => accessBitMap.create(accessArray).int
export const accessArray = (accessInt: BitMapInput<AccessTypes>) => accessBitMap.create(accessInt).values

export const hasAccess = (intA?: number, intB?: number) => intA && intB && !!(intA & intB)
