#!/bin/bash
# Commit + push tüm değişiklikler. Kendi bilgisayarında çalıştır.
# Kullanım: ./scripts/git-save.sh "Commit mesajı"
#          veya: npm run git-save -- "Commit mesajı"

set -e
cd "$(dirname "$0")/.."

if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "Hata: Bu klasör bir Git projesi değil."
  exit 1
fi

MSG="${1:-}"
if [ -z "$MSG" ]; then
  MSG="Update: $(date '+%Y-%m-%d %H:%M')"
fi

git add .
if git diff --staged --quiet; then
  echo "Commitlenecek değişiklik yok."
  exit 0
fi

git commit -m "$MSG"
git push

echo "✓ Commit ve push tamamlandı."
