#!/usr/bin/env sh
# Creates the .env files docker-compose.yml requires (env_file: entries fail
# docker compose up outright if the file is missing) from their .example
# counterparts, when they don't already exist. Run before `docker compose up`,
# not from entrypoint.sh — by the time a container boots, docker compose has
# already tried to read these files.
set -e

copy_if_missing() {
    if [ ! -f "$2" ]; then
        cp "$1" "$2"
        echo "Created $2 from $1"
    fi
}

copy_if_missing .env.example .env
copy_if_missing backend/.env.example backend/.env
