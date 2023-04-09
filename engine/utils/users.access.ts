import BitMap, { BitMapInput } from '../libs/BitMap'
import { requirePassword } from '../config/users.cfg'
import { access, AccessType } from '../types/Users.d'

// TODO: Make BitMaps in Model auto-convert to BitMap class
// TODO: Rename: access (this, not modelAccess) -> groups | privlege | ...etc

const accessBitMap = new BitMap(access)
export default accessBitMap

export const passwordAccess = accessBitMap.create(requirePassword).int

export const accessInt = (accessArray?: BitMapInput<AccessType>) =>
    accessArray == null ? 0 : accessBitMap.create(accessArray).int

export const accessArray = (accessInt?: BitMapInput<AccessType>) =>
    accessInt   == null ? [] : accessBitMap.create(accessInt).values

export const hasAccess = (intA?: number, intB?: number) =>
    Boolean(intA && intB && intA & intB)
