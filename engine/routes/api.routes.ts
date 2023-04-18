import { Router } from 'express'
import { create, read, update, remove, swap } from '../controllers/api.controllers'
import * as valid from '../validators/api.validators'
import authenticate from '../middleware/cors.middleware'
import { allModels, urlCfg } from '../src.import'

const router = Router()

allModels.forEach((Model) => {
  router.post(  `/${Model.url}`,                     authenticate(Model.title, 'write'), valid.all(Model),    create(Model)) // Create
  router.get(   `/${Model.url}`,                     authenticate(Model.title, 'read'),                       read(Model))   // Read (all)
  router.get(   `/${Model.url}/:${Model.primaryId}`, authenticate(Model.title, 'read'),  valid.idOnly(Model), read(Model))   // Read (one)
  router.put(   `/${Model.url}/:${Model.primaryId}`, authenticate(Model.title, 'write'), valid.idAll(Model),  update(Model)) // Update
  router.delete(`/${Model.url}/:${Model.primaryId}`, authenticate(Model.title, 'write'), valid.idOnly(Model), remove(Model)) // Delete
  router.post(  `/${Model.url}${urlCfg.api.swap}`,   authenticate(Model.title, 'write'), valid.swap(Model),   swap(Model))   // Swap IDs
})

export default router