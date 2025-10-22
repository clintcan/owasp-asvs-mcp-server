# Environment Variables Reference

Complete reference for all environment variables supported by the OWASP ASVS MCP Server.

---

## Security Configuration

### ASVS_SECURITY_TIER

**Description:** Sets the security tier which controls all security limits (file size, query length, cache size, etc.)

**Type:** String
**Default:** `BALANCED`
**Options:**
- `CONSERVATIVE` - Maximum security, minimal limits
- `BALANCED` - Recommended for production
- `GENEROUS` - Permissive for development

**Example:**
```bash
export ASVS_SECURITY_TIER=BALANCED
```

**Security Tier Details:**

| Limit | CONSERVATIVE | BALANCED | GENEROUS |
|-------|--------------|----------|----------|
| Max File Size | 10 MB | 25 MB | 50 MB |
| Max Query Length | 1,000 chars | 2,000 chars | 5,000 chars |
| Max Category Name | 200 chars | 500 chars | 1,000 chars |
| Max ID Length | 50 chars | 100 chars | 200 chars |
| Max Search Results | 100 | 250 | 500 |
| Max Cache Entries | 5,000 | 10,000 | 20,000 |

---

## Rate Limiting

### ASVS_RATE_LIMIT

**Description:** Enable or disable rate limiting

**Type:** Boolean (string)
**Default:** `true`
**Options:** `true`, `false`

**Example:**
```bash
export ASVS_RATE_LIMIT=true
```

### ASVS_RATE_LIMIT_REQUESTS

**Description:** Maximum number of requests allowed per time window

**Type:** Integer (string)
**Default:** `100`
**Range:** 1-10000

**Example:**
```bash
export ASVS_RATE_LIMIT_REQUESTS=100
```

**Recommended Values:**
- **Public API:** 20
- **Production Internal:** 100
- **Development:** 1000 or disable

### ASVS_RATE_LIMIT_WINDOW_MS

**Description:** Time window for rate limiting in milliseconds

**Type:** Integer (string)
**Default:** `60000` (1 minute)
**Range:** 1000-3600000 (1 second to 1 hour)

**Example:**
```bash
export ASVS_RATE_LIMIT_WINDOW_MS=60000
```

**Common Values:**
- 10 seconds: `10000`
- 30 seconds: `30000`
- 1 minute: `60000`
- 5 minutes: `300000`

---

## Logging Configuration

### LOG_LEVEL

**Description:** Logging verbosity level

**Type:** String
**Default:** `info`
**Options:** `error`, `warn`, `info`, `debug`

**Example:**
```bash
export LOG_LEVEL=warn
```

**Recommendations:**
- **Production:** `warn` or `error`
- **Staging:** `info`
- **Development:** `debug`

### LOG_FILE

**Description:** Path to the log file

**Type:** String (file path)
**Default:** `./asvs-server.log`

**Example:**
```bash
export LOG_FILE=/var/log/asvs-server.log
```

**Recommendations:**
- Use absolute paths in production
- Ensure directory exists and is writable
- Set appropriate file permissions (600)
- Enable log rotation

---

## Data Integrity

### ASVS_DATA_HASH

**Description:** SHA-256 hash of ASVS data file for integrity verification

**Type:** String (hex)
**Default:** Empty (verification disabled)
**Format:** 64-character hexadecimal string

**Example:**
```bash
export ASVS_DATA_HASH="a1b2c3d4e5f6..."
```

**How to Calculate:**

**macOS/Linux:**
```bash
sha256sum data/asvs-5.0.0.json
```

**Windows PowerShell:**
```powershell
Get-FileHash data\asvs-5.0.0.json -Algorithm SHA256
```

**When to Use:**
- ✅ **Always** in production environments
- ✅ When fetching data remotely
- ⚠️ Optional in development (faster startup)

---

## Optional Features

### ASVS_USE_OPENCRE

**Description:** Enable OpenCRE integration for ISO 27001 mappings (experimental)

**Type:** Boolean (string)
**Default:** `false`
**Options:** `true`, `false`

**Example:**
```bash
export ASVS_USE_OPENCRE=false
```

**Note:** This feature is experimental and may require additional network access.

---

## Configuration Examples

### Minimal Configuration (Defaults)

```bash
# No environment variables needed - uses all defaults:
# - ASVS_SECURITY_TIER=BALANCED
# - ASVS_RATE_LIMIT=true
# - ASVS_RATE_LIMIT_REQUESTS=100
# - LOG_LEVEL=info
# - LOG_FILE=./asvs-server.log
node dist/index.js
```

### Production Configuration

```bash
export ASVS_SECURITY_TIER=BALANCED
export ASVS_RATE_LIMIT=true
export ASVS_RATE_LIMIT_REQUESTS=100
export ASVS_RATE_LIMIT_WINDOW_MS=60000
export LOG_LEVEL=warn
export LOG_FILE=/var/log/asvs-server.log
export ASVS_DATA_HASH="a1b2c3d4e5f6..."
node dist/index.js
```

