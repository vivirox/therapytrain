#!/bin/bash

echo
echo
echo "View Systems Inc : Copyright 2024"
echo "Version 1.0.0"
echo
echo

echo "Stopping all containers"

# Stop Ollama separately first
if docker ps -q --filter name=ollama | grep -q .; then
    echo "Stopping Ollama container"
    docker stop ollama > /dev/null
    docker rm ollama > /dev/null
fi

# Stop all other containers
docker compose -f compose.yaml down --remove-orphans

# Check if any containers are still running
if docker ps -q | grep -q .; then
    echo "Some containers are still running; forcing stop"
    docker stop $(docker ps -q)
fi

echo
echo "All containers stopped"
echo "Thank you for using View AI!"
echo
