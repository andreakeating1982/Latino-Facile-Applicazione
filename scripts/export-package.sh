#!/usr/bin/env bash
# ZIP sorgente completo da HEAD pulito; nessun deploy, rete, DB o chiave.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
for cmd in node git python3; do
  command -v "$cmd" >/dev/null || { echo "Manca il requisito: $cmd" >&2; exit 2; }
done
NAME="$(node scripts/package-info.mjs name)"
if [[ "$(git rev-parse --show-toplevel)" != "$ROOT" ]]; then
  echo "Inizializzare una repository autonoma nella cartella progetto." >&2; exit 2
fi
if [[ -n "$(git status --porcelain --untracked-files=normal)" ]]; then
  echo "Sorgente/staging non puliti. Rivedere il diff e salvare un commit; nessun file verrà cancellato." >&2; exit 2
fi
node scripts/check-package.mjs
REV="$(git rev-parse --short HEAD)"
DEFAULT="$(dirname "$ROOT")/${NAME}-export-$(date +%F)-${REV}.zip"
OUT="$(node scripts/package-info.mjs resolve "${1:-$DEFAULT}")"
case "$OUT" in "$ROOT"|"$ROOT"/*) echo "L'output deve stare fuori dalla repository." >&2; exit 2;; esac
case "$OUT" in *.zip) ;; *) echo "Usare un nome con estensione .zip" >&2; exit 2;; esac
if [[ -e "$OUT" || -e "$OUT.verifica.json" || -e "$OUT.sha256" ]]; then
  echo "Output già esistente: nessuna consegna verrà sovrascritta. Scegliere un nuovo nome." >&2; exit 2
fi
mkdir -p "$(dirname "$OUT")"
TMP="$(mktemp "${OUT}.tmp.XXXXXX")"
trap 'rm -f "$TMP"' EXIT
git archive --format=zip --prefix="${NAME}/" HEAD -o "$TMP"
mv "$TMP" "$OUT"
if ! python3 scripts/verify-package.py --repo "$ROOT" --archive "$OUT" --report "$OUT.verifica.json"; then
  rm -f "$OUT"
  echo "Archivio appena creato ritirato perché la verifica è fallita." >&2
  exit 1
fi
printf '\nArchivio pronto: %s\nRapporto: %s.verifica.json\nChecksum: %s.sha256\n' "$OUT" "$OUT" "$OUT"
