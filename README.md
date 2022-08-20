# Basic Backend Scaffolding

***Express*** server built on ***SQLite3*** database w/ basic **CRUD** API, **web GUI** & **user management**.
Includes ***Passport*** session authentication, ***Morgan*** console/file logging & ***pug*** view templating.

---

## Customizing

### Get Started
 1. Update `package.json` info (ie. `name`, `version`, `author`, `license`, `repository`)
 2. Create `.env` file _(see below guide)_
 3. Run `npm -g i nodemon` _(if you don't have nodemon)_
 4. Run `npm run dev-cert` _(or disable secure dev environment in internal/config/server.cfg.isSecure)_
 5. Run server `npm run dev` & navigate to `[DOMAIN]/login/` in browser _(if blocked by browser, type `thisisunsafe` anywhere on the page)_
 6. Enter credentials to create an initial ***admin*** _(Must be done in `run dev` mode)_
 7. Navigate to ***Users*** to setup users/permissions
 8. Replace `public/images/logo.png`, then [regenerate favicons](https://realfavicongenerator.net/) in `public/root`

### Add a DB Model
 1. Copy `models/Base.js` as a starting point.
 2. Update name & options object (Must at least define `types` object).
 3. Add to `models/_all.js` to connect to API/GUI automtically.
 4. Copy `testing/endpoint/base` to test API endpoints _(Or use `testApi.sh` to debug)_

### Deploy to Production
 1. Recommend using **pm2** to ensure Restart button works
 2. Update `ecosystem.config.js` if needed
 3. Create production `.env` _(see below guide)_
 4. Run using `npm start`, stop with `npm stop` _(Save w/ pm2 to always run)_
 5. Setup **NGINX** as reverse proxy/load distro _(Check it passes IPs/uses pm2 forks)_
 6. Setup **Let's Encrypt** to create SSL certificate for https

---

## .env Variables
Rename `.env.demo.dev`/`.prod` to `.env` as a starting point depending on environment.

##### _Can also be set via `/admin/settings`. Defaults are in [brackets]._
```shell
NODE_ENV=[development]|production|test
port=[8080]
LOG_CONSOLE=verbose|http|[info]|warn|error|none
LOG_FILE=verbose|http|info|[warn]|error|none
LOG_HTTP=debug|combined|[common]|dev|short|tiny|none
SESSION_SECRET=[secret]
DB_SECRET=[secret]
DB_DIR=[<project-dir>/.db]
LOG_DIR=[<project-dir>/.logs]
```

---

## npm Scripts
##### _Call using `npm [script]`._
| Script | Description |
|------|------|
|`run dev`|Start single server instance that will auto-restart on file updates|
|`start`|Start PM2 server instances _(Runs in bgd if you exit terminal)_|
|`stop`|Stop all bgd PM2 server instances|
|`restart`|Full PM2 restart _(Updates env)_|
|`run reload`|0-downtime PM2 reload _(Doesn't update env)_|
|`test`|Run Jest tests|
|`run unlock-user [name]`|Unlock user _(Users.unlock.js must be enabled first)_|

---

## Automatic API Routes
`[Domain]/api/[model]/...`
##### _Header must include `{ Authorization: "Bearer <token>" }` with valid API token._

| URL | Method | Body | Return | Description |
|------|------|------|------|------|
|`/`|`POST`|`{...data}`|`{ id }`|Create|
|`/`|`GET`| |`[{...data}]`|Read all|
|`/[id]`|`GET`| |`{...data}`|Read|
|`/[id]`|`PUT`|`{...data}`|`{ success }`|Update|
|`/[id]`|`DELETE`| |`{ success }`|Delete|
|`/swap`|`POST`|`{ id, swap }`|`{ success }`|Swap IDs _(`swap` = ID)_|


---

## Automatic GUI Routes

`[Domain]/...`
| User URL | Description |
|------|------|
|`/`|Simple splash page|
|`/login`|Login to User/Admin GUI|
|`/logout`|Logout of GUI|

### User GUI
`[Domain]/gui/...`
##### _Must login as user with `GUI` access._
| User URL | Description |
|------|------|
|`/db`|Index of all models|
|`/db/[model]`|Basic database editor for model|
|`/profile`|Current user profile editor|

### Admin GUI
`[Domain]/admin/...`
##### _Must login as user with `ADMIN` access._
| Admin URL | Description |
|------|------|
|`/settings`|Change server settings & reboot|
|`/users`|User table editor|
|`/logs`|Index of log files|
|`/logs/[log]`|Basic log viewer|

---

### Credits
 - **Logo Image**: [Backend icons created by kerismaker - Flaticon](https://www.flaticon.com/free-icons/backend)
 - **Framework**: [Express](https://expressjs.com/)
 - **Database**: [SQLite3](https://www.sqlite.org/index.html) & [SQLCipher](https://www.zetetic.net/sqlcipher/)
 - **Authentication**: [Passport](https://www.passportjs.org/)
 - **HTML Templating**: [Pug](https://pugjs.org/api/getting-started.html)
 - **Logging**: [Winston](https://github.com/winstonjs/winston) & [Morgan](https://github.com/expressjs/morgan)

 ---

 # TO DO:
 - Follow up w/ other issues in **Snyk**
 - Deploy & add **deployment** steps to **README** (ie. NGINX, Let's Encrypt, etc)