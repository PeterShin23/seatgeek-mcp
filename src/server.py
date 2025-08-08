import asyncio, logging, os
from mcp.server.fastmcp import FastMCP
from mcp.server.stdio import StdioTransport
from mcp.server.streamable_http import HttpTransport
from tools import register_tools

log = logging.getLogger("seatgeek_mcp")
logging.basicConfig(level=logging.INFO, handlers=[logging.StreamHandler()])

mcp = FastMCP("seatgeek", version="0.1.0")
register_tools(mcp)

async def _serve() -> None:
    if os.getenv("MCP_HTTP"):
        port = int(os.getenv("PORT", "8080"))
        transport = HttpTransport(host="0.0.0.0", port=port, stream=True)
        log.info("Running over HTTP on :%d", port)
    else:
        transport = StdioTransport()
        log.info("Running over STDIO")

    await mcp.run(transport)

def main() -> None:
    try:
        asyncio.run(_serve())
    except KeyboardInterrupt:
        log.info("Graceful shutdown")

if __name__ == "__main__":
    main()
