#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;33m'
NC='\033[0m'
BIPurple="\033[1;95m"

_title="
           _
      __ _(_)_____ __ __
      \ V | | -_) V  V /
       \_/|_|___|\_/\_/
       
       https://view.io
"
echo -e "${BIPurple}$_title${NC}"
echo -e "${GREEN}"
echo -e "View Systems Inc : Copyright 2024"
echo -e "AI Data Management and Insights Platform"
echo -e "Version 1.0.0"
echo -e "${NC}"
echo
echo

# Check for an Ampere GPU and set the Ollama image to use the optimized version
CPU_Part=$(grep -m 1 "part" /proc/cpuinfo | cut -d' ' -f3)
if [ "$CPU_Part" == "0xd0c" ]; then
  echo "Ampere CPU detected"
  # set the OLLAMA_IMAGE environment var
  export OLLAMA_IMAGE="ghcr.io/amperecomputingai/ollama-ampere:0.0.6-ol9"
else
  echo "No Ampere CPU detected"
fi

# Check for NVIDIA GPU
if command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi >/dev/null 2>&1; then
    echo "NVIDIA GPU detected"
    # Check if NVIDIA Container Toolkit is installed
    if ! command -v nvidia-container-cli >/dev/null 2>&1; then
       echo "NVIDIA Container Toolkit not found. Please rerun the installer with the -c option..."
       echo "View will start in CPU Mode"
       PROCESSOR_PROFILE="cpu"
    else
      PROCESSOR_PROFILE="gpu"
    fi
else
    echo "No NVIDIA GPU detected"
    PROCESSOR_PROFILE="cpu"
fi

echo
echo "Starting View Data-as-a-Service with processor profile: $PROCESSOR_PROFILE"
echo

# Start with the appropriate profile
if ! docker compose -f compose.yaml --profile "$PROCESSOR_PROFILE" up -d; then
    echo "Failed to start View Data-as-a-Service"
    exit 1
fi

echo
echo "View Data-as-a-Service started with $PROCESSOR_PROFILE processor profile."
echo
echo "To access the dashboard open your browser to any of the following: "
echo "  http://127.0.1.1:9000"
echo "  http://$(ip route get 1 | awk '{print $(NF-2);exit}'):9000"
echo
