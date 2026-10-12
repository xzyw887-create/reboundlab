# Обновление backtestpro.ru с Mac

Код правите **локально** в `~/Projects/reboundlab`. На сервер попадает **rsync + пересборка web** (Postgres и данные не трогаем).

## Автодеплой из GitHub (рекомендуется)

После настройки **один раз** прод обновляется сам при **`git push` в `main`** (или кнопка **Actions → Deploy production → Run workflow**).

### Один раз: SSH-ключ только для деплоя

**На Mac:**

```bash
ssh-keygen -t ed25519 -C "github-actions-backtestpro" -f ~/.ssh/backtestpro_deploy -N ""
cat ~/.ssh/backtestpro_deploy.pub
```

**На VPS** (под root, пароль как обычно):

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo 'ВСТАВЬТЕ_СТРОКУ_ИЗ_.pub' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Проверка с Mac:

```bash
ssh -i ~/.ssh/backtestpro_deploy root@5.63.152.44 'echo ok'
```

**В GitHub:** репозиторий [reboundlab](https://github.com/xzyw887-create/reboundlab) → **Settings → Secrets and variables → Actions**

| Имя | Тип | Значение |
|-----|-----|----------|
| `VPS_SSH_PRIVATE_KEY` | Secret | приватный ключ (см. команду ниже — надёжнее, чем копировать руками) |

**Залить секрет с Mac одной командой** (после `gh auth login`):

```bash
gh secret set VPS_SSH_PRIVATE_KEY < ~/.ssh/backtestpro_deploy
```

Опционально **Variables** (если другой сервер/путь):

| Имя | Пример |
|-----|--------|
| `VPS_HOST` | `5.63.152.44` |
| `VPS_USER` | `root` |
| `VPS_DEPLOY_PATH` | `/opt/reboundlab` |
| `DEPLOY_HEALTH_URL` | `https://backtestpro.ru/api/health` |

### Обычный цикл работы

1. Правки локально (в том числе через Cursor).
2. `git add … && git commit && git push origin main`
3. **Actions** на GitHub — зелёная галочка ≈ 5–15 мин → сайт обновлён.

Локальные коммиты **без push** на прод **не попадают** — только то, что в GitHub.

---

## Ручной деплой (если Actions недоступен)

```bash
chmod +x scripts/deploy-vps.sh
DEPLOY_SSH_KEY=~/.ssh/backtestpro_deploy ./scripts/deploy-vps.sh
```

Или по шагам ниже.

## 1. Mac — залить файлы

```bash
rsync -avz --exclude node_modules --exclude .git --exclude .data --exclude .env \
  ~/Projects/reboundlab/ root@5.63.152.44:/opt/reboundlab/
```

Пароль SSH — **к серверу**. Файл **`.env` на сервере не перезаписывается** (`--exclude .env`).

## 2. SSH — пересобрать сайт

```bash
ssh -o PubkeyAuthentication=no root@5.63.152.44
cd /opt/reboundlab
set -a && source .env && set +a
docker compose -f deploy/docker/docker-compose.prod.yml up -d --build web
```

Обычно **5–15 минут**. Сайт на минуту может перезапуститься — **сервер заново «заказывать» не нужно**.

## 3. Проверка

https://backtestpro.ru/api/health → `"ok":true`

## Переменные на сервере

Редактировать только на VPS: `/opt/reboundlab/.env` → затем шаг 2 (без rsync, если меняли только `.env`).

## Свечи для бэктеста (один раз или после пустой БД)

После миграций (`DATABASE_URL=… node scripts/migrate/apply-neon.js` или `scripts/setup-production-db.sh`) на **VPS**:

```bash
cd /opt/reboundlab
set -a && source .env && set +a
docker compose -f deploy/docker/docker-compose.prod.yml --profile seed run --rm market-seed
```

По умолчанию **BTC, ETH, SOL, BNB, XRP × 60 дней** (1m). Переопределение:

```bash
PROD_MARKET_DAYS=45 PROD_MARKET_SYMBOLS=BTCUSDT,ETHUSDT \
  docker compose -f deploy/docker/docker-compose.prod.yml --profile seed run --rm market-seed
```

С Mac можно то же через SSH после `git push`, либо локально с `DATABASE_URL` на прод (если Postgres доступен).
