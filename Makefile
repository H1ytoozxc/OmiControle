.PHONY: help \
        backend-fmt backend-lint backend-test backend-build backend-migrate backend-proto backend-audit backend-cover backend-bench \
        frontend-dev frontend-build frontend-lint frontend-type-check \
        dev docker-up docker-down

BACKEND  := backend
FRONTEND := frontend

help:
	@echo "Sequoia monorepo — top-level targets:"
	@echo ""
	@echo "  Infrastructure"
	@echo "    make docker-up          bring up postgres, redis, otel, jaeger, prometheus, grafana"
	@echo "    make docker-down        tear down the dev stack"
	@echo "    make dev                docker-up + backend API gateway + frontend dev server"
	@echo ""
	@echo "  Backend  (Rust / Cargo — delegates to backend/)"
	@echo "    make backend-fmt        cargo fmt across workspace"
	@echo "    make backend-lint       cargo clippy -D warnings"
	@echo "    make backend-test       cargo nextest run"
	@echo "    make backend-build      cargo build --release"
	@echo "    make backend-migrate    sqlx migrate run for all schemas"
	@echo "    make backend-proto      regenerate gRPC bindings"
	@echo "    make backend-audit      cargo audit + cargo deny"
	@echo "    make backend-cover      llvm-cov HTML report"
	@echo "    make backend-bench      cargo bench"
	@echo ""
	@echo "  Frontend  (Next.js / npm — delegates to frontend/)"
	@echo "    make frontend-dev       next dev"
	@echo "    make frontend-build     next build"
	@echo "    make frontend-lint      eslint"
	@echo "    make frontend-type-check  tsc --noEmit"

# ── Infrastructure ──────────────────────────────────────────────────────────

docker-up:
	docker compose -f $(BACKEND)/deploy/docker/docker-compose.yml up -d

docker-down:
	docker compose -f $(BACKEND)/deploy/docker/docker-compose.yml down -v

dev: docker-up
	$(MAKE) -C $(BACKEND) run-dev &
	$(MAKE) -C $(FRONTEND) dev

# ── Backend delegation ───────────────────────────────────────────────────────

backend-%:
	$(MAKE) -C $(BACKEND) $*

# ── Frontend delegation ──────────────────────────────────────────────────────

frontend-%:
	$(MAKE) -C $(FRONTEND) $*
