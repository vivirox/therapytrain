#!/bin/bash

# Set up trap to catch Ctrl+C
interrupt_handler() {
  echo -e "\nScript interrupted. Exiting..."
  log -e "\nScript interrupted. Exiting..."
  exit 1
}
trap interrupt_handler SIGINT

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
VIEW_DIR="$(dirname "$SCRIPT_DIR")"
source "${VIEW_DIR}"/working/installer/common_functions.sh

FORCE_UPDATE=false

debug "Debug Logging Enabled"

set_base_url() {
  ARCHIVE_NAME=${VIEW_ARCHIVE:-View.tgz}
  DIRECT_URL="https://s3.us-west-1.amazonaws.com/get.view"
  CDN_URL="https://get.view.io"

  if [ "${CDN,,}" = "false" ]; then
    BASE_URL="$DIRECT_URL"
  else
    BASE_URL="$CDN_URL"
  fi

  URL="${BASE_URL}/${ARCHIVE_NAME}"
}

get_etag() {
  ETAG=$(curl -sI "${URL}" | grep -i "ETag" | cut -d'"' -f2)

  if [ -z "$ETAG" ]; then
    log "Failed to retrieve MD5 of update package. Exiting."
    exit 1
  fi

  log "Current MD5 SUM: $ETAG"
}

check_md5() {
  if [ "$FORCE_UPDATE" = true ]; then
    log "Force update flag set. Skipping MD5 check."
    return 0
  fi

  if [ -f "$MD5_FILE" ]; then
    STORED_ETAG=$(cat "$MD5_FILE")
    log "Stored MD5 SUM: $STORED_ETAG"

    if [ "$ETAG" == "$STORED_ETAG" ]; then
      log "MD5 SUM matches stored value. No update needed."
      return 1
    fi
  else
    log "No stored MD5 SUM found."
  fi

  return 0
}

expand_archive() {
  debug "Expanding "
  log "Expanding View Archive"
  local PARENT_VIEW_DIR
  PARENT_VIEW_DIR=$(dirname "${VIEW_DIR}")
  tar --exclude-from="${SCRIPT_DIR}"/update_exclude -C "${PARENT_VIEW_DIR}" -xvf /tmp/View.tgz | tee -a "${LOG_FILE}" >>/dev/null
}

download_update() {
  log "Downloading new version..."
  if curl -s -o "/tmp/View.tgz" "${URL}"; then
    echo "$ETAG" > "$MD5_FILE"
    log "Download complete. "
    debug "Storing the MD5 Sum $ETAG to $MD5_FILE "
    expand_archive
  else
    log "Download failed."
    exit 1
  fi
}

check_and_download_update() {
  set_base_url
  local ETAG
  ETAG=$(get_etag)

  MD5_FILE="${SCRIPT_DIR}/update.md5"

  if check_md5; then
    download_update
  fi
}

check_for_update() {
  set_base_url
  get_etag
  MD5_FILE="${SCRIPT_DIR}/update.md5"

  if [ -f "$MD5_FILE" ]; then
    STORED_ETAG=$(cat "$MD5_FILE")
    log "Stored MD5 SUM: $STORED_ETAG"

    if [ "$ETAG" != "$STORED_ETAG" ]; then
      log "Update available "
      return 0  # True in bash, indicating an update is available
    else
      log "No update needed "
      return 1  # False in bash, indicating no update is needed
    fi
  else
    log "No stored MD5 SUM found. Update is available."
    return 0  # True in bash, indicating an update is available
  fi
}

update() {
  if check_for_update; then
    log "Proceeding with update..."
    download_update
    #check_and_download_update
    update_mysql
    log "Update completed successfully."
  fi
}


# Directory containing the update files
DATABASE_LOG_FILE="${VIEW_DIR}/working/mysql/mysql_updates.log"
DATABASE_UPDATE_DIR="${VIEW_DIR}/working/mysql/updates"
touch "$DATABASE_LOG_FILE"

# Log file to keep track of applied updates
LOG_FILE="${VIEW_DIR}/helpers/updates.log"

# Function to apply an update file
apply_database_update() {
    local file=$1
    log "Applying update: $file"
    log "$file" >> "$DATABASE_LOG_FILE"
    docker exec -i mysql mysql -u"$MYSQL_USER" -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" < "$file"
    if [ $? -eq 0 ]; then
        log "Update applied successfully: $file"
    else
        log "Error applying update: $file"
    fi
}


update_mysql() {
  MYSQL_ROOT_PASSWORD=$(grep VIEW_DATABASE_PASS ${VIEW_DIR}/compose.yaml | cut -d ':' -f2 | sed 's/\s*#.*$//' | tr -d ' ')
  MYSQL_DATABASE=$(grep VIEW_DATABASE_NAME ${VIEW_DIR}/compose.yaml | cut -d ':' -f2 | sed 's/\s*#.*$//' | tr -d ' ')
  MYSQL_USER=$(grep VIEW_DATABASE_USER ${VIEW_DIR}/compose.yaml | cut -d ':' -f2 | sed 's/\s*#.*$//' | tr -d ' ')
  # Get list of update files, sorted numerically
  update_files=($(ls -v $DATABASE_UPDATE_DIR/*.sql))

  for file in "${update_files[@]}"; do
      filename=$(basename "$file")
      if grep -q "$filename" "$DATABASE_LOG_FILE"; then
          log "Skipping already applied update: $filename"
      else
          apply_database_update "$file"
      fi
  done
}


usage() {
  echo -e "${BIPurple}$_title${NC}"
  echo "Usage: $0 [OPTIONS]"
  echo "Options:"
  echo "  -f, --force    Force update without checking MD5 Checksum"
  echo "  -c, --check    Check for available updates"
  echo "  -u, --update   Update the system"
  echo ""
  echo "Environment Variables:"
  echo "  VIEW_ARCHIVE   Name of the archive file (default: View.tgz)"
  echo "  DEBUG          Set to 'true' to output additional informaton (default: false)"
  echo "  CDN            Set to 'false' to use direct URL instead of CDN (default: true)"
  echo ""
  echo "This will update the files in the View directory and process any schema changes for the databases as required"
}

# Check if no arguments were provided and show the usage function
if [ $# -eq 0 ]; then
    usage
    exit 0
fi

# Parse the flags
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    -f|--force)
      FORCE_UPDATE=true
      shift
      ;;
    -c|--check)
      check_for_update
      shift
      ;;
    -u|--update)
      update
      shift
      ;;
    *)
      # Unknown option
      usage
      shift
      ;;
  esac
done
