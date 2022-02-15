# npsr-inventory


## Migration

```bash
# run mariadb and phpmyadmin
docker-compose up -d
```

Run the command above and you will have your MariaDB and phpMyAdmin up and running

Now, create a user called `npsrinventorymgmt` and a database with the same name (refer to `src/lib/db.ts`)
And import the database structure (`npsrinventorymgmt.sql`) to it


## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```


## Building

For production, you can build this project as a Docker Image and attach it to your `docker-compose.yml`

```bash
# build as a docker image
docker build -t npsrinventorymgmt:latest .
```
