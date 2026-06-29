#!/usr/bin/env bash

# =========================================================================
# CivicMind - Google Cloud Platform Deployment Script
# Automatically configures, builds, and deploys the Next.js app to Cloud Run.
# =========================================================================

# Exit immediately if a command exits with a non-zero status
set -e

# Configuration Defaults
DEFAULT_REGION="us-central1"
REPO_NAME="civicmind-repo"
SERVICE_NAME="civicmind-app"
ENV_FILE=".env.local"

# Text styles
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}=====================================================${NC}"
echo -e "${BLUE}${BOLD}        CivicMind GCP Deployment Assistant           ${NC}"
echo -e "${BLUE}${BOLD}=====================================================${NC}"

# Check for .env.local file
if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}Error: $ENV_FILE not found!${NC}"
  echo -e "Please create a .env.local file in the root directory before running this script."
  exit 1
fi

# Helper function to read from .env.local
get_env_val() {
  local key=$1
  grep "^$key=" "$ENV_FILE" | cut -d'=' -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

# Read variables from .env.local
FIREBASE_PROJECT_ID=$(get_env_val "NEXT_PUBLIC_FIREBASE_PROJECT_ID")
GEMINI_API_KEY=$(get_env_val "GEMINI_API_KEY")
FIREBASE_SERVICE_ACCOUNT_KEY=$(get_env_val "FIREBASE_SERVICE_ACCOUNT_KEY")

if [ -z "$FIREBASE_PROJECT_ID" ]; then
  echo -e "${YELLOW}Warning: NEXT_PUBLIC_FIREBASE_PROJECT_ID is not defined in $ENV_FILE.${NC}"
  read -p "Please enter your GCP Project ID (where Cloud Run will be deployed): " PROJECT_ID
else
  read -p "Enter GCP Project ID for Deployment [default: $FIREBASE_PROJECT_ID]: " PROJECT_ID
  PROJECT_ID=${PROJECT_ID:-$FIREBASE_PROJECT_ID}
fi

# 1. Check/Install gcloud CLI
echo -e "\n${BOLD}[Step 1/7] Checking Google Cloud CLI...${NC}"
if ! command -v gcloud &> /dev/null; then
  if [ -f "$HOME/google-cloud-sdk/bin/gcloud" ]; then
    echo -e "${GREEN}Found gcloud locally in $HOME/google-cloud-sdk.${NC}"
    export PATH="$HOME/google-cloud-sdk/bin:$PATH"
  else
    echo -e "${YELLOW}Google Cloud CLI (gcloud) is not installed.${NC}"
    read -p "Would you like to install it locally in your home directory? (y/n) " install_gcloud
    if [[ "$install_gcloud" =~ ^[Yy]$ ]]; then
      echo -e "${BLUE}Downloading Google Cloud CLI...${NC}"
      ARCH=$(uname -m)
      if [ "$ARCH" = "x86_64" ]; then
        CLI_TAR="google-cloud-cli-linux-x86_64.tar.gz"
      elif [[ "$ARCH" = "aarch64" || "$ARCH" = "arm64" ]]; then
        CLI_TAR="google-cloud-cli-linux-arm.tar.gz"
      else
        echo -e "${RED}Unsupported system architecture ($ARCH). Please install gcloud manually: https://cloud.google.com/sdk/docs/install${NC}"
        exit 1
      fi
      
      curl -sSL "https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/$CLI_TAR" -o "/tmp/$CLI_TAR"
      echo -e "${BLUE}Extracting to $HOME...${NC}"
      tar -xf "/tmp/$CLI_TAR" -C "$HOME"
      rm "/tmp/$CLI_TAR"
      
      echo -e "${BLUE}Running SDK installation script...${NC}"
      "$HOME/google-cloud-sdk/install.sh" --quiet --path-update true
      
      export PATH="$HOME/google-cloud-sdk/bin:$PATH"
      echo -e "${GREEN}Google Cloud CLI installed successfully!${NC}"
    else
      echo -e "${RED}Deployment cannot continue without the gcloud CLI.${NC}"
      exit 1
    fi
  fi
else
  echo -e "${GREEN}Google Cloud CLI is already installed.${NC}"
fi

# 2. Authenticate GCP
echo -e "\n${BOLD}[Step 2/7] Checking GCP Authentication...${NC}"
ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null || true)
if [ -z "$ACTIVE_ACCOUNT" ]; then
  echo -e "${YELLOW}No active GCP account found. Starting authentication login...${NC}"
  gcloud auth login
