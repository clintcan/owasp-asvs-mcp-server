# OWASP ASVS MCP Server Setup Guide

This guide explains how to configure and run the OWASP ASVS MCP Server with environment variables for different environments.

---

## Quick Start

### 1. Build the Server

```bash
cd owasp-asvs-mcp-server
npm install
npm run build
```

### 2. Choose Your Setup Method

- **Method A**: Claude Desktop (GUI configuration)
- **Method B**: Claude Code (project-level `.mcp.json`)
- **Method C**: CLI with environment variables
- **Method D**: Using npm scripts with `.env` file

---

## Method A: Claude Desktop Configuration

**Best for:** Desktop users who want GUI-based configuration

### Step 1: Locate Configuration File

**macOS:**
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```bash
%APPDATA%\Claude\claude_desktop_config.json
```

### Step 2: Edit Configuration

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "owasp-asvs": {
      "command": "node",
      "args": ["/path_to_your_mcp_server/owasp-asvs-mcp-server/dist/index.js"],
      "env": {
        "ASVS_SECURITY_TIER": "BALANCED",
        "ASVS_RATE_LIMIT": "true",
        "ASVS_RATE_LIMIT_REQUESTS": "100",
        "ASVS_RATE_LIMIT_WINDOW_MS": "60000",
        "LOG_LEVEL": "warn",
        "LOG_FILE": "/absolute_path_to_your_log/asvs-server.log"
      }
    }
  }
}
```

**Important:** Update the paths to match your actual installation directory.

### Step 3: Restart Claude Desktop

Close and reopen Claude Desktop to load the new configuration.

### Step 4: Verify

In Claude Desktop, you should now be able to use ASVS tools. Test with:
```
Show me all ASVS Level 1 authentication requirements
```

---

## Method B: Claude Code (Project-Level)

**Best for:** Project-specific configuration, version controlled

### Step 1: Copy Example Configuration

```bash
cd owasp-asvs-mcp-server
cp .mcp.json.example .mcp.json
```

### Step 2: Edit `.mcp.json`

The `.mcp.json` file should look like this:

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
        "ASVS_RATE_LIMIT_WINDOW_MS": "60000",
        "LOG_LEVEL": "warn",
        "LOG_FILE": "./asvs-server.log"
      }
    }
  }
}
```

### Step 3: Add to `.gitignore` (Optional)

If you don't want to commit your specific configuration:

```bash
echo ".mcp.json" >> .gitignore
```

### Step 4: Restart Claude Code

Use `/mcp` command to verify the server is loaded.

---

## Method C: CLI with Environment Variables

**Best for:** Testing, development, manual execution

### Option 1: Inline Environment Variables

**macOS/Linux:**
```bash
ASVS_SECURITY_TIER=BALANCED \
ASVS_RATE_LIMIT=true \
ASVS_RATE_LIMIT_REQUESTS=100 \
LOG_LEVEL=debug \
node dist/index.js
```

**Windows PowerShell:**
```powershell
$env:ASVS_SECURITY_TIER="BALANCED"
$env:ASVS_RATE_LIMIT="true"
$env:ASVS_RATE_LIMIT_REQUESTS="100"
$env:LOG_LEVEL="debug"
node dist/index.js
```

**Windows CMD:**
```cmd
set ASVS_SECURITY_TIER=BALANCED
set ASVS_RATE_LIMIT=true
set ASVS_RATE_LIMIT_REQUESTS=100
set LOG_LEVEL=debug
node dist\index.js
```

### Option 2: Export Variables (Session-Wide)

**macOS/Linux:**
```bash
export ASVS_SECURITY_TIER=BALANCED
export ASVS_RATE_LIMIT=true
export ASVS_RATE_LIMIT_REQUESTS=100
export LOG_LEVEL=debug
node dist/index.js
```

**Windows PowerShell:**
```powershell
$env:ASVS_SECURITY_TIER="BALANCED"
$env:ASVS_RATE_LIMIT="true"
node dist/index.js
```

---

