#!/bin/bash

# Ensure Python environment is set up
export PATH="$HOME/.local/bin:$PATH"
export PYTHONUNBUFFERED=1

# Check which MCP server to run
case "$1" in
  "tavily")
    exec python -m mcp_tavily
    ;;
  "jina")
    exec python -m jina_mcp
    ;;
  *)
    echo "Unknown MCP server: $1" >&2
    exit 1
    ;;
esac