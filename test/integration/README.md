# PostgreSQL integration tests

These tests use real migrations and repositories. DEV.to and Telegram calls are
mocked; no articles are fetched and no messages are sent. `.env` is never loaded.
Every test gets a randomly named database using the `public` schema, which is
removed afterwards. This matches migrations that explicitly qualify enum types
with `public`. The test role needs CREATEDB (the disposable Docker/CI role has it).
Only databases created by the current test are removed. The connection must
target a dedicated database named `tg_news_test`; never use a production database.

Start a disposable local database:

```bash
docker run --rm -d --name tg-news-integration-db -p 127.0.0.1:55432:5432 -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=tg_news_test postgres:17-bookworm
```

After `docker exec tg-news-integration-db pg_isready -U test -d tg_news_test`
reports ready, run in Git Bash:

```bash
TEST_DATABASE_URL=postgresql://test:test@127.0.0.1:55432/tg_news_test npm test -- --runInBand
docker stop tg-news-integration-db
```

Without TEST_DATABASE_URL the PostgreSQL suite is explicitly skipped. CI supplies
the connection and runs it before publishing the application image.

The tests do not claim that delivery recovery/retries or gap-free API pagination
are implemented. Those remain separate application changes.
