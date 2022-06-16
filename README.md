# Basic Backend Scaffolding

***Express*** server built on ***SQLite3*** database w/ basic **CRUD** API, **web GUI** & **user management**.
Includes ***Passport*** session authentication, ***Morgan*** console/file logging & ***pug*** view templating.

### Get Started
 1. Update `package.json` info (ie. `name`, `version`, `author`, `license`, `repository`)
 2. Create `.env` file _(see below guide)_
 3. Run server & navigate to `[DOMAIN]/login/` in browser
 4. Enter credentials to create an initial `ADMIN` user
 5. Navigate to ***Users*** to manage users

### Add a DB Model
 1. Copy `models/Base.js` as a starting point.
 2. Add entries in `config/models.cfg.js` to define schema/types, default values & limits for input validation.
 3. Add to `models/_all.js` to connect to API/GUI automtically.

---

## Automatic API Routes
`[Domain]/api/[model]/...`
##### _Header must include `{ Authorization: "Bearer <token>" }` with valid API token._

| URL | Method | Body | Return | Description |
|------|------|------|------|------|
|`/`|`POST`|`{...data}`|`{ id }`|Create|
|`/`|`GET`| |`[{...data}]`|Read all|
|`/[id]`|`GET`| |`{...data}`|Read|
|`/[id]`|`PUT`|`{...data}`|`{ success }`|Update _(Only fields in `data`)_|
|`/[id]`|`DELETE`| |`{ success }`|Delete|
|`/swap`|`POST`|`{ id, swap }`|`{ success }`|Swap IDs _(`swap` = ID to swap with)_|


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
|`/settings`|_[Coming soon]_ Change server settings & reboot|
|`/users`|User table editor|
|`/logs`|_[Coming soon]_ Index of log files|
|`/logs/[log]`|_[Coming soon]_ Basic log viewer|

---

## .env Variables
##### _Defaults are in [brackets]._
```
NODE_ENV=[development]|production|test
port=[8080]
REQ_CONSOLE=combined|common|dev|[short]|tiny|none
REQ_FILE=combined|[common]|dev|short|tiny|none
LOG_CONSOLE=debug|[info]|log|warn|error|none
LOG_FILE=debug|info|log|[warn]|error|none
SESSION_SECRET=[secret]
DB_DIR=[<project-dir>/.db]
LOG_DIR=[<project-dir>/.logs]
```

---

### *TO DO:*
 - **Split logs** daily (Add date to filename) _(Only create files when they're written to)_
 - **Admin GUI:** Allow reading logs / Changing .env vars & some constants / Restarting server
 - Add **unit testing** for utils/services
 - Add **endpoint testing** for API & GUI form/login routes
 - Allow **restricting** user access by **model**

---

### Credits
Backend Favicon: [Backend icons created by kerismaker - Flaticon](https://www.flaticon.com/free-icons/backend)