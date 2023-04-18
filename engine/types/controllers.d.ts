import type { ProfileActions } from './gui.d'
import type { ModelBase } from '../models/Model'

export type ControllerCallback<T extends Record<string,any>> =
  (data: T, user?: Express.User, action?: ProfileActions) => Partial<Record<keyof T,any>> | undefined

export type GuiOptions<T extends Record<string,any>> = {
    view?: string,
    partialMatch?: boolean,
    overrideDbParams?: Record<string, any>,
    formatData?: ControllerCallback<T>
}

export type FormOptions<T extends Record<string,any>> = {
    redirectURL?: string,
    formatData?: ControllerCallback<T>
}

export type ModelGuiBase    = Pick<ModelBase, 'title'|'primaryId'|'url'|'schema'|'getPageData'|'find'>
export type ModelFormBase   = Pick<ModelBase, 'primaryId'|'addAndReturn'|'update'|'remove'|'create'>
export type ModelActionBase = Pick<ModelBase, 'schema'|'url'> & ModelFormBase