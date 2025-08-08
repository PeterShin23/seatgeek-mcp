from mcp.server.fastmcp import FastMCP

def register(mcp: FastMCP):
  @mcp.tool()
  async def ping() -> str:
    """Health check tool - returns 'pong'."""
    return "pong"
    