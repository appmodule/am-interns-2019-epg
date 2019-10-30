#!/bin/bash

if [ ! -f .env ]; then
    echo "File .env not found! Please do: 'cp .env-example .env' and adjust variables"
    exit 1
fi

docker-compose up --build -d