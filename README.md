# seatgeek-mcp

## ⚡ Quick Setup (uv-native)

1. Install [uv](https://github.com/astral-sh/uv):
  ```sh
  brew install uv
  ```

2. Create your environment and install deps:
  ```sh
  uv venv
  source .venv/bin/activate
  uv pip install -r pyproject.toml
  ```

  or **if requirements.lock exists
  ```sh
  uv venv
  source .venv/bin/activate
  uv pip sync
  ```

3. Run:
    ```sh
    python main.py
    ```