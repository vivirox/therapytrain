#!/bin/bash

# ################################################################################
# View.io Common Functions Script
# ################################################################################
#
# CAUTION: This script contains common functions and utilities used across the
# View.io installation and management scripts. Modifications should only be
# performed by authorized system administrators with extensive knowledge of
# the View.io architecture and deployment paradigms.
#
# This script provides:
#   - Common utility functions (e.g., logging, banner display)
#   - System information gathering functions
#   - Color and formatting definitions for consistent output
#   - Shell instruction helpers
#
# Usage: This script is typically sourced by other View.io scripts and is not
# intended to be run directly.
#
# For detailed documentation and support, please refer to the official View.io
# Technical Operations Manual.
#
# ################################################################################


# Get the FQDN and IP address of the host
FQDN=$(hostname --fqdn)
IPADDR=$(ip -o route get to 8.8.8.8 | sed -n 's/.*src \([0-9.]\+\).*/\1/p')

# Log function
log() {
  local timestamp
  timestamp=$(date +"%Y-%m-%d %H:%M:%S")
  echo -e "[$timestamp] $1" | tee -a "${LOG_FILE}"
}

debug() {
  if [[ "${DEBUG,,}" == "true" ]]; then
  local timestamp
  timestamp=$(date +"%Y-%m-%d %H:%M:%S")
  echo -e "${Red}[$timestamp] $1" | tee -a "${LOG_FILE}${NC}"
  fi
}

_title="
           _
      __ _(_)_____ __ __
      \ V | | -_) V  V /
       \_/|_|___|\_/\_/
      AI Data Management
    and Insights Platform
       https://view.io

"
show_banner() {
  log
  log "${BIPurple}$_title${NC}"
  log
}

shell_instructions() {
  log ""
  log "${Yellow}HINT: To use the viewctl commands from anywhere, add this directory to your PATH.${NC}"
  log "You can do this by adding the following line to your shell configuration file:"
  log "${Blue}export PATH=\"\$PATH:$(pwd)\"${NC}"
  log "For bash users, add this line to ~/.bashrc"
  log "For zsh users, add this line to ~/.zshrc"
  log "After adding the line, reload your shell configuration with:"
  log "${Blue}source ~/.bashrc${NC} (for bash users)"
  log "or"
  log "${Blue}source ~/.zshrc${NC} (for zsh users)"
}

dashboard() {
  echo
  echo "To access the dashboard open your browser to any of the following: "
  echo "  http://127.0.1.1:9000"
  echo "  http://${IPADDR}:9000"
  echo "  http://${FQDN}:9000"
  echo
}

# Colors and symbols
CHECK='\xe2\x9c\x85  '
NOPE='\xe2\x9d\x8c  '
NC='\033[0m'

# Regular Colors
Black="\033[0;30m"        # Black
Red="\033[0;31m"          # Red
Green="\033[0;32m"        # Green
Yellow="\033[0;33m"       # Yellow
Blue="\033[0;34m"         # Blue
Purple="\033[0;35m"       # Purple
Cyan="\033[0;36m"         # Cyan
White="\033[0;37m"        # White

# Bold
BBlack="\033[1;30m"       # Black
BRed="\033[1;31m"         # Red
BGreen="\033[1;32m"       # Green
BYellow="\033[1;33m"      # Yellow
BBlue="\033[1;34m"        # Blue
BPurple="\033[1;35m"      # Purple
BCyan="\033[1;36m"        # Cyan
BWhite="\033[1;37m"       # White

# Underline
UBlack="\033[4;30m"       # Black
URed="\033[4;31m"         # Red
UGreen="\033[4;32m"       # Green
UYellow="\033[4;33m"      # Yellow
UBlue="\033[4;34m"        # Blue
UPurple="\033[4;35m"      # Purple
UCyan="\033[4;36m"        # Cyan
UWhite="\033[4;37m"       # White

# Background
On_Black="\033[40m"       # Black
On_Red="\033[41m"         # Red
On_Green="\033[42m"       # Green
On_Yellow="\033[43m"      # Yellow
On_Blue="\033[44m"        # Blue
On_Purple="\033[45m"      # Purple
On_Cyan="\033[46m"        # Cyan
On_White="\033[47m"       # White

# High Intensty
IBlack="\033[0;90m"       # Black
IRed="\033[0;91m"         # Red
IGreen="\033[0;92m"       # Green
IYellow="\033[0;93m"      # Yellow
IBlue="\033[0;94m"        # Blue
IPurple="\033[0;95m"      # Purple
ICyan="\033[0;96m"        # Cyan
IWhite="\033[0;97m"       # White

# Bold High Intensty
BIBlack="\033[1;90m"      # Black
BIRed="\033[1;91m"        # Red
BIGreen="\033[1;92m"      # Green
BIYellow="\033[1;93m"     # Yellow
BIBlue="\033[1;94m"       # Blue
BIPurple="\033[1;95m"     # Purple
BICyan="\033[1;96m"       # Cyan
BIWhite="\033[1;97m"      # White

# High Intensty backgrounds
On_IBlack="\033[0;100m"   # Black
On_IRed="\033[0;101m"     # Red
On_IGreen="\033[0;102m"   # Green
On_IYellow="\033[0;103m"  # Yellow
On_IBlue="\033[0;104m"    # Blue
On_IPurple="\033[10;95m"  # Purple
On_ICyan="\033[0;106m"    # Cyan
On_IWhite="\033[0;107m"   # White