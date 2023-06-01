
export const viewMetaKey = '_meta'

export const childLabel = { foreignId: 'fid', index: 'idx', value: 'val' } as const
export const childIndexType = 'int'

export const adapterTypes = {
    fromDB: 'fromDbAdapter',
    toDB:     'toDbAdapter',
    fromUI: 'fromUiAdapter',
    toUI:     'toUiAdapter',
} as const