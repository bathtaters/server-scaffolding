#!/bin/sh

# Path to repo parent folder (No trailing slash!)
repopath="$HOME/path/to/repo"


### SCRIPT ###

set -e
cd "$repopath"

# Update
echo
echo " *** UPDATING API *** "
git pull
npm install
npm update

# Build
npm run build

# Deploy
echo
echo " *** DEPLOYING API *** "
npm run stop
npm run start
