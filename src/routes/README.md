Custom routes for server.init

Example:

```ts
import { Router } from 'express'
import { checkAuth } from '../../engine/middleware/auth.middleware'
import { Role } from '../../engine/types/Users'
import { gui } from '../config/urls.cfg'

const router = Router()

router.use(checkAuth(gui.root.login, Role.map.gui))

// Add routes here

export default router
```