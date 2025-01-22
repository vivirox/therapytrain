#!/bin/bash
# ################################################################################
# View.io Installer Script
# ################################################################################
#
# CAUTION: This script is an integral part of the View.io ecosystem. Modifications
# should only be performed by authorized system administrators with extensive
# knowledge of the View.io architecture and deployment paradigms.
#
# This script installs and sets up the View.io platform on supported Linux
# distributions. It performs the following key tasks:
#   - Checks system requirements and compatibility
#   - Installs necessary dependencies including Docker
#   - Configures the View.io environment
#   - Starts the View.io services
#
# Usage: ./installer.sh [View Account GUID]
#
# The View Account GUID can be provided as an argument or set as an environment
# variable VIEWACCOUNTGUID before running the script.
#
# For detailed documentation and support, please refer to the official View.io
# Technical Operations Manual.
#
# ################################################################################

# Set up trap to catch Ctrl+C
interrupt_handler() {
  echo -e "\nScript interrupted. Exiting..."
  exit 1
}
trap interrupt_handler SIGINT

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKING_DIR="$(dirname "$SCRIPT_DIR")"
VIEW_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
INSTALLER_VERSION="1.0.1"

source "${SCRIPT_DIR}"/common_functions.sh

LOG_DIR="$SCRIPT_DIR/logs"
LOG_FILE="$LOG_DIR/view_install_$(date +%Y%m%d_%H%M%S).log"

# Ensure the log directory exists
if [ ! -d "$LOG_DIR" ]; then
  mkdir -p "$LOG_DIR" || {
    echo "Error: Failed to create log directory at $LOG_DIR"
    exit 1
  }
fi

# Create the log file
touch "$LOG_FILE" || {
  echo "Error: Failed to create log file at $LOG_FILE"
  exit 1
}

# Check if the log file is writable
if [ ! -w "$LOG_FILE" ]; then
  echo "Error: Log file is not writable at $LOG_FILE"
  exit 1
fi

# Check for version flag
if [[ "$1" == "-v" || "$1" == "--version" ]]; then
  echo "View Installer version ${INSTALLER_VERSION}"
  exit 0
fi

log "Installer Version ${INSTALLER_VERSION}"
log "SCRIPT Dir:       ${SCRIPT_DIR}"
log "WORKING Dir:      ${WORKING_DIR}"
log "VIEW Dir:         ${VIEW_DIR}"

# Set VIEWACCOUNTGUID from argument or environment variable
VIEWACCOUNTGUID=${1:-$VIEWACCOUNTGUID}

OLLAMA_MODEL="llama3.1:8b"

check_root() {
  if [[ $EUID -ne 0 ]]; then
    if command -v sudo &>/dev/null; then
      log "${Green}${CHECK}User has sudo access.${NC}"
    else
      log "${Red}${NOPE}User does not have sudo access and cannot install View without it.${NC}"
      rerun_instructions
      exit 1
    fi
  else
    log "${Red}${NOPE}User is root. Please run the script as a non-root user.${NC}"
    rerun_instructions
    exit 1
  fi
}

get_linux_distribution() {
  if [[ "$(uname)" == "Darwin" ]]; then
    log "${Red}${NOPE}Unsupported operating system: macOS${NC}"
    log "View does not support running natively on macOS. Please use a virtual environment in either VMware Fusion or VirtualBox."
    DISTRO="macOS"
    return
  fi

  if [[ "$(uname)" != "Linux" ]]; then
    log "${Red}${NOPE}Unsupported operating system: $(uname)${NC}"
    exit 1
  fi

  # Try to get distribution info using lsb_release
  if command -v lsb_release &>/dev/null; then
    DISTRO=$(lsb_release -si)
  # If lsb_release is not available, try /etc/os-release
  elif [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO=$ID
  # If /etc/os-release is not available, try /etc/redhat-release for RHEL and CentOS
  elif [ -f /etc/redhat-release ]; then
    DISTRO=$(cat /etc/redhat-release | cut -d ' ' -f 1)
  else
    log "${Red}${NOPE}Unable to determine Linux distribution${NC}"
    exit 1
  fi

  # Convert to lowercase for consistency
  DISTRO=$(echo "$DISTRO" | tr '[:upper:]' '[:lower:]')

  # Handle specific distributions
  case "$DISTRO" in
  ubuntu | debian)
    DISTRO_FAMILY="debian"
    source "${SCRIPT_DIR}"/debian_setup.sh
    ;;
  rhel | centos | fedora | rocky | almalinux)
    DISTRO_FAMILY="rhel"
    source "${SCRIPT_DIR}"/rhel_setup.sh
    ;;
  *)
    log "${Red}${NOPE}Unsupported Linux distribution: $DISTRO${NC}"
    exit 1
    ;;
  esac

  log "${Green}${CHECK}Detected Linux distribution: $DISTRO (Family: $DISTRO_FAMILY)${NC}"
}

