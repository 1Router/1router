#!/bin/bash
# Builds and pushes the 1Router site image to GHCR (ghcr.io/1router/1router-site).
# Image is tagged :main so the deployment always tracks the latest main-branch build.
#
# Runs from the repo root regardless of where it was invoked, because the
# apps/site/Dockerfile expects the monorepo as its build context (it COPYs
# the root package.json, bun.lock, turbo.json, packages/models, etc.).
#
# Usage:  ./apps/site/build.sh
#        bash apps/site/build.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
cd "$REPO_ROOT"

VERSION=$(bun -p "require('./package.json').version")
GIT_HASH=$(git rev-parse --short HEAD)

GHCR_DOMAIN="ghcr.io"
GHCR_OWNER="1router"
IMAGE_NAME="1router-site"
FULL_IMAGE_NAME="${GHCR_DOMAIN}/${GHCR_OWNER}/${IMAGE_NAME}"

echo "Building ${FULL_IMAGE_NAME} from ${REPO_ROOT}"
echo "  version: ${VERSION}"
echo "  git sha: ${GIT_HASH}"

docker build \
  -f apps/site/Dockerfile \
  -t "${FULL_IMAGE_NAME}:${VERSION}" \
  -t "${FULL_IMAGE_NAME}:${VERSION}-${GIT_HASH}" \
  -t "${FULL_IMAGE_NAME}:main" \
  .

echo
echo "Tags applied:"
echo "  ${FULL_IMAGE_NAME}:${VERSION}"
echo "  ${FULL_IMAGE_NAME}:${VERSION}-${GIT_HASH}"
echo "  ${FULL_IMAGE_NAME}:main"

echo
echo "Pushing to ${GHCR_DOMAIN}..."
docker push "${FULL_IMAGE_NAME}:${VERSION}"
docker push "${FULL_IMAGE_NAME}:${VERSION}-${GIT_HASH}"
docker push "${FULL_IMAGE_NAME}:main"

cat <<EOF

✓ Done. The deployment pulls ${FULL_IMAGE_NAME}:main with imagePullPolicy: Always,
so kubelet picks up the new image on every pod restart. To force a redeploy
without restarting the pod yourself (rolling update):

  kubectl -n 1router rollout restart deployment/1router-frontend

Or, to start from scratch, apply the manifests in numeric order:

  kubectl apply -f apps/site/k8s/00-namespace.yaml
  kubectl apply -f apps/site/k8s/01-deployment.yaml
  kubectl apply -f apps/site/k8s/02-service.yaml
  kubectl apply -f apps/site/k8s/03-ingress.yaml
EOF
