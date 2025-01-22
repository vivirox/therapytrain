#!/bin/bash
# ################################################################################
# View.io RHEL-based System Setup Script
# ################################################################################
#
# CAUTION: This script is designed to set up and configure RHEL-based systems
# (e.g., Red Hat Enterprise Linux, CentOS, Fedora) for the View.io platform.
# It should only be modified by authorized system administrators familiar with
# View.io's requirements.
#
# This script performs the following key tasks:
#   - Checks system requirements and compatibility
#   - Installs and updates necessary system packages
#   - Installs and configures Docker
#   - Sets up NVIDIA drivers and container toolkit (if applicable)
#
# Usage: This script is typically sourced by the main installer script and is not
# intended to be run directly.
#
# Note: This script may require sudo privileges to install packages and make
# system configurations.
#
# For detailed documentation and support, please refer to the official View.io
# Technical Operations Manual.
#
# ################################################################################
# Source the common functions
source "$(dirname "$0")/common_functions.sh"
rhel_version=$(rpm -E %{rhel})
log "Detected RHEL version: $rhel_version"

system_check() {
  log "Checking system requirements..."

  # Check for pending updates that require a reboot
  if needs_reboot; then
    log "${RED}${NOPE}System requires a reboot.${NC}"
    log "Please reboot your system and then run the installer again."
    log "You can reboot by running: sudo reboot"
    rerun_instructions
    exit 1
  fi

  # Add any other system checks here

  log "${GREEN}${CHECK}System check passed.${NC}"
}

needs_reboot() {
  # Check if the 'needs-restarting' command is available
  if command -v needs-restarting >/dev/null 2>&1; then
    # Use needs-restarting to check if a reboot is required
    log "Checking if a reboot is needed using the needs-restarting command"
    # Check if the system requires a reboot using 'needs-restarting' or the kernel update check
    # Replace the following line with your own logic to check for a reboot
    if sudo needs-restarting -r | tee -a "${LOG_FILE}" >>/dev/null; then
      log "No Reboot is needed"
      return 1
    else
      log "Reboot is needed"
      return 0
    fi
  else
    # If 'needs-restarting' is not available, check for kernel updates
    if [ "$(sudo rpm -q --last kernel | head -n 1 | awk '{print $1}')" != "$(uname -r)" ]; then
      return 0 # Kernel has been updated, reboot is needed
    else
      return 1 # No kernel update, no reboot needed
    fi
  fi
}

os_prereqs() {
  log "Updating system - this takes a minute or two. cmd: yum --assumeyes update"
  sudo yum --assumeyes update | sudo tee -a "${LOG_FILE}" >>/dev/null
  log "Enabling the EPEL Packages"
  local epel_package
  if [ "$rhel_version" -eq 8 ]; then
    epel_package="https://dl.fedoraproject.org/pub/epel/epel-release-latest-8.noarch.rpm"
  elif [ "$rhel_version" -eq 9 ]; then
    epel_package="https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm"
  else
    log "${RED}${NOPE}Unsupported RHEL version: $rhel_version${NC}"
    log "This script supports RHEL 8 and 9."
    exit 1
  fi
  sudo dnf install -y $epel_package | sudo tee -a "${LOG_FILE}" >>/dev/null
  log "Checking and installing prerequisites..."
  local required_tools=("curl" "yum-utils" "wget" "vim" "bind-utils" "traceroute" "net-tools")
  for tool in "${required_tools[@]}"; do
    if rpm -q "$tool" &>/dev/null; then
      log "${GREEN}${CHECK}$tool is already installed.${NC}"
    else
      log "Installing cmd: yum --assumeyes install $tool"
      sudo yum --assumeyes install "$tool" | sudo tee -a "${LOG_FILE}" >>/dev/null
    fi
  done
  if lspci | grep -i nvidia >>/dev/null; then
    log "NVIDIA device detected. Checking for the NVIDIA driver..."
    if command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi >/dev/null 2>&1; then
      log "${GREEN}${CHECK}NVIDIA Drivers are installed.${NC}"
    else
      log "${YELLOW}NVIDIA Drivers are not installed.${NC}"
      log "TODO: Install the NVIDIA drivers."
      # Add your NVIDIA driver installation commands here
    fi
  else
    log "No NVIDIA device detected."
  fi
}

# https://computingforgeeks.com/install-docker-and-docker-compose-on-rhel-centos/
# https://computingforgeeks.com/how-to-install-latest-docker-compose-on-linux/
install_docker() {
  log "Running Redhat Enterprise Linux specific installation steps..."
  log "Installing Docker CE for evaluation of View only. "
  log "For Production environments please install Docker EE or contact "
  log "support@view.io for information on deployment as a kubernetes cluster"
  log ""
  log "Adding Docker CE repository..."
  sudo yum-config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo | sudo tee -a "${LOG_FILE}" >>/dev/null
  log "Updating yum cache..."
  sudo yum makecache | sudo tee -a "${LOG_FILE}" >>/dev/null
  log "Installing Docker CE and related packages..."
  sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin | sudo tee -a "${LOG_FILE}" >>/dev/null
  log "Enabling and starting Docker service..."
  sudo systemctl enable --now docker | sudo tee -a "${LOG_FILE}" >>/dev/null
  log "Adding current user to docker group..."
  sudo usermod -aG docker "$USER" | sudo tee -a "${LOG_FILE}" >>/dev/null

  log "Checking Docker version..."
  docker version | sudo tee -a "${LOG_FILE}"

  log "Downloading latest Docker Compose..."
  curl -s https://api.github.com/repos/docker/compose/releases/latest | grep browser_download_url | grep docker-compose-linux-x86_64 | cut -d '"' -f 4 | wget -qi - | sudo tee -a "${LOG_FILE}" >>/dev/null
  log "Moving Docker Compose to /usr/bin..."
  sudo mv docker-compose-linux-x86_64 /usr/bin/docker-compose | sudo tee -a "${LOG_FILE}" >>/dev/null
  sudo rm -rf docker-compose*.sha256 | sudo tee -a "${LOG_FILE}" >>/dev/null
  log "Checking Docker Compose version..."
  sudo chmod 755 /usr/bin/docker-compose | sudo tee -a "${LOG_FILE}" >>/dev/null
  docker-compose version | sudo tee -a "${LOG_FILE}"
  newgrp docker
  if lspci | grep -i nvidia >>/dev/null; then
    log "Installing NVIDIA Container Toolkit"
    curl -s -L https://nvidia.github.io/libnvidia-container/stable/rpm/nvidia-container-toolkit.repo | sudo tee /etc/yum.repos.d/nvidia-container-toolkit.repo
    sudo yum install -y nvidia-container-toolkit | sudo tee -a "${LOG_FILE}" >>/dev/null
    sudo nvidia-ctk runtime configure --runtime=docker | sudo tee -a "${LOG_FILE}" >>/dev/null
  fi
  log "Restarting Docker"
  sudo systemctl restart docker | sudo tee -a "${LOG_FILE}" >>/dev/null


}


log "RHEL based distribution setup commands loaded..."
