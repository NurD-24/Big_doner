#!/bin/sh
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Node.js ornatylmagan: https://nodejs.org"; exit 1; }
printf "Admin qupiyasozin zhazynyz: "; read ADMIN_PASSWORD
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"
node server.js
