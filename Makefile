.PHONY: db-start db-stop db-migrate db-seed db-reset db-studio docker-build docker-run help

help:
	@echo "Available database & deployment commands:"
	@echo "  make db-start     - Start PostgreSQL database container with health checks"
	@echo "  make db-stop      - Stop PostgreSQL database container"
	@echo "  make db-migrate   - Run all pending database migrations"
	@echo "  make db-seed      - Populate database with initial seed data"
	@echo "  make db-reset     - Reset database, re-apply migrations, and seed"
	@echo "  make db-studio    - Open Prisma Studio database UI"
	@echo "  make docker-build - Build production multi-stage Docker image"
	@echo "  make docker-run   - Run containerized application locally on port 3000"

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

docker-build:
	docker build -t lookaround-backend:latest .

docker-run:
	docker run --rm -it -p 3000:3000 --env-file .env lookaround-backend:latest

