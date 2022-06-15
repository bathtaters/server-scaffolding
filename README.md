# Basic Backend Scaffolding

Built on ***SQLite3*** database w/ basic **CRUD** API & simple **web GUI**.

### Get Started
 1. Update `package.json` info (ie. _name, version, author, license, repository_)
 2. Navigate to `[DOMAIN]/admin/login/`
 3. Enter credentials to create an initial `ADMIN` user
 4. Navigate to ***Users*** to create user profiles

### Add a DB Model
 1. Copy `models/Base.js` as a starting point.
 2. Add entries in `config/constants/validation.cfg.js` to define input validation.
 3. Add to `models/_all.js` to connect to API/GUI automtically.

---

## Automatic API Routes
`[Domain]/api/[model]/...`

| URL | Method | Body | Return | Description |
|------|------|------|------|------|
|`/`|`POST`|`{...data}`|`{ id }`|Create|
|`/`|`GET`| |`[{...data}]`|Read all|
|`/[id]`|`GET`| |`{...data}`|Read|
|`/[id]`|`PUT`|`{...data}`|`{ success }`|Update _(Only fields in `data`)_|
|`/[id]`|`DELETE`| |`{ success }`|Delete|
|`/swap`|`POST`|`{ id, swap }`|`{ success }`|Swap IDs _(`swap` = ID to swap with)_|

##### _**NOTE:** Header must include `{ Authorization: "Bearer <token>" }` with valid API token from valid domain._

---

## Automatic GUI Routes
`[Domain]/admin/...`

| URL | Description |
|------|------|
|`/login`|Login page|
|`/dashboard`|Index of all models|
|`/dashboard/[model]`|Basic database editor for model|
|`/users/profile`|Current user profile editor|
|`/users/logout`|Logout of GUI|
|`/users`|User table editor _(Requires `ADMIN` access)_|
##### _**NOTE:** Must login as user with `GUI` access._

---

### .env Variables
##### _Defaults are in [brackets]._
```
NODE_ENV=[development]|production|test
port=[8080]
MORGAN_CONSOLE=combined|common|dev|[short]|tiny
MORGAN_FILE=combined|[common]|dev|short|tiny
LOG_CONSOLE=debug|[info]|log|warn|error
LOG_FILE=debug|info|log|[warn]|error
SESSION_SECRET=[secret]
DB_DIR=[<project-dir>/.db]
LOG_DIR=[<project-dir>/.logs]
```

---

### *TO DO:*
 - Add **unit testing** for utils/services
 - Add **endpoint testing** for API & GUI form/login routes
 - Allow reading logs / changing levels / restarting server via GUI (admin only)

---

### Credits
Backend Favicon: [Backend icons created by kerismaker - Flaticon](https://www.flaticon.com/free-icons/backend)