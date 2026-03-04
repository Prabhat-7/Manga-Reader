.PHONY: dev test lint format start

dev:
	uv run fastapi dev main.py
start:
	uv run fastapi run main.py	
test:
	uv run pytest tests/ -v

lint:
	uv run ruff check .

format:
	uv run ruff format .