system_configuration() {

  # UPDATE accounts SET guid = '00000000-0000-0000-0000-000000000000';
  # UPDATE tenants SET accountguid = '00000000-0000-0000-0000-000000000000';

  log "Updating View configuration"
  sed -i "s/00000000-0000-0000-0000-000000000000/$VIEWACCOUNTGUID/g" "$VIEW_DIR"/compose.yaml
  log "${Green}${CHECK}View Configuration files downloaded successfully.${NC}"

  log "Creating tenant entries"

  log "Fully Qualified Domain Name for this server is $FQDN"
  log "IP address of this server is $IPADDR"

  # Create tenant entries in the MySQL tenants init file
  touch "$VIEW_DIR"/working/mysql/tenants.sql
#  echo "INSERT INTO tenants (guid, name, region, s3basedomain, restbasedomain, defaultpoolguid, active, createdutc, accountguid, isprotected) VALUES (\"${VIEWACCOUNTGUID}\", \"Default Tenant\", \"us-west-1\", \"${FQDN}\", \"${FQDN}\", \"default\", 1, NOW(), \"default\", 1);" >>"$VIEW_DIR"/working/mysql/tenants.sql
#  echo "INSERT INTO tenants (guid, name, region, s3basedomain, restbasedomain, defaultpoolguid, active, createdutc, accountguid, isprotected) VALUES (\"${VIEWACCOUNTGUID}\", \"Default Tenant\", \"us-west-1\", \"${IPADDR}\", \"${IPADDR}\", \"default\", 1, NOW(), \"default\", 1);" >>"$VIEW_DIR"/working/mysql/tenants.sql
  echo "INSERT INTO tenants (guid, name, region, s3basedomain, restbasedomain, defaultpoolguid, active, createdutc, accountguid, isprotected) VALUES (\"default\", \"Default Tenant\", \"us-west-1\", \"${FQDN}\", \"${FQDN}\", \"default\", 1, NOW(), \"default\", 1);" >>"$VIEW_DIR"/working/mysql/tenants.sql
  echo "INSERT INTO tenants (guid, name, region, s3basedomain, restbasedomain, defaultpoolguid, active, createdutc, accountguid, isprotected) VALUES (\"default\", \"Default Tenant\", \"us-west-1\", \"${IPADDR}\", \"${IPADDR}\", \"default\", 1, NOW(), \"default\", 1);" >>"$VIEW_DIR"/working/mysql/tenants.sql

#  echo "UPDATE tenants SET guid = \"${VIEWACCOUNTGUID}\";" >>"$VIEW_DIR"/working/mysql/tenants.sql
#  echo "UPDATE accounts SET guid = \"${VIEWACCOUNTGUID}\";" >>"$VIEW_DIR"/working/mysql/tenants.sql
}

check_GUID() {
  if [[ -z "$VIEWACCOUNTGUID" ]]; then
    log "${Red}${NOPE}Error: a valid View account GUID is required to run the installer.${NC}"
    log "You can pass the View account GUID as an argument to the installer or "
    log "set the environment variable VIEWACCOUNTGUID before running this script."
    rerun_instructions
    exit 1
  fi

  # Validate GUID format
  if [[ ! "$VIEWACCOUNTGUID" =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$ ]]; then
    log "${Red}${NOPE}Error: Your View Account GUID is malformed.${NC}"
    rerun_instructions
    exit 1
  fi

  result=$(curl -sS -o /dev/null -w "%{response_code}" "https://control.view.io:8401/v1.0/accounts/$VIEWACCOUNTGUID/external")

  if [ "$result" -ne 200 ]; then
    log "${Red}${NOPE}Error: Your Account GUID does not appear to be valid. ${NC}"
    rerun_instructions
    exit 1
  fi

  log "${Green}${CHECK}Account GUID ${Blue}$VIEWACCOUNTGUID ${Green}verification successful${NC}"
}

rerun_instructions() {
  log ""
  log "To rerun this script, run:"
  log "bash $SCRIPT_DIR/installer.sh [View Account GUID]"
  log "Your unique View account GUID can be found at https://app.view.io/"

}

last_check() {
  if ! docker info &>/dev/null; then
    log "${RED}${NOPE}Unable to run Docker commands.${NC}"
    log "Please ensure you are in the docker user group by following these steps:"
    log "1. Run: sudo usermod -aG docker $USER"
    log "2. Log out of your current shell session"
    log "3. Log back in or restart your shell"
    log "4. Run the viewctl script again to start View"
    log ""
    log "After completing these steps, please run \"viewctl start\" to start View ."
    exit 1
  fi
}

background_tasks() {
  # run all these in the background to avoid blocking the script execution
  log "Starting post install background tasks..."
  log "Downloading $OLLAMA_MODEL from Ollama"
  curl -sX POST -H "Content-Type: application/json" -d "{ \"ModelName\": \"$OLLAMA_MODEL\",\"OllamaHostname\": \"ollama\",\"OllamaPort\": 11434}" http://localhost:8331/v1.0/models/pull | sudo tee -a "${LOG_FILE}" >>/dev/null &
}

do_install() {
  log "Installing View..."
  show_banner
  check_GUID
  system_configuration
  check_root
  get_linux_distribution
  system_check # from the distribution setup file
  os_prereqs # from the distribution setup file
  install_docker # from the distribution setup file
  last_check
  log "Starting View..."
  
  "$VIEW_DIR/viewctl" start || {
    log "${Red}${NOPE}Failed to start View${NC}"
    exit 1
  }
  log "${Green}${CHECK}Installation complete.${NC}"
  background_tasks
  shell_instructions # from common_functions
  dashboard # from common_functions
}

do_install
bash
