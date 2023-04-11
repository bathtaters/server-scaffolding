import { byModel } from './shared.validators'
import Users from '../models/Users'

export const login = byModel(Users, ['username', 'password'], { optionalBody: false })
