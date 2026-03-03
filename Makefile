# FatedWorld — common development commands
# Usage: make <target>

.PHONY: install dev-up dev-down api admin migrate seed icons reset help

## Install all workspace dependencies
install:
	pnpm install

## Start local Docker services (Postgres + Redis)
dev-up:
	docker compose up -d
	@echo "Postgres: localhost:5432  Redis: localhost:6379"

## Stop local Docker services
dev-down:
	docker compose down

## Run Prisma migration (dev — generates SQL + applies)
migrate:
	pnpm --filter @fated/api db:migrate:dev

## Run Prisma migrations (deploy — applies existing SQL, use for CI)
migrate-deploy:
	pnpm --filter @fated/api db:migrate

## Seed the database (creates superadmin user)
seed:
	pnpm --filter @fated/api db:seed

## Open Prisma Studio (DB browser)
studio:
	pnpm --filter @fated/api db:studio

## Start NestJS API in watch mode
api:
	pnpm --filter @fated/api dev

## Start Next.js admin panel
admin:
	pnpm --filter @fatedworld/admin dev

## Generate placeholder Expo assets (icon, splash, etc.)
icons:
	node apps/mobile/scripts/generate-assets.js

## Start Expo mobile app
mobile:
	pnpm --filter @fatedworld/mobile start

## Full local dev setup from scratch
setup: install dev-up
	@echo "Waiting for Postgres..."
	@sleep 3
	$(MAKE) migrate seed icons
	@echo ""
	@echo "Setup complete! Now run:"
	@echo "  make api      — start the NestJS API (port 3000)"
	@echo "  make admin    — start the admin panel (port 3001)"
	@echo "  make mobile   — start Expo (scan QR with Expo Go)"

## Reset local DB (drops + recreates schema)
reset:
	docker compose down -v
	docker compose up -d
	@sleep 3
	$(MAKE) migrate seed

## Lint all workspaces
lint:
	pnpm --filter @fated/api lint

## Run API tests
test:
	pnpm --filter @fated/api test

help:
	@grep -E '^## ' Makefile | sed 's/## //'
