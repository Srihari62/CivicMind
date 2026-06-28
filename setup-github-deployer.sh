#!/usr/bin/env bash

# =========================================================================
# GCP GitHub Actions Service Account Setup Script
# Automates the creation of service account, IAM roles, and credential keys.
# =========================================================================

set -e

# Configuration
SA_NAME="github-actions-deployer"
KEY_FILE="github-actions-key.json"

# Text styles
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper to read from .env.local
get_env_val() {
  local key=$1
  if [ -f .env.local ]; then
    grep "^$key=" .env.local | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
  else
    echo ""
  fi
}

FIREBASE_PROJECT_ID=$(get_env_val "NEXT_PUBLIC_FIREBASE_PROJECT_ID")

# Check gcloud path
if command -v gcloud &> /dev/null; then
  GCLOUD_BIN="gcloud"
elif [ -f "$HOME/google-cloud-sdk/bin/gcloud" ]; then
  GCLOUD_BIN="$HOME/google-cloud-sdk/bin/gcloud"
else
  echo -e "${RED}Error: gcloud CLI not found. Please install it first.${NC}"
  exit 1
fi

# Get current project
CURRENT_PROJECT=$($GCLOUD_BIN config get-value project 2>/dev/null || true)
PROJECT_ID=${CURRENT_PROJECT:-$FIREBASE_PROJECT_ID}

echo -e "${BLUE}${BOLD}=====================================================${NC}"
echo -e "${BLUE}${BOLD}   GCP GitHub Actions Deployer Setup                 ${NC}"
echo -e "${BLUE}${BOLD}=====================================================${NC}"

read -p "Enter GCP Project ID [default: $PROJECT_ID]: " USER_PROJECT_ID
PROJECT_ID=${USER_PROJECT_ID:-$PROJECT_ID}

if [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}Error: Project ID is required.${NC}"
  exit 1
fi

echo -e "\n${BOLD}[1/3] Creating Service Account: $SA_NAME...${NC}"
SA_EMAIL="$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"

if $GCLOUD_BIN iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" &>/dev/null; then
  echo -e "${GREEN}Service account already exists.${NC}"
else
  $GCLOUD_BIN iam service-accounts create "$SA_NAME" \
    --description="Service account for GitHub Actions deployment CI/CD" \
    --display-name="GitHub Actions Deployer" \
    --project="$PROJECT_ID"
  echo -e "${GREEN}Service account created successfully.${NC}"
fi

echo -e "\n${BOLD}[2/3] Granting IAM Roles to Service Account...${NC}"
ROLES=(
  "roles/cloudbuild.builds.editor"
  "roles/run.admin"
  "roles/artifactregistry.writer"
  "roles/storage.objectAdmin"
  "roles/iam.serviceAccountUser"
  "roles/serviceusage.serviceUsageConsumer"
  "roles/viewer"
)

for ROLE in "${ROLES[@]}"; do
  echo -e "${BLUE}Granting $ROLE...${NC}"
  $GCLOUD_BIN projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="$ROLE" \
    --quiet >/dev/null
done
echo -e "${GREEN}All IAM roles granted successfully.${NC}"

echo -e "\n${BOLD}[3/3] Generating JSON Key file...${NC}"
if [ -f "$KEY_FILE" ]; then
  echo -e "${YELLOW}Warning: $KEY_FILE already exists. Overwriting...${NC}"
  rm "$KEY_FILE"
fi

$GCLOUD_BIN iam service-accounts keys create "$KEY_FILE" \
  --iam-account="$SA_EMAIL" \
  --project="$PROJECT_ID"

echo -e "\n${GREEN}${BOLD}✓ Setup Complete!${NC}"
echo -e "A service account key file has been created at: ${BOLD}$KEY_FILE${NC}"
echo -e "${YELLOW}Important Safety Note: This file is ignored by Git, but please delete it after copying the credentials.${NC}"
