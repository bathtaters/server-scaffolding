import BitMapFactory from "../libs/BitMap"
import BitMapObjFactory from "../libs/BitMapObj"
import { allModels } from "../src.import"

export const DEFAULT_ACCESS = 'default'
export const NO_ACCESS = 'none'

export const accessStrings = {
    read:  'r',
    write: 'w',
    [NO_ACCESS]: '-',
} as const

export const timestamps = {
    gui:  'gui',
    api:  'api',
    fail: 'fail',
} as const

export const Role = BitMapFactory(['api', 'gui', 'admin'], NO_ACCESS)

export const ModelAccess = BitMapObjFactory(
    allModels.map(({ title }) => title),
    [ NO_ACCESS, 'read', 'write' ],
    DEFAULT_ACCESS,
    accessStrings
)

export const anyAccess = ModelAccess.bitMap(ModelAccess.mask(NO_ACCESS))