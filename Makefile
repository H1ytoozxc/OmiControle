.PHONY: help fmt lint test build run-dev migrate proto docker-up docker-down audit cover bench

help:
	@echo "Sequoia — common dev targets:"
	@echo "  make fmt           - cargo fmt across workspace"
	@echo "  make lint          - cargo clippy --all-targets --all-features -D warnings"
	@echo "  make test          - cargo test --workspace"
	@echo "  make build         - cargo build --workspace --release"
	@echo "  make migrate       - sqlx migrate run for each service schema"
	@echo "  make proto         - regenerate gRPC bindings"
	@echo "  make docker-up     - bring up dev stack (pg, redis, otel-collector, jaeger, prom)"
	@echo "  make docker-down   - tear down dev stack"
	@echo "  make audit         - cargo audit + cargo deny"

fmt:
	cargo fmt --all

lint:
	cargo clippy --workspace --all-targets --all-features -- -D warnings

test:
	cargo nextest run --workspace || cargo test --workspace

build:
	cargo build --workspace --release

run-dev:
	docker compose -f deploy/docker/docker-compose.yml up -d
	cargo run -p sequoia-api-gateway

migrate:
	sqlx migrate run --source migrations/auth         --database-url $$DATABASE_URL
	sqlx migrate run --source migrations/device       --database-url $$DATABASE_URL
	sqlx migrate run --source migrations/ai           --database-url $$DATABASE_URL
	sqlx migrate run --source migrations/workflow     --database-url $$DATABASE_URL
	sqlx migrate run --source migrations/telemetry    --database-url $$DATABASE_URL
	sqlx migrate run --source migrations/notification --database-url $$DATABASE_URL
	sqlx migrate run --source migrations/plugin       --database-url $$DATABASE_URL
	sqlx migrate run --source migrations/audit        --database-url $$DATABASE_URL

proto:
	cargo build -p sequoia-proto

docker-up:
	docker compose -f deploy/docker/docker-compose.yml up -d

docker-down:
	docker compose -f deploy/docker/docker-compose.yml down -v

audit:
	cargo audit
	cargo deny check

cover:
	cargo llvm-cov nextest --workspace --html

bench:
	cargo bench --workspace