### Development Configuration

```bash
export ASVS_SECURITY_TIER=GENEROUS
export ASVS_RATE_LIMIT=false
export LOG_LEVEL=debug
export LOG_FILE=./dev-server.log
node dist/index.js
```

### Public API Configuration

```bash
export ASVS_SECURITY_TIER=CONSERVATIVE
export ASVS_RATE_LIMIT=true
export ASVS_RATE_LIMIT_REQUESTS=20
export ASVS_RATE_LIMIT_WINDOW_MS=60000
export LOG_LEVEL=info
export LOG_FILE=/var/log/asvs-public.log
export ASVS_DATA_HASH="a1b2c3d4e5f6..."
node dist/index.js
```

---

## MCP Client Configuration

### Claude Desktop (macOS)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "owasp-asvs": {
      "command": "node",
      "args": ["/absolute/path/to/owasp-asvs-mcp-server/dist/index.js"],
      "env": {
        "ASVS_SECURITY_TIER": "BALANCED",
        "ASVS_RATE_LIMIT": "true",
        "ASVS_RATE_LIMIT_REQUESTS": "100",
        "ASVS_RATE_LIMIT_WINDOW_MS": "60000",
        "LOG_LEVEL": "warn",
        "LOG_FILE": "/absolute/path/to/asvs-server.log",
        "ASVS_DATA_HASH": ""
      }
    }
  }
}
```

### Claude Desktop (Windows)

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "owasp-asvs": {
      "command": "node",
      "args": ["D:/Projects/misc/AI/owasp-asvs-mcp-server/dist/index.js"],
      "env": {
        "ASVS_SECURITY_TIER": "BALANCED",
        "ASVS_RATE_LIMIT": "true",
        "ASVS_RATE_LIMIT_REQUESTS": "100",
        "ASVS_RATE_LIMIT_WINDOW_MS": "60000",
        "LOG_LEVEL": "warn",
        "LOG_FILE": "D:/Projects/misc/AI/owasp-asvs-mcp-server/asvs-server.log"
      }
    }
  }
}
```

### Claude Code (.mcp.json)

Create `.mcp.json` in project root:

```json
{
  "mcpServers": {
    "owasp-asvs": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "ASVS_SECURITY_TIER": "BALANCED",
        "ASVS_RATE_LIMIT": "true",
        "ASVS_RATE_LIMIT_REQUESTS": "100",
        "LOG_LEVEL": "warn",
        "LOG_FILE": "./asvs-server.log"
      }
    }
  }
}
```

---

## Verification

### Check Configuration on Startup

Look for this log entry when the server starts:

```json
{
  "level": "info",
  "message": "ASVS MCP Server initialized",
  "logLevel": "warn",
  "logFile": "./asvs-server.log",
  "securityTier": "BALANCED",
  "integrityCheckEnabled": true,
  "rateLimitEnabled": true,
  "config": {
    "maxFileSize": "25MB",
    "maxQueryLength": 2000,
    "maxSearchResults": 250,
    "rateLimit": "100 requests per 60s"
  }
}
```

### Verify Environment Variables

**Linux/macOS:**
```bash
env | grep ASVS
```

**Windows PowerShell:**
```powershell
Get-ChildItem Env: | Where-Object {$_.Name -like "ASVS*"}
```

---

## Troubleshooting

### Problem: Environment variables not working

**Solution:**
1. Check syntax in MCP config (must be strings in JSON)
2. Restart MCP client after configuration changes
3. Check log file for startup configuration
4. Verify paths are absolute or correct relative paths

### Problem: Rate limiting too aggressive

**Solution:**
```bash
export ASVS_RATE_LIMIT_REQUESTS=500
# OR disable:
export ASVS_RATE_LIMIT=false
```

### Problem: Logs too verbose

**Solution:**
```bash
export LOG_LEVEL=error  # Only critical errors
```

### Problem: Server not finding data file

**Solution:**
- Ensure `data/asvs-5.0.0.json` exists
- Check file permissions
- Server will fall back to remote fetch if local file missing

---

## Security Best Practices

1. **Never commit `.env` files with sensitive data to version control**
2. **Use `BALANCED` or `CONSERVATIVE` tier in production**
3. **Always enable rate limiting for network-accessible deployments**
4. **Set `ASVS_DATA_HASH` to prevent data tampering**
5. **Use restrictive log levels in production** (`warn` or `error`)
6. **Protect log files with appropriate permissions** (`chmod 600`)
7. **Rotate logs to prevent disk exhaustion**

---

## See Also

- **Setup Guide:** `SETUP_GUIDE.md` - Comprehensive setup instructions
- **Security Policy:** `SECURITY.md` - Security documentation
- **Phase Documentation:** `PHASE1_IMPLEMENTATION.md`, `PHASE2_IMPLEMENTATION.md`, `PHASE3_IMPLEMENTATION.md`
- **Main README:** `README.md`
