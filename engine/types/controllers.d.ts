import type { ProfileActions } from './gui.d'
import type { GenericModel } from '../models/Model'

export type ControllerCallback<T extends Record<string,any>> =
  (data: T, user?: Express.User, action?: ProfileActions) => Partial<Record<keyof T,any>> | undefined

export type GuiOptions<T extends Record<string,any>> = {
    view?: string,
    partialMatch?: boolean,
    overrideDbParams?: Record<string, any>,
    formatData?: ControllerCallback<T>,
    formatParams?: ControllerCallback<T>,
}

export type ModelGuiBase    = Pick<GenericModel, 'title'|'primaryId'|'url'|'schema'|'getPageData'|'find'|'isChildModel'|'adaptData'>
export type ModelFormBase   = Pick<GenericModel, 'primaryId'|'addAndReturn'|'update'|'remove'|'create'>
export type ModelActionBase = Pick<GenericModel, 'schema'|'url'|'adaptData'> & ModelFormBase