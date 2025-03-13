#!/bin/bash
# Script para actualizar el repositorio en GitHub

BRANCH="main"

if [ -z "$1" ]; then
  MESSAGE="Actualización automática $(date '+%Y-%m-%d %H:%M:%S')"
else
  MESSAGE="$1"
fi

git add .
if git diff-index --quiet HEAD --; then
  echo "No hay cambios para commit."
else
  git commit -m "$MESSAGE"
fi

git push origin $BRANCH

echo "Repositorio actualizado en GitHub."