else
  echo -e "${GREEN}Authenticated as: $ACTIVE_ACCOUNT${NC}"
fi

# 3. Configure Project & Region
echo -e "\n${BOLD}[Step 3/7] Setting GCP Project Context...${NC}"
echo -e "Target Project ID: ${GREEN}$PROJECT_ID${NC}"
gcloud config set project "$PROJECT_ID"

read -p "Enter GCP Deployment Region [default: $DEFAULT_REGION]: " REGION
REGION=${REGION:-$DEFAULT_REGION}

# 4. Enable Google Cloud APIs
echo -e "\n${BOLD}[Step 4/7] Enabling Required APIs...${NC}"
echo -e "${BLUE}Enabling Cloud Build, Cloud Run, and Artifact Registry...${NC}"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com

# 5. Create Artifact Registry Repository
echo -e "\n${BOLD}[Step 5/7] Preparing Artifact Registry...${NC}"
if gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" &>/dev/null; then
  echo -e "${GREEN}Docker repository '$REPO_NAME' already exists in region '$REGION'.${NC}"
else
  echo -e "${BLUE}Creating Docker repository '$REPO_NAME' in region '$REGION'...${NC}"
  gcloud artifacts repositories create "$REPO_NAME" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Docker repository for CivicMind apps"
fi

# 6. Build Docker Image using Google Cloud Build
echo -e "\n${BOLD}[Step 6/7] Building Container Image in the Cloud...${NC}"
IMAGE_TAG="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$SERVICE_NAME:latest"
echo -e "Building image: ${GREEN}$IMAGE_TAG${NC}"

# Read all public variables to pass as build args
NEXT_PUBLIC_FIREBASE_API_KEY=$(get_env_val "NEXT_PUBLIC_FIREBASE_API_KEY")
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$(get_env_val "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN")
NEXT_PUBLIC_FIREBASE_PROJECT_ID=$(get_env_val "NEXT_PUBLIC_FIREBASE_PROJECT_ID")
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$(get_env_val "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET")
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$(get_env_val "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID")
NEXT_PUBLIC_FIREBASE_APP_ID=$(get_env_val "NEXT_PUBLIC_FIREBASE_APP_ID")
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$(get_env_val "NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID")
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$(get_env_val "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY")
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=$(get_env_val "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME")
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=$(get_env_val "NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET")
NEXT_PUBLIC_APP_URL=$(get_env_val "NEXT_PUBLIC_APP_URL")

gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=\
_IMAGE_TAG="$IMAGE_TAG",\
_NEXT_PUBLIC_FIREBASE_API_KEY="$NEXT_PUBLIC_FIREBASE_API_KEY",\
_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",\
_NEXT_PUBLIC_FIREBASE_PROJECT_ID="$NEXT_PUBLIC_FIREBASE_PROJECT_ID",\
_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",\
_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",\
_NEXT_PUBLIC_FIREBASE_APP_ID="$NEXT_PUBLIC_FIREBASE_APP_ID",\
_NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID="$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID",\
_NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",\
_NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="$NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",\
_NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="$NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET",\
_NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL"

# 7. Deploy to Google Cloud Run
echo -e "\n${BOLD}[Step 7/7] Deploying to Google Cloud Run...${NC}"
echo -e "Starting deployment of ${GREEN}$SERVICE_NAME${NC} to ${GREEN}$REGION${NC}..."

# Construct deploy command with environment variables
# Note: we use a custom delimiter '^|^' to separate environment variables,
# because FIREBASE_SERVICE_ACCOUNT_KEY is a JSON string containing commas.
ENV_VARS="^|^GEMINI_API_KEY=$GEMINI_API_KEY|NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID"
if [ -n "$FIREBASE_SERVICE_ACCOUNT_KEY" ]; then
  ENV_VARS="$ENV_VARS|FIREBASE_SERVICE_ACCOUNT_KEY=$FIREBASE_SERVICE_ACCOUNT_KEY"
fi

gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_TAG" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "$ENV_VARS"

echo -e "\n${GREEN}${BOLD}✓ Deployment Complete!${NC}"
echo -e "Your CivicMind application is now live on Google Cloud Run."
echo -e "Verify the service URL in the Google Cloud Run output above."
echo -e "Remember to update your Firebase Authentication redirect URIs and Cloudinary authorized domains with your production Cloud Run URL if needed!"
echo -e "To redeploy in the future, simply run: ${BOLD}./deploy.sh${NC}"
