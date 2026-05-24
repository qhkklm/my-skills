# cups-web macOS Runbook

## Deployment

### 1. Prepare runtime directories

```bash
mkdir -p /Users/hxyou/cups-web/.deploy/bin
mkdir -p /Users/hxyou/cups-web/.deploy/data
mkdir -p /Users/hxyou/cups-web/.deploy/uploads
mkdir -p /Users/hxyou/cups-web/.deploy/logs
mkdir -p /Users/hxyou/cups-web/.deploy/libreoffice-profile
```

### 2. Download the app binary

Use the macOS release binary that matches the host architecture and place it at:

- `/Users/hxyou/cups-web/.deploy/bin/cups-web`

Make it executable:

```bash
chmod +x /Users/hxyou/cups-web/.deploy/bin/cups-web
```

### 3. Use these runtime settings

- `CUPS_HOST=localhost:631`
- `LISTEN_ADDR=127.0.0.1:18780`
- `DB_PATH=/Users/hxyou/cups-web/.deploy/data/cups-web.db`
- `UPLOAD_DIR=/Users/hxyou/cups-web/.deploy/uploads`
- `HOME=/Users/hxyou/cups-web/.deploy`
- `LIBREOFFICE_USER_PROFILE=/Users/hxyou/cups-web/.deploy/libreoffice-profile`
- `PATH=/Users/hxyou/cups-web/.deploy/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`

### 4. LaunchAgent template

Use:

- `/Users/hxyou/Library/LaunchAgents/com.hxyou.cups-web.plist`

Key requirements:

- `RunAtLoad=true`
- `KeepAlive=true`
- `ProgramArguments[0]=/Users/hxyou/cups-web/.deploy/bin/cups-web`
- stdout/stderr log files under `/Users/hxyou/cups-web/.deploy/logs`

Load or restart:

```bash
launchctl bootstrap gui/$(id -u) /Users/hxyou/Library/LaunchAgents/com.hxyou.cups-web.plist
launchctl kickstart -k gui/$(id -u)/com.hxyou.cups-web
```

## Reverse Proxy and TLS

### 1. Use the existing 1Panel/OpenResty stack

Do not start a separate Caddy or Nginx on `80/443`.

Expected upstream:

- `http://127.0.0.1:18780`

Expected public host:

- `print.932101613.xyz`

### 2. DNS

Create or verify:

- `A print 121.29.159.151`

### 3. 1Panel/OpenResty expectations

- Website exists for `print.932101613.xyz`
- Reverse proxy target is `http://127.0.0.1:18780`
- Subdomain certificate covers `print.932101613.xyz`
- HTTP redirects to HTTPS

### 4. Validate reverse proxy

Local upstream:

```bash
curl http://127.0.0.1:18780/api/version
```

Public site:

```bash
curl -I https://print.932101613.xyz
```

Certificate:

```bash
openssl s_client -connect 121.29.159.151:443 -servername print.932101613.xyz -brief </dev/null
```

## CUPS and Printer Queue

### 1. Enable CUPS web interface

`cups-web` relies on CUPS printer pages being available.

```bash
cupsctl WebInterface=yes
curl http://localhost:631/printers/
```

### 2. Printer discovery rule

If the web UI does not show printers, check CUPS first. If CUPS has no queue, `cups-web` cannot print.

### 3. Preferred queue type

For the Brother network printer used here, do not use:

- `Generic PostScript Printer`
- `Generic PCL Printer`

Use `IPP Everywhere`.

### 4. Create the queue

```bash
lpadmin -p brother_t425w -E -v ipp://192.168.1.38/ipp/print -m everywhere
lpoptions -p brother_t425w -o media=A4
lpadmin -p brother_t425w -D "Brother DCP-T425W" -L "192.168.1.38" -o printer-is-shared=true
```

### 5. Validate the queue

```bash
lpstat -v brother_t425w
lpstat -p brother_t425w -l
```

### 6. Test-print outside the web app first

```bash
printf 'cups-web test\n' > /private/tmp/cups-web-test.txt
lp -d brother_t425w /private/tmp/cups-web-test.txt
lpstat -W not-completed -o brother_t425w
lpstat -W completed -o brother_t425w
```

If jobs complete immediately with no output, the queue type is probably wrong.

## LibreOffice Fidelity

### 1. Base requirement

`Word -> PDF` uses headless LibreOffice. If conversion fails entirely, verify:

```bash
/Users/hxyou/cups-web/.deploy/bin/libreoffice --headless --version
```

### 2. Install compatibility fonts

These fonts reduce spacing and pagination drift:

```bash
brew install --cask font-carlito font-caladea
brew install --cask font-noto-sans-cjk-sc font-noto-serif-cjk-sc
brew install --cask font-zhuque-fangsong
```

Why:

- `Carlito` is metrically compatible with `Calibri`
- `Caladea` is metrically compatible with `Cambria`
- `Noto Sans/Serif CJK SC` improves Chinese fallback coverage
- `Zhuque Fangsong` improves `仿宋`-style fallback coverage

### 3. Validate that compatibility fonts are used

Convert a sample file:

```bash
/Users/hxyou/cups-web/.deploy/bin/libreoffice --headless --convert-to pdf --outdir /private/tmp /path/to/sample.docx
```

Check embedded fonts:

```bash
strings /private/tmp/sample.pdf | rg 'Carlito|Caladea|Noto|Zhuque|PingFang|Songti|Heiti'
```

If `Carlito` and `Caladea` appear for Office-like files, the spacing fix is active.

### 4. Limits

If layout still drifts after compatibility fonts are installed:

- inspect the original document's actual fonts
- add the missing fonts instead of tweaking random LibreOffice flags
- for documents requiring near-perfect fidelity, export PDF from Word/WPS first

## Validation Checklist

### Service

```bash
launchctl print gui/$(id -u)/com.hxyou.cups-web | rg 'state =|program =|path ='
lsof -nP -iTCP:18780 -sTCP:LISTEN
curl http://127.0.0.1:18780/api/version
```

### CUPS

```bash
curl http://localhost:631/printers/
lpstat -p -d
```

### HTTPS

```bash
curl -I https://print.932101613.xyz
```

### End-to-end

1. Open `https://print.932101613.xyz`
2. Log in with the current admin credentials
3. Choose `brother_t425w`
4. Upload a small PDF or text file
5. Verify CUPS queue state and physical printer output

## Failure Patterns

### Web UI opens but printer list is empty

- CUPS web interface disabled
- no printer configured in CUPS

### Print says success but nothing comes out

- wrong queue type
- generic PostScript/PCL selected instead of `IPP Everywhere`

### Subdomain loads with certificate error

- wrong certificate bound in 1Panel
- certificate only covers `932101613.xyz`, not `print.932101613.xyz`

### Word converts but spacing is off

- missing metric-compatible Office fonts
- missing Chinese fonts used by the original document
