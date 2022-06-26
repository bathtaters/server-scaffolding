# Basic Backend Scaffolding

***Express*** server built on ***SQLite3*** database w/ basic **CRUD** API, **web GUI** & **user management**.
Includes ***Passport*** session authentication, ***Morgan*** console/file logging & ***pug*** view templating.

---

## Customizing

### Get Started
 1. Update `package.json` info (ie. `name`, `version`, `author`, `license`, `repository`)
 2. Create `.env` file _(see below guide)_
 3. Run `npm -g i nodemon` _(if you don't have nodemon)_
 4. Run server `npm start` & navigate to `[DOMAIN]/login/` in browser
 5. Enter credentials to create an initial `ADMIN` user
 6. Navigate to ***Users*** to manage users

### Add a DB Model
 1. Copy `models/Base.js` as a starting point.
 2. Add entries in `config/models.cfg.js` to define schema/types, default values & limits for input validation.
 3. Add to `models/_all.js` to connect to API/GUI automtically.

### Deploy to Production
 1. Recommend using pm2 to ensure Restart button works
 2. Update `pm2.json` info (ie. `name`, `cwd`, `*_file`)
 3. Create production `.env`
 4. Run using `pm2 start pm2.json`

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

## .env Variables
##### _Defaults are in [brackets]._
```
NODE_ENV=[development]|production|test
port=[8080]
LOG_CONSOLE=verbose|http|[info]|warn|error|none
LOG_FILE=verbose|http|info|[warn]|error|none
LOG_HTTP=debug|combined|[common]|dev|short|tiny|none
SESSION_SECRET=[secret]
DB_DIR=[<project-dir>/.db]
LOG_DIR=[<project-dir>/.logs]
```

---

### *TO DO:*
 - Add **accordion styling** to log Errors
 - Allow **restricting** user access by **model** _(create 'modelList' = [] & 'modelAllowList' = false for each user)_
 - Add **unit testing** for utils/services
 - Add **endpoint testing** for API & GUI form/login routes
 - Test deploying w/ **pm2** _(Does Restart Server still work?)_

---

### Credits
Backend Favicon: [Backend icons created by kerismaker - Flaticon](https://www.flaticon.com/free-icons/backend)