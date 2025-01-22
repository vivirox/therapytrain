#!/bin/bash

# ################################################################################
# View.io Debian-based System Setup Script
# ################################################################################
#
# CAUTION: This script is designed to set up and configure Debian-based systems
# (e.g., Ubuntu, Debian) for the View.io platform. It should only be modified by
# authorized system administrators familiar with View.io's requirements.
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

system_check() {
  log "Checking system requirements..."

  if [ -f /var/run/reboot-required ]; then
    log "${Red}${NOPE}System requires a reboot.${NC}"
    log "Please reboot your system and then run the installer again."
    log "You can reboot by running: sudo reboot"
    rerun_instructions
    exit 1
  fi

  # Add any other system checks here
  
  # Check if firewall (ufw) is active
  if sudo ufw status | grep -q "Status: active"; then
    log "${YELLOW}WARNING: Firewall (ufw) is active.${NC}"
    log "${YELLOW}You may need to update your firewall configuration to allow necessary ports for View.io.${NC}"
    log "${YELLOW}Please consult the View.io documentation for required ports and firewall settings.${NC}"
    log "${YELLOW}https://docs.view.io/docs/deploying-view#firewall${NC}"
    
  else
    log "${Green}${CHECK}Firewall (ufw) is not active.${NC}"
  fi

  log "${Green}${CHECK}System check passed.${NC}"
}

os_prereqs() {
  log "Updating system. cmd: apt-get update "
  local required_tools=("ubuntu-drivers-common" "curl" "wget" "vim" "dnsutils" "traceroute" "net-tools")

  sudo apt-get update | sudo tee -a "${LOG_FILE}" >>/dev/null
  log "Checking and installing prerequisites..."

  for tool in "${required_tools[@]}"; do
    if dpkg -s "$tool" >/dev/null 2>&1; then
      log "${GREEN}${CHECK}$tool is already installed.${NC}"
    else
      log "Installing $tool..."
      sudo apt-get install -y "$tool" | sudo tee -a "${LOG_FILE}" >>/dev/null
    fi
  done

  # Check if NVIDIA device is installed
  if lspci | grep -i nvidia >>/dev/null; then
    log "NVIDIA device detected. Checking for NVIDIA driver..."
    if nvidia-smi >/dev/null 2>&1; then
      log "${GREEN}${CHECK}NVIDIA driver is already installed.${NC}"
    else
      log "Installing NVIDIA driver..."
      sudo ubuntu-drivers install --gpgpu | sudo tee -a "${LOG_FILE}" >>/dev/null
    fi
  else
    log "No NVIDIA device detected."
  fi
}

install_docker() {
  log "Running Ubuntu specific installation steps..."

  # Check if Docker is installed via snap
  if snap list docker &>/dev/null; then
    log "${YELLOW}Docker is installed via snap. Removing it...${NC}"
    sudo snap remove docker
    log "${GREEN}${CHECK}Docker (snap) removed.${NC}"
  fi

  # Check if Docker is already installed (not via snap) and at least version 27.0.0
  if command -v docker &>/dev/null; then
    docker_version=$(docker version --format '{{.Server.Version}}' 2>/dev/null)
    if [[ "$(printf '%s\n' "27.0.0" "$docker_version" | sort -V | head -n1)" == "27.0.0" ]]; then
      log "${GREEN}${CHECK}Docker is installed and version is at least 27.0.0 (Current: $docker_version).${NC}"
    else
      log "${YELLOW}Docker is installed but version is below 27.0.0 (Current: $docker_version). Updating Docker...${NC}"
      curl -fsSL https://get.docker.com -o get-docker.sh
      sudo sh get-docker.sh | sudo tee -a "${LOG_FILE}" >>/dev/null
      rm get-docker.sh
      log "${GREEN}${CHECK}Docker updated successfully.${NC}"
    fi
  else
    log "Installing Docker"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh | sudo tee -a "${LOG_FILE}" >>/dev/null
    rm get-docker.sh
    log "${GREEN}${CHECK}Docker installed successfully.${NC}"
  fi

  # Add current user to docker group
  if ! groups "$USER" | grep &>/dev/null '\bdocker\b'; then
    log "Adding $USER to docker group"
    sudo usermod -aG docker "$USER"
    log "${GREEN}${CHECK}User added to docker group. You may need to log out and back in for this to take effect.${NC}"
  fi

  if lspci | grep -i nvidia >>/dev/null; then
    log "NVIDIA device detected. Checking for NVIDIA Container Toolkit..."
    if dpkg -s nvidia-container-toolkit &>/dev/null; then
      log "${GREEN}${CHECK}NVIDIA Container Toolkit is already installed.${NC}"
    else
      log "Installing NVIDIA Container Toolkit"
      curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg | sudo tee -a "${LOG_FILE}" >>/dev/null
      curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | sudo sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list >/dev/null
      sudo apt-get update | sudo tee -a "${LOG_FILE}" >>/dev/null
      sudo apt-get install -y nvidia-container-toolkit | sudo tee -a "${LOG_FILE}" >>/dev/null
      log "${GREEN}${CHECK}NVIDIA Container Toolkit installed successfully.${NC}"
    fi
  fi

  log "Restarting Docker"
  sudo systemctl restart docker | sudo tee -a "${LOG_FILE}" >>/dev/null
  log "${GREEN}${CHECK}Docker has been installed and started.${NC}"
}

log "Debian based distribution setup commands loaded..."
