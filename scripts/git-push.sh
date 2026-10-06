#!/bin/bash
set -e

REPO="github.com/multibotmulti-beep/bot.git"

if [ -n "$GITHUB_TOKEN" ]; then
    TOKEN="$GITHUB_TOKEN"
    echo "Usando GITHUB_TOKEN del entorno..."
else
    echo -n "Introduce tu Token de Acceso Personal (PAT) de GitHub: "
    read -s TOKEN
    echo
fi

if [ -z "$TOKEN" ]; then
    echo "❌ Error: Token vacío."
    exit 1
fi

echo "Empujando cambios a GitHub..."
git push "https://${TOKEN}@${REPO}" master

echo "✅ Push completado exitosamente. Token eliminado de memoria."
