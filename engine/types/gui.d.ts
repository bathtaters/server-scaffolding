import type { EnvSettings } from './process.d'
import type { Definition } from './Model'

export type FormDefinition = {
    default?: string,
    html: {
        type: Definition['html'],
        limits?: Definition['limits'],
        readonly?: boolean,
    },
    tooltip?: string,
    formDefault?: string,
}