## Method D: Using .env File with npm Scripts

**Best for:** Development workflow, easy configuration switching

### Step 1: Install dotenv

```bash
npm install --save-dev dotenv dotenv-cli
```

### Step 2: Create .env File

```bash
cp .env.example .env
```

Edit `.env`:

```bash
ASVS_SECURITY_TIER=BALANCED
ASVS_RATE_LIMIT=true
ASVS_RATE_LIMIT_REQUESTS=100
ASVS_RATE_LIMIT_WINDOW_MS=60000
LOG_LEVEL=debug
LOG_FILE=./asvs-server.log
```

### Step 3: Update package.json

Add this script to `package.json`:

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "npm run build && node dist/index.js",
    "dev:env": "npm run build && dotenv -e .env -- node dist/index.js",
    "start:prod": "dotenv -e .env.production -- node dist/index.js",
    "start:dev": "dotenv -e .env.development -- node dist/index.js"
  }
}
```

### Step 4: Run with Environment

```bash
npm run dev:env
```

### Step 5: Create Environment-Specific Files

**.env.development:**
```bash
ASVS_SECURITY_TIER=GENEROUS
ASVS_RATE_LIMIT=false
LOG_LEVEL=debug
LOG_FILE=./dev-server.log
```

**.env.production:**
```bash
ASVS_SECURITY_TIER=BALANCED
ASVS_RATE_LIMIT=true
ASVS_RATE_LIMIT_REQUESTS=100
LOG_LEVEL=warn
LOG_FILE=/var/log/asvs-server.log
ASVS_DATA_HASH="your_calculated_sha256_hash"
```

---

## Environment Variables Reference

### Security Tier

```bash
ASVS_SECURITY_TIER=BALANCED
```

**Options:**
- `CONSERVATIVE` - Maximum security, minimal limits (10MB, 1000 chars, 5K cache)
- `BALANCED` - **Recommended** for production (25MB, 2000 chars, 10K cache)
- `GENEROUS` - Development/testing (50MB, 5000 chars, 20K cache)

### Rate Limiting

```bash
ASVS_RATE_LIMIT=true                    # Enable/disable rate limiting
ASVS_RATE_LIMIT_REQUESTS=100            # Max requests per window
ASVS_RATE_LIMIT_WINDOW_MS=60000         # Window size (ms)
```

**Recommended Settings:**
- **Public API:** 20 requests/minute
- **Production Internal:** 100 requests/minute
- **Development:** Disable or 1000 requests/minute

### Logging

```bash
LOG_LEVEL=warn                          # error|warn|info|debug
LOG_FILE=./asvs-server.log              # File path
```

**Recommended Settings:**
- **Production:** `warn` or `error`
- **Staging:** `info`
- **Development:** `debug`

### Data Integrity

```bash
ASVS_DATA_HASH="sha256_hash_here"
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

**Recommended:**
- **Production:** Always set
- **Development:** Optional (faster startup)

### Optional Features

```bash
ASVS_USE_OPENCRE=false                  # Enable OpenCRE integration
```

---

## Configuration Examples

### Example 1: Production Configuration

```json
{
  "mcpServers": {
    "owasp-asvs": {
      "command": "node",
      "args": ["/opt/owasp-asvs-mcp-server/dist/index.js"],
      "env": {
        "ASVS_SECURITY_TIER": "BALANCED",
        "ASVS_RATE_LIMIT": "true",
        "ASVS_RATE_LIMIT_REQUESTS": "100",
        "ASVS_RATE_LIMIT_WINDOW_MS": "60000",
        "LOG_LEVEL": "warn",
        "LOG_FILE": "/var/log/asvs-server.log",
        "ASVS_DATA_HASH": "abc123def456..."
      }
    }
  }
}
```

### Example 2: Development Configuration

```json
{
  "mcpServers": {
    "owasp-asvs": {
      "command": "node",
      "args": ["D:/Projects/misc/AI/owasp-asvs-mcp-server/dist/index.js"],
      "env": {
        "ASVS_SECURITY_TIER": "GENEROUS",
        "ASVS_RATE_LIMIT": "false",
        "LOG_LEVEL": "debug",
        "LOG_FILE": "./asvs-dev.log"
      }
    }
  }
}
```

