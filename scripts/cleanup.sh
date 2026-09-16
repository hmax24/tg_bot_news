#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

MODE="${1:---dry-run}"
[[ "$MODE" == '--dry-run' || "$MODE" == '--apply' ]] || exit 2
cd "$HOME/tg-bot-news"

# Use the same lock as deployment. Never clean up during a release.
exec 9>.deploy.lock
flock -n 9 || { echo 'Deployment or cleanup is running'; exit 1; }

REPOSITORY='ghcr.io/hmax24/tg_bot_news'
KEEP_IMAGES=3
KEEP_BACKUPS=5
declare -A PROTECTED_IDS=()
declare -A PROTECTED_REFS=()

# Protect images belonging to any existing container, including stopped ones.
CONTAINERS="$(sudo -n docker ps -aq)"
while IFS= read -r CONTAINER; do
    [[ -n "$CONTAINER" ]] || continue
    IMAGE_ID="$(sudo -n docker inspect --format '{{.Image}}' "$CONTAINER")"
    PROTECTED_IDS["$IMAGE_ID"]=1
done <<< "$CONTAINERS"

# Also preserve the active and previous release references for manual recovery.
for CONFIG in compose.release.yaml compose.release.yaml.previous; do
    [[ -f "$CONFIG" ]] || continue
    REFERENCES="$(sudo -n docker compose -f compose.yaml -f "$CONFIG" config --images)"
    while IFS= read -r REFERENCE; do
        [[ -n "$REFERENCE" ]] && PROTECTED_REFS["$REFERENCE"]=1
    done <<< "$REFERENCES"
done

REFERENCES="$(sudo -n docker image ls --filter "reference=$REPOSITORY:*" --format '{{.Repository}}:{{.Tag}}')"
IMAGE_ROWS=()
while IFS= read -r REFERENCE; do
    [[ "$REFERENCE" == "$REPOSITORY:"* ]] || continue
    TAG="${REFERENCE#"$REPOSITORY:"}"
    [[ "$TAG" =~ ^[0-9a-f]{40}$ ]] || continue
    DETAILS="$(sudo -n docker image inspect --format '{{.Created}} {{.Id}}' "$REFERENCE")"
    IMAGE_ROWS+=("$DETAILS $REFERENCE")
done <<< "$REFERENCES"

INDEX=0
while read -r CREATED IMAGE_ID REFERENCE; do
    [[ -n "${REFERENCE:-}" ]] || continue
    INDEX=$((INDEX + 1))
    if (( INDEX <= KEEP_IMAGES )) ||
        [[ -n "${PROTECTED_IDS[$IMAGE_ID]:-}" ]] ||
        [[ -n "${PROTECTED_REFS[$REFERENCE]:-}" ]]; then
        echo "Keep image: $REFERENCE"
        continue
    fi
    echo "Remove image tag ($MODE): $REFERENCE"
    if [[ "$MODE" == '--apply' ]]; then
        # Never force deletion of an image in use.
        sudo -n docker image rm "$REFERENCE"
    fi
done < <(printf '%s\n' "${IMAGE_ROWS[@]}" | LC_ALL=C sort -r)

# Only completed backups with the exact filename produced by deploy.sh qualify.
# Partial files, symlinks and unrelated files are left alone.
BACKUPS=()
shopt -s nullglob
for FILE in backups/news-*.dump; do
    [[ -f "$FILE" && ! -L "$FILE" && -s "$FILE" ]] || continue
    NAME="${FILE##*/}"
    [[ "$NAME" =~ ^news-[0-9]{8}T[0-9]{6}Z-[0-9a-f]{40}\.dump$ ]] || continue
    BACKUPS+=("$FILE")
done

INDEX=0
while IFS= read -r FILE; do
    [[ -n "$FILE" ]] || continue
    INDEX=$((INDEX + 1))
    if (( INDEX <= KEEP_BACKUPS )); then
        echo "Keep backup: $FILE"
        continue
    fi
    echo "Remove backup ($MODE): $FILE"
    if [[ "$MODE" == '--apply' ]]; then
        rm -- "$FILE"
    fi
done < <(printf '%s\n' "${BACKUPS[@]}" | LC_ALL=C sort -r)

echo "Cleanup completed ($MODE)"
