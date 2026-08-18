# ═══════════════════════════════════════════════
# magmacrunch media — common operations
# Run `make help` to see all commands
# ═══════════════════════════════════════════════

PI_HOST ?= jake@192.168.1.16
PI_DIR  ?= ~/arcade

# ── Help ──────────────────────────────────────

.PHONY: help
help: ## Show available commands
	@echo ""
	@echo "  magmacrunch media — available commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ── Linting ───────────────────────────────────

.PHONY: lint lint-fix lint-all lint-game
lint: ## Run ESLint on shared JS
	npx eslint nav.js assets/*.js templates/*.js arcade/shared/*.js

lint-fix: ## Auto-fix ESLint issues
	npx eslint --fix nav.js assets/*.js templates/*.js arcade/shared/*.js

lint-all: ## Run ESLint on ALL JS (many game-specific warnings expected)
	npx eslint nav.js assets/*.js templates/*.js arcade/shared/*.js "arcade/**/js/*.js" --no-error-on-unmatched-pattern

lint-game: ## Lint a specific game: make lint-game GAME=chess
	@if [ -z "$(GAME)" ]; then echo "Usage: make lint-game GAME=chess"; exit 1; fi
	npx eslint arcade/$(GAME)/js/*.js 2>/dev/null || true

# ── Testing ───────────────────────────────────

.PHONY: test test-py test-js check
test: lint test-js ## Run lint + JS tests (fast)

test-py: ## Run Python pytest suites
	@failures=0; \
	for dir in $$(find arcade -name 'test_*.py' -exec dirname {} \; | sort -u); do \
		echo "=== $$dir ==="; \
		(cd "$$dir" && python3 -m pytest -v --tb=short) || failures=$$((failures + 1)); \
	done; \
	if [ "$$failures" -gt 0 ]; then \
		echo "\n$$failures test suite(s) had failures"; \
		exit 1; \
	fi

test-js: ## Run Node.js test files
	@for f in $$(find arcade -name 'test-*.js' -path '*/tests/*'); do \
		echo "=== $$f ==="; \
		node "$$f" || exit 1; \
	done

check: lint test-py test-js ## Run all checks (lint + Python + JS)

# ── Deploy to Pi ──────────────────────────────

.PHONY: deploy-pi pi-status logs
deploy-pi: ## Deploy arcade/ to Raspberry Pi
	@echo "Deploying to $(PI_HOST)..."
	rsync -avz --delete \
		--exclude 'node_modules' \
		--exclude '.git' \
		--exclude '*.pyc' \
		--exclude '__pycache__' \
		--exclude 'scores/*.json' \
		arcade/ $(PI_HOST):$(PI_DIR)/
	@echo "Restarting services..."
	ssh $(PI_HOST) "sudo systemctl restart 'arcade-*'"
	@echo "Done. Run 'make pi-status' to verify."

pi-status: ## Check Pi service status
	ssh $(PI_HOST) "sudo systemctl status 'arcade-*' --no-pager" | head -40

logs: ## Tail Pi service logs
	ssh $(PI_HOST) "journalctl -u 'arcade-*' -f --no-pager"

# ── Backups ───────────────────────────────────

.PHONY: backup backup-mb
backup: ## Sync to private backup repo
	./scripts/backup-private.sh

backup-mb: ## Run MusicBrainz cache backup
	node scripts/backup-musicbrainz.mjs --skip-existing

# ── Build ─────────────────────────────────────

.PHONY: search-index optimize-images
search-index: ## Rebuild search-index.json
	node scripts/build-search-index.js

optimize-images: ## Optimize oversized images (flyers, photos)
	node scripts/optimize-images.mjs