### Example 3: Public API Configuration

```json
{
  "mcpServers": {
    "owasp-asvs": {
      "command": "node",
      "args": ["/opt/owasp-asvs-mcp-server/dist/index.js"],
      "env": {
        "ASVS_SECURITY_TIER": "CONSERVATIVE",
        "ASVS_RATE_LIMIT": "true",
        "ASVS_RATE_LIMIT_REQUESTS": "20",
        "ASVS_RATE_LIMIT_WINDOW_MS": "60000",
        "LOG_LEVEL": "info",
        "LOG_FILE": "/var/log/asvs-public.log",
        "ASVS_DATA_HASH": "abc123def456..."
      }
    }
  }
}
```

---

## Verification

### Check Server is Running

In your log file, you should see:

```json
{
  "level": "info",
  "message": "ASVS MCP Server initialized",
  "securityTier": "BALANCED",
  "rateLimitEnabled": true,
  "config": {
    "maxFileSize": "25MB",
    "maxQueryLength": 2000,
    "maxSearchResults": 250,
    "rateLimit": "100 requests per 60s"
  }
}
```

### Check Rate Limiting

Send multiple rapid requests and check logs for:

```json
{
  "level": "warn",
  "message": "Rate limit exceeded",
  "tool": "get_requirements_by_level",
  "currentRequests": 101,
  "limit": 100
}
```

### Check Request ID Tracking

Every request should have a unique `requestId`:

```json
{
  "level": "info",
  "message": "Tool invocation",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "tool": "get_requirements_by_level"
}
```

---

## Troubleshooting

### Issue: Server not starting

**Check:**
1. Is the build directory present? `ls dist/index.js`
2. Are dependencies installed? `npm install`
3. Check log file for errors: `cat asvs-server.log`

### Issue: Environment variables not working

**Check:**
1. Correct format in JSON (strings, not bare values)
2. Paths are absolute or correct relative paths
3. Restart Claude Desktop/Code after config changes

### Issue: Rate limiting too strict

**Adjust:**
```json
"env": {
  "ASVS_RATE_LIMIT_REQUESTS": "500",
  "ASVS_RATE_LIMIT_WINDOW_MS": "60000"
}
```

### Issue: Too many logs

**Reduce verbosity:**
```json
"env": {
  "LOG_LEVEL": "error"
}
```

---

## Security Best Practices

1. **Always use `BALANCED` or `CONSERVATIVE` tier in production**
2. **Enable rate limiting for any network-accessible deployment**
3. **Set `ASVS_DATA_HASH` to verify data integrity**
4. **Use `LOG_LEVEL=warn` or `error` in production** (avoid debug)
5. **Restrict log file permissions:** `chmod 600 asvs-server.log`
6. **Rotate logs regularly** to prevent disk exhaustion
7. **Monitor rate limit violations** for potential attacks

---

## Additional Resources

- **Phase 1 Documentation:** `PHASE1_IMPLEMENTATION.md` (Logging, Integrity)
- **Phase 2 Documentation:** `PHASE2_IMPLEMENTATION.md` (Security Tiers, TLS)
- **Phase 3 Documentation:** `PHASE3_IMPLEMENTATION.md` (Rate Limiting, Request IDs)
- **Security Policy:** `SECURITY.md`
- **Main README:** `README.md`

---

## Support

If you encounter issues:

1. Check the log file for error messages
2. Verify environment variables are correctly formatted
3. Test with minimal configuration first
4. See `SECURITY.md` for security-specific questions

---

**Quick Reference:**

```bash
# Build
npm run build

# Run with inline env vars (Linux/macOS)
ASVS_SECURITY_TIER=BALANCED LOG_LEVEL=debug node dist/index.js

# Run with .env file
npm run dev:env

# Check logs
tail -f asvs-server.log
```
