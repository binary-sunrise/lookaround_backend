.PHONY: db-start db-stop db-migrate db-seed db-reset db-studio help

help:
	@echo "Available database lifecycle commands:"
	@echo "  make db-start    - Start PostgreSQL database container with health checks"
	@echo "  make db-stop     - Stop PostgreSQL database container"
	@echo "  make db-migrate  - Run all pending database migrations"
	@echo "  make db-seed     - Populate database with initial local development seed data"
	@echo "  make db-reset    - Reset database, re-apply migrations, and seed"
	@echo "  make db-studio   - Open Prisma Studio database UI"

db-start:
	docker compose up -d postgres

db-stop:
	docker compose down

db-migrate:
	npx prisma migrate deploy

db-seed:
	npx tsx prisma/seed.ts

db-reset:
	npx prisma migrate reset --force

db-studio:
	npx prisma studio
