Custom routes for server.init

Example:

```ts
import { Router } from 'express'
import { checkAuth } from '../../engine/middleware/auth.middleware'
import { access } from '../../engine/config/users.cfg'
import { gui } from '../config/urls.cfg'

const router = Router()

router.use(checkAuth(gui.root.login, access.gui))

// Add routes here

export default router
```