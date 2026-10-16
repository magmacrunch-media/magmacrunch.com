# MCP server

**Moved out, 2026-10-15.** The server is `magmacrunch-media/magma-mcp` (private), with its
history, and its README is the document to read: where it runs, how to deploy a change,
the key, the tools.

What is still this repo's business:

- **nginx on the Pi** forwards `https://magmacrunch.duckdns.org/mcp` to MC1, at
  `arcade/scripts/nginx-magmacrunch.conf`. It passes the `Authorization` header through and
  checks nothing itself; the Bearer key is enforced in the server.
- **The data it serves** comes from a checkout of this repo on MC1's WSL,
  `/home/magma/website`: `archive/_cache/`, `arcade/admin/`, `music/jukebox/`.
- **The weekly-scores workflow** calls the endpoint with the `MCP_API_KEY` secret.

There is no Pi fallback any more. The Pi had an `arcade-mcp` unit and a copy of the code
that every deploy refreshed; the unit was never enabled and never ran, and both are gone.
