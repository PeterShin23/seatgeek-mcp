# GitHub Copilot Instructions for seatgeek-mcp

## Project Overview

- This repo is a Python MCP (Model Context Protocol) agent exposing SeatGeek tools (event discovery, price analysis, recommendations, ticket link generation).
- The project is designed for seamless integration with Open WebUI, Claude Desktop, and Pulse MCP.
- The core server is implemented using the `modelcontextprotocol` Python SDK and exposes tool handlers in the `/tools` directory.

## Code Style

- Follow PEP8 for Python code.
- Use docstrings for all public functions and classes.
- Type annotations are encouraged for function arguments and return types.
- Prefer explicit error handling and user-friendly error messages.
- Output markdown-formatted responses where possible (for LLM UIs).
- Add new lines before return statements.

## Project Structure

- `main.py`: Starts the MCP server using Stdio transport and registers all tools.
- `tools/`: Contains all tool handler implementations.
    - Each tool should be defined as a `Tool` object (from `modelcontextprotocol.types`), with JSON schema parameters and a Python handler function.
    - Tool handler functions should return a dictionary with a `markdown` key for the response, and optionally other keys for structured data.
- `.env.example`: Example for environment variables (e.g., `SEATGEEK_CLIENT_ID`).
- `pyproject.toml`: Defines project metadata and dependencies.
- `requirements.lock`: Pinned dependencies for reproducible builds.

## Dependencies

- modelcontextprotocol
- requests
- python-dotenv

## Best Practices for Copilot Suggestions

- When generating new tools, always define both the JSON schema (`parameters`) and the handler.
- Use the `os.environ` dictionary to access required API keys.
- Fetch data from the SeatGeek API using the `requests` library.
- Compose markdown output with meaningful formatting (e.g., tables, bullet points, links).
- Handle edge cases (missing keys, empty API responses, etc.) gracefully.
- All tool handler functions should be idempotent and stateless.

## Example Tool Skeleton

```python
from modelcontextprotocol.types import Tool
import requests
import os

def my_tool_handler(params):
    # Access parameters from 'params' dict
    # Call external APIs as needed
    # Format output as markdown
    return {
        "markdown": "Your response here"
    }

my_tool = Tool(
    name="my_tool",
    description="Describe what the tool does.",
    parameters={
        "type": "object",
        "properties": {
            "example": {"type": "string", "description": "Example input."}
        },
        "required": ["example"]
    },
    handler=my_tool_handler
)
