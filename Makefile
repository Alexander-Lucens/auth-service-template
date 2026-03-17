.PHONY: help install dev build lint test test-e2e test-all prisma-generate prisma-migrate-up prisma-migrate-reset docker-up docker-build docker-down docker-down-volumes docker-logs docker-ps docker-prod-up docker-prod-deploy docker-prod-down

help:
	@echo "Available targets:"
	@echo "  make install            - npm install"
	@echo "  make dev                - run app in dev mode"
	@echo "  make build              - build project"
	@echo "  make lint               - run linter"
	@echo "  make test               - run unit tests"
	@echo "  make test-e2e           - run e2e tests"
	@echo "  make test-all           - run all tests"
	@echo "  make prisma-generate    - generate Prisma client"
	@echo "  make prisma-migrate-up  - apply Prisma migrations"
	@echo "  make prisma-migrate-reset - reset Prisma db (dev only)"
	@echo "  make docker-up          - start dev docker stack"
	@echo "  make docker-build       - start stack (db+app) with runtime bootstrap"
	@echo "  make docker-down        - stop docker stack"
	@echo "  make docker-down-volumes - stop stack and remove volumes"
	@echo "  make docker-logs        - tail app+db logs"
	@echo "  make docker-ps          - list containers"
	@echo "  make docker-prod-up     - start prod-like stack"
	@echo "  make docker-prod-deploy - start prod-like stack + migrate"
	@echo "  make docker-prod-down   - stop prod-like stack"

install:
	npm install

dev:
	npm run start:dev

build:
	npm run build

lint:
	npm run lint

test:
	npm run test:unit

test-e2e:
	npm run test:e2e

test-all:
	npm run test:all

prisma-generate:
	npm run prisma:generate

prisma-migrate-up:
	npm run prisma:migrate:deploy

prisma-migrate-reset:
	npm run prisma:migrate:reset

docker-up:
	npm run docker:up

docker-build:
	npm run docker:build

docker-down:
	npm run docker:down

docker-down-volumes:
	npm run docker:down:volumes

docker-logs:
	npm run docker:logs

docker-ps:
	npm run docker:ps

docker-prod-up:
	npm run docker:prod:up

docker-prod-deploy:
	npm run docker:prod:deploy

docker-prod-down:
	npm run docker:prod:down
