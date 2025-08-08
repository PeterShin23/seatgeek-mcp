from mcp.server.fastmcp import FastMCP

from .core import register as register_core


def register_tools(mcp: FastMCP):
  register_core(mcp)