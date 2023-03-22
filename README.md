# Basic Backend Scaffolding

***Express*** server built on ***SQLite3*** database w/ basic **CRUD** API, **web GUI** & **user management**.
Includes ***Passport*** session authentication, ***Morgan*** console/file logging & ***pug*** view templating.

---

## Customizing

### Get Started
 1. Update `package.json` info (ie. `name`, `version`, `author`, `license`, `repository`)
 2. Create `.env` file _(see below guide)_
 3. Run `npm -g i nodemon` _(if you don't have nodemon)_
 4. Run `npm run dev-cert` _(only needed if using `.env:NODE_ENV=secure-dev`)_
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
 1. Clone repo `git clone` & `npm i`
 2. Ensure that **pm2** is installed globally
 3. Create production `.env` _(see below guide)_
 4. Connect **NGINX** to server _(see below guide)_
 5. Create certificate with [**Let's Encrypt**](https://www.nginx.com/blog/using-free-ssltls-certificates-from-lets-encrypt-with-nginx/): `sudo certbot --nginx -d URL.com -d www.URL.com`
 6. Start intially using `npm run dev` to create admin user
 7. Build using `npm run build`
 7. Then run using `npm start`, stop with `npm stop` _(`pm2 save` to run on startup)_
 8. Set TRUST_PROXY in `/admin/settings` to lowest number that shows your IP on Restart
 9. Update `upstream` section in **NGINX** config file w/ **pm2** servers _(see below)_
 ##### NOTE: If you wish to test w/o HTTPS, you must change **productionIsSecure** in `/engine/config/server.cfg.js` to ***false***

---

## .env Variables
Copy `.env.demo.dev`/`.prod` and rename to `.env` as a starting point depending on environment.
Update DB_SECRET before running (Changing this will make the entire database inaccessible).

##### _Can also be set via `/admin/settings`. Defaults are in [brackets]._
```ini
NODE_ENV=[development]|secure-dev|production|test
port=[8080]
LOG_CONSOLE=verbose|http|[info]|warn|error|none
LOG_FILE=verbose|http|info|[warn]|error|none
LOG_HTTP=debug|combined|[common]|dev|short|tiny|none
TRUST_PROXY=[0|true]|num|false|domain,list,...
SESSION_SECRET=[secret]
DB_SECRET=[secret]
DB_DIR=[<project-dir>/.db]
LOG_DIR=[<project-dir>/.logs]
```
##### Using `NODE_ENV=secure-dev` enables SSL/TLS using local certs _(from `npm run dev-cert`)_. **Clear all https cookies from localhost before changing this!**

---

## NGINX config

Create a config file for your reverse proxy: `/etc/nginx/sites-available/URL.com`, or add new `location` section in an existing config. 
###### Replace `URL.com` with your `domain name` & `:8080` with the `port`.
```nginx
limit_req_zone $binary_remote_addr zone=ip:10m rate=5r/s;

upstream myserver {
    least_conn;
    server 127.0.0.1:8080;
}

server {
    listen 80;
    listen [::]:80;
    server_name  URL.com www.URL.com;

    gzip             on;
    gzip_comp_level  3;
    gzip_types       text/plain text/css image/*;

    location / {
        limit_req zone=ip burst=12 delay=8;

        proxy_pass          http://myserver;

        proxy_http_version  1.1;
        proxy_set_header    Upgrade             $http_upgrade;
        proxy_set_header    Connection          'upgrade';
        proxy_set_header    X-Forwarded-Host    $host;
        proxy_set_header    X-Forwarded-Proto   $scheme;
        proxy_set_header    X-Forwarded-For     $proxy_add_x_forwarded_for;
        proxy_cache_bypass  $http_upgrade;
    }
}
```

Create symlink to config
```bash
ln -s /etc/nginx/sites-available/URL.com /etc/nginx/sites-enabled/
```

Once running pm2, add **server** lines to `upstream` section for each pm2 instance (Incrementing port)
```nginx
upstream myserver {
    least_conn;
    server 127.0.0.1:8080;
    server 127.0.0.1:8081;
    server 127.0.0.1:8082;
    ...
}
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
|`run test-api`|Run automated API tests _(Requires cURL)_|
|`run dev-cert`|Generate locally-signed HTTPS certificate ***(Dev use ONLY)***|
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
