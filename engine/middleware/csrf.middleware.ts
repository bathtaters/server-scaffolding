import csrf from 'csurf'
import { csrfEnable } from '../config/server.cfg'

export default csrfEnable ? csrf() : undefined