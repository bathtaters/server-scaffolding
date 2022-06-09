# Basic Backend Scaffolding

Built on ***SQLite3*** database w/ basic **CRUD** API & simple **web GUI**.

### Get Started
 1. Navigate to `[DOMAIN]/admin/login/`
 2. Enter credentials to create an initial `ADMIN` user
 3. Navigate to ***Users*** to create user profiles

### Add a DB Model
 1. Copy `models/Base.js` as a starting point.
 2. Add entries in `config/constants/validation.cfg.js` to define input validation.
 3. Add to `models/all.js` to connect to API/GUI automtically.

---

## Automatic API Routes
`[Domain]/api/[model]/...`

| URL | Method | Body | Return | Description |
|------|------|------|------|------|
|`/`|`POST`|`{ modelData }`|`{ id }`|Create|
|`/`|`GET`| |`[{ modelData }, ...]`|Read all|
|`/[id]`|`GET`| |`{ modelData }`|Read|
|`/[id]`|`PUT`|`{ newData }`|`{ success }`|Update _(Only fields in `newData`)_|
|`/[id]`|`DELETE`| |`{ success }`|Delete|
|`/swap`|`POST`|`{ id, swap }`|`{ success }`|Swap IDs _(`swap` = ID to swap with)_|
|`/form`|`POST`|`{ action, ...modelData }`|_[Redirect to dashboard]_|Submit Form, _(`action` = Add/Update/Remove/Reset)_|
##### _**NOTE:** Header must include `{ Authorization: "Bearer <token>" }` with valid API token from valid domain._

---

## Automatic GUI Routes
`[Domain]/admin/...`

| URL | Description |
|------|------|
|`/login`|Login page|
|`/dashboard`|Index of all models|
|`/dashboard/[model]`|Basic database editor for model|
|`/users`|User table editor _(Requires `ADMIN` access)_|
##### _**NOTE:** Must login as user with `GUI` access._

---

### .env Variables
```
NODE_ENV=development|production
port=8080
MORGAN_FMT=combined|common|dev|short|tiny
LOG_LEVEL=debug|info|log|warn|error
SESSION_SECRET=secretForExpressSession
DB_DIR=/var/db/sqlite3/my-server/
```

---

### *TO DO:*
 - Add **validation** to GUI & User routes
 - Add **CORS** support
 - Use **API Tokens**
 - Create custom **errors** with status codes
 - Add unit **testing**

---

### Credits
Backend Favicon: [Backend icons created by kerismaker - Flaticon](https://www.flaticon.com/free-icons/backend)