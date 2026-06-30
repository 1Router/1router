#!/bin/bash

# Exit on error
set -e

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

# Get git commit hash
GIT_HASH=$(git rev-parse --short HEAD)

# GitHub Container Registry settings
GHCR_DOMAIN="ghcr.io"
GHCR_OWNER="1router"
IMAGE_NAME="1router-frontend"
FULL_IMAGE_NAME="${GHCR_DOMAIN}/${GHCR_OWNER}/${IMAGE_NAME}"

# Check if logged in to GitHub Container Registry
# echo "Checking GitHub Container Registry authentication..."
# if ! docker info | grep -q "${GHCR_DOMAIN}"; then
#   echo "Please login to GitHub Container Registry first:"
#   echo "export CR_PAT=YOUR_GITHUB_TOKEN"
#   echo "echo \$CR_PAT | docker login ${GHCR_DOMAIN} -u USERNAME --password-stdin"
#   exit 1
# fi

# Build Docker image with version and latest tags
echo "Building Docker image for version ${VERSION}..."
docker build \
  -t "${FULL_IMAGE_NAME}:${VERSION}" \
  -t "${FULL_IMAGE_NAME}:${VERSION}-${GIT_HASH}" \
  -t "${FULL_IMAGE_NAME}:latest" \
  .

echo "
Image tags created:"
echo "${FULL_IMAGE_NAME}:${VERSION}"
echo "${FULL_IMAGE_NAME}:${VERSION}-${GIT_HASH}"
echo "${FULL_IMAGE_NAME}:latest"

# Push images to GitHub Container Registry
echo "
Pushing images to GitHub Container Registry..."
docker push "${FULL_IMAGE_NAME}:${VERSION}"
docker push "${FULL_IMAGE_NAME}:${VERSION}-${GIT_HASH}"
docker push "${FULL_IMAGE_NAME}:latest"

echo "
Images successfully pushed to GitHub Container Registry"
echo "To use the images, update your Kubernetes deployment to use: ${FULL_IMAGE_NAME}:latest"