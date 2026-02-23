.PHONY: install install-dev lint evals eval-viewer-install eval-viewer

install:
	uv sync

install-dev:
	uv sync --group dev

lint:
	uv run ruff check . --fix

evals:
	uv run ruff check evals agent --fix
	uv run pytest evals/ -vs --timeout=300

eval-viewer-install:
	cd viewer && npm install

eval-viewer:
	cd viewer && npm run dev
