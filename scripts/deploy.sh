#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

COMMIT_SHA="${1:?Commit SHA is required}"

if [[ ! "$COMMIT_SHA" =~ ^[0-9a-f]{40}$ ]]; then
    echo "Invalid commit SHA"
    exit 1
fi

cd "$HOME/tg-bot-news"

# Prevent overlapping deployments, including manual runs.
exec 9>.deploy.lock
flock -n 9 || {
    echo "Another deployment is running"
    exit 1
}

IMAGE="ghcr.io/hmax24/tg_bot_news:$COMMIT_SHA"
RELEASE_FILE="compose.release.yaml"
CANDIDATE_FILE="compose.candidate.yaml"

BASE_COMPOSE=(sudo -n docker compose -f compose.yaml)
CURRENT_COMPOSE=("${BASE_COMPOSE[@]}")

if [[ -f "$RELEASE_FILE" ]]; then
    CURRENT_COMPOSE+=(-f "$RELEASE_FILE")
fi

trap 'echo "Deployment failed. Check the failed command above; database rollback was not performed." >&2' ERR

# Download before stopping the currently running application.
sudo -n docker pull "$IMAGE"

printf 'services:\n  app:\n    image: "%s"\n' "$IMAGE" > "$CANDIDATE_FILE"
NEXT_COMPOSE=("${BASE_COMPOSE[@]}" -f "$CANDIDATE_FILE")
"${NEXT_COMPOSE[@]}" config --quiet

mkdir -p backups
chmod 700 backups
BACKUP="backups/news-$(date -u +%Y%m%dT%H%M%SZ)-$COMMIT_SHA.dump"

"${CURRENT_COMPOSE[@]}" stop app

if ! "${BASE_COMPOSE[@]}" exec -T db \
    sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
    > "$BACKUP.partial"; then
    echo "Backup failed; restarting the previous application"
    "${CURRENT_COMPOSE[@]}" up -d --no-deps app
    exit 1
fi

if [[ ! -s "$BACKUP.partial" ]]; then
    echo "Backup is empty; restarting the previous application"
    "${CURRENT_COMPOSE[@]}" up -d --no-deps app
    exit 1
fi

mv "$BACKUP.partial" "$BACKUP"
echo "Database backup saved: $BACKUP"

# Migration failure requires inspection before restarting old code.
"${NEXT_COMPOSE[@]}" run --rm --no-deps -T \
    app npm run migration:run:prod

if [[ -f "$RELEASE_FILE" ]]; then
    cp "$RELEASE_FILE" "${RELEASE_FILE}.previous"
fi

mv "$CANDIDATE_FILE" "$RELEASE_FILE"
RELEASE_COMPOSE=("${BASE_COMPOSE[@]}" -f "$RELEASE_FILE")
"${RELEASE_COMPOSE[@]}" up -d --no-deps app

# Any HTTP response verifies that NestJS is listening, including a 404.
READY=0
for ATTEMPT in $(seq 1 30); do
    if "${RELEASE_COMPOSE[@]}" exec -T app node -e '
        fetch("http://127.0.0.1:3000", {
            signal: AbortSignal.timeout(3000)
        })
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
    ' >/dev/null 2>&1; then
        READY=1
        break
    fi
    sleep 2
done

if [[ "$READY" -ne 1 ]]; then
    echo "Application did not become ready"
    "${RELEASE_COMPOSE[@]}" ps
    exit 1
fi

sleep 10
CONTAINER_ID="$("${RELEASE_COMPOSE[@]}" ps -q app)"

if [[ -z "$CONTAINER_ID" ]]; then
    echo "Application container is not running"
    exit 1
fi

CONTAINER_STATE="$(
    sudo -n docker inspect \
        --format '{{.State.Running}} {{.RestartCount}}' \
        "$CONTAINER_ID"
)"

if [[ "$CONTAINER_STATE" != "true 0" ]]; then
    echo "Application is unstable: $CONTAINER_STATE"
    exit 1
fi

echo "Deployment completed: $IMAGE"
"${RELEASE_COMPOSE[@]}" ps
