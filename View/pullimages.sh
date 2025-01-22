#!/bin/bash

echo
echo
echo Retrieving latest images for View AI
echo
echo
# Check for NVIDIA GPU
if command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi >/dev/null 2>&1; then
    echo "NVIDIA GPU detected"
    PROCESSOR_PROFILE="gpu"
else
    echo "No NVIDIA GPU detected"
    PROCESSOR_PROFILE="cpu"
fi
CPU_Part=$(grep -m 1 "part" /proc/cpuinfo | cut -d' ' -f3)
# set the OLLAMA_IMAGE environment var
if [ "$CPU_Part" == "0xd0c" ]; then
    echo "Ampere CPU detected"
    export OLLAMA_IMAGE="ghcr.io/amperecomputingai/ollama-ampere:0.0.6-ol9"
else
    echo "No Ampere CPU detected"
    export OLLAMA_IMAGE="ollama/ollama"
fi

echo
docker compose -f compose.yaml --profile "$PROCESSOR_PROFILE" pull

echo
echo
echo Complete.
echo