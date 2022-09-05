Custom routes for server.init

Example:

```js
const router = require('express').Router()
const { checkAuth } = require('../../engine/middleware/auth.middleware')
const { access } = require('../../engine/config/users.cfg')
const { gui } = require('../config/urls.cfg')

const router = Router()

router.use(checkAuth(gui.root.login, access.gui))

// Add routes here

module.exports = router
```