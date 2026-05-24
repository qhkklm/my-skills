---
name: cups-web-macos-deploy
description: Deploy and troubleshoot cups-web on macOS with local CUPS, 1Panel/OpenResty reverse proxy, launchd service management, LibreOffice document conversion, and network printers. Use when setting up this service from scratch, re-deploying it on the same macOS host, fixing HTTPS/reverse proxy issues, repairing printer discovery, improving Word-to-PDF fidelity, or validating end-to-end web printing.
---

# cups-web-macos-deploy

Use this skill for the local `cups-web` deployment pattern that serves `cups-web` on macOS behind `1Panel` and `OpenResty`, with CUPS and LibreOffice running on the same machine.

## Quick Defaults

- App repo: `/Users/hxyou/cups-web`
- Runtime root: `/Users/hxyou/cups-web/.deploy`
- App listen: `127.0.0.1:18780`
- CUPS: `localhost:631`
- LaunchAgent: `/Users/hxyou/Library/LaunchAgents/com.hxyou.cups-web.plist`
- Public site: `https://print.932101613.xyz`

## Workflow

1. Read [references/deploy-runbook.md](references/deploy-runbook.md) before changing anything.
2. Use the "Deployment" section when installing or rebuilding the service.
3. Use the "Reverse Proxy and TLS" section when the site or certificate is broken.
4. Use the "CUPS and Printer Queue" section when the web UI cannot see printers or jobs complete without output.
5. Use the "LibreOffice Fidelity" section when Office documents convert but spacing, pagination, or fonts drift.
6. Use the "Validation Checklist" section before considering the work done.

## Rules

- Keep `cups-web` bound to `127.0.0.1`, not `0.0.0.0`.
- Reuse existing `1Panel/OpenResty` on `80/443`; do not add another host-level HTTPS listener.
- Do not expose `631` or the app port publicly.
- For Brother-style network printers, prefer `IPP Everywhere` over generic PostScript or generic PCL.
- Treat LibreOffice fidelity issues as a font-compatibility problem first, not a command-line flag problem.
- For high-fidelity Word/WPS files that still drift after font fixes, recommend exporting PDF from the original editor and printing the PDF.
