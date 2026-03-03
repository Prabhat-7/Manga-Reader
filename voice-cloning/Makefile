SHELL := /bin/zsh

PYTHON ?= .venv/bin/python
HOST ?= 127.0.0.1
GUI_PORT ?= 7860
API_PORT ?= 8001

.PHONY: run dev api

run:
	uv run --python $(PYTHON) gui_app.py --host $(HOST) --port $(GUI_PORT)

dev: run

api:
	uv run --python $(PYTHON) -m uvicorn voice_api:app --host $(HOST) --port $(API_PORT) --reload
