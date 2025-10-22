# Security Policy

**Application:** OWASP ASVS MCP Server
**Version:** 0.4.0
**Security Tier:** Configurable (CONSERVATIVE, BALANCED, GENEROUS)
**Last Updated:** 2025-10-23

---

## Security Model

This MCP server is designed for **trusted local environments** where the MCP client (e.g., Claude Desktop/Code) has already authenticated the user. The server provides read-only access to OWASP ASVS security requirements data.

### Trust Boundaries

```
┌─────────────────────────────────────────────┐
│  Operating System / User Session (Trusted)  │
│  ┌───────────────────────────────────────┐  │
│  │  MCP Client (e.g., Claude Code)       │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │  ASVS MCP Server (stdio)        │  │  │
│  │  │  • No authentication            │  │  │
│  │  │  • Plaintext stdio transport    │  │  │
│  │  │  • OS-level access control      │  │  │
│  │  └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
         │
         │ HTTPS (TLS 1.2+)
         ↓
┌─────────────────────────┐
│  OWASP GitHub (Remote)  │
│  • ASVS 5.0.0 JSON      │
│  • Optional: integrity  │
│    verification         │
└─────────────────────────┘
```

### Security Assumptions

✅ **What the server assumes:**
- Server runs in a trusted user session
- OS provides process isolation and access control
- MCP client has authenticated the user
- File system permissions protect configuration
- Local environment is not compromised

❌ **What the server does NOT provide:**
- User authentication or authorization
- Encrypted stdio communication
- Network-level access control
- Multi-tenancy or user isolation
- Protection against local privilege escalation

---

## Transport Security

### Stdio Transport (Default)

The server uses **stdio (standard input/output)** for MCP communication:

**Security Characteristics:**
- ✅ Fast and simple for local communication
- ✅ OS-level process isolation
- ❌ No encryption (plaintext)
- ❌ Not suitable for network deployment

**Recommended for:**
- Local MCP client connections (Claude Desktop/Code)
- Single-user workstations
- Trusted development environments

**NOT recommended for:**
- Remote access over network
- Multi-user servers
- Untrusted environments

### For Remote Deployment

If you need remote access, use one of these approaches:

#### Option 1: SSH Tunneling (Recommended)
```bash
# On remote server
node dist/index.js

# On local machine
ssh -L 8080:localhost:8080 user@remote-server

# Connect to localhost:8080
```

#### Option 2: TLS Reverse Proxy
```nginx
# nginx configuration
upstream asvs_server {
    server localhost:8080;
}

server {
    listen 443 ssl http2;
    server_name asvs.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://asvs_server;
    }
}
```

#### Option 3: VPN/WireGuard
```bash
# Deploy server on VPN-protected network
# Access only via VPN tunnel
```

---

## Data Integrity

### Remote Data Fetching

When the local ASVS data file is not found, the server fetches from GitHub:

**URL:** `https://raw.githubusercontent.com/OWASP/ASVS/master/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.json`

**Security Measures:**
- ✅ HTTPS with TLS 1.2+ (via Node.js)
- ✅ Certificate validation (system CA certificates)
- ✅ Optional SHA-256 integrity verification
- ⚠️ No certificate pinning (future enhancement)

### Integrity Verification (Optional)

Enable hash verification to detect tampering:

```bash
# 1. Calculate hash of official ASVS data
curl -s https://raw.githubusercontent.com/OWASP/ASVS/master/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.json | sha256sum

# 2. Set environment variable
export ASVS_DATA_HASH="your_calculated_hash_here"

# 3. Start server (will verify on remote fetch)
node dist/index.js
```

**What happens:**
- ✅ Hash mismatch → Server refuses to start
- ✅ Hash match → Server starts normally
- ⚠️ No hash set → Warning logged, verification skipped

**Recommended:**
- **Production:** ALWAYS set ASVS_DATA_HASH
- **Development:** Optional (speeds up testing)
- **CI/CD:** Required for security scanning

---

## Access Control

### OS-Level Security

The server relies on operating system access controls:

**File Permissions (Recommended):**
```bash
# Server executable
chmod 755 dist/index.js

# Configuration files (if used)
chmod 600 .env

# Log files
chmod 600 asvs-server.log

# Data files (read-only)
chmod 444 data/asvs-5.0.0.json
```

**User Isolation:**
```bash
# Run as dedicated user (Linux/macOS)
sudo useradd -r -s /bin/false asvs-server
sudo -u asvs-server node dist/index.js

# Run as non-admin user (Windows)
runas /user:asvs-server "node dist\index.js"
```

### Process Isolation

**Recommended:**
- Use containers (Docker) for additional isolation
- Run in restricted user context
- Use AppArmor/SELinux profiles (Linux)
- Use sandboxing (macOS/Windows)

**Example Docker:**
```dockerfile
FROM node:20-alpine
RUN adduser -D asvs-server
USER asvs-server
WORKDIR /app
COPY --chown=asvs-server:asvs-server . .
RUN npm ci --only=production
CMD ["node", "dist/index.js"]
```

---

## Configuration Security

### Environment Variables

All configuration uses environment variables (not command-line args):

```bash
# Security Tier (CONSERVATIVE, BALANCED, GENEROUS)
export ASVS_SECURITY_TIER=BALANCED

# Logging
export LOG_LEVEL=info                    # error|warn|info|debug
export LOG_FILE=/var/log/asvs-server.log

# Data Integrity
export ASVS_DATA_HASH=sha256-...         # SHA-256 hash for verification

# Optional Features
export ASVS_USE_OPENCRE=false            # Enable OpenCRE integration
```

### Security Tiers

Choose appropriate tier based on trust level:

| Tier | File Size | Query Length | Use Case | Security Level |
|------|-----------|--------------|----------|----------------|
| **CONSERVATIVE** | 10 MB | 1000 chars | Public APIs, untrusted input | Excellent |
| **BALANCED** | 25 MB | 2000 chars | Internal tools, trusted users | Excellent |
| **GENEROUS** | 50 MB | 5000 chars | Development, trusted local use | Good |

**Recommendation:**
- Production: `BALANCED` or `CONSERVATIVE`
- Development: `GENEROUS` (current default)
- Public-facing: `CONSERVATIVE`

---

## Logging and Monitoring

### Security Event Logging

The server logs security-relevant events:

**Logged Events:**
- ✅ Server startup/shutdown
- ✅ Configuration loaded (security tier, etc.)
- ✅ Data source (local file vs. remote fetch)
- ✅ Data integrity verification (success/failure)
- ✅ All tool invocations with arguments
- ✅ Input validation failures
- ✅ Error conditions with sanitized details

**Log Format:**
```json
{
  "level": "info",
  "message": "Tool invocation",
  "timestamp": "2025-10-23T12:00:00.000Z",
  "tool": "get_requirements_by_category",
  "arguments": {"category": "Authentication"}
}
```

### Log File Security

**Location:** `LOG_FILE` environment variable (default: `./asvs-server.log`)

**Security Considerations:**
- ✅ JSON format (structured, parseable)
- ✅ Log rotation (10MB max, 5 files)
- ✅ Log injection prevention (control chars stripped)
- ⚠️ Contains operational data (protect with file permissions)

**Recommended Setup:**
```bash
# Set secure permissions
chmod 600 asvs-server.log

# Monitor logs for security events
tail -f asvs-server.log | grep -i "error\|fail\|integrity"

# Rotate logs (logrotate example)
cat > /etc/logrotate.d/asvs-server << EOF
/var/log/asvs-server.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0600 asvs-server asvs-server
}
EOF
```

### Monitoring Recommendations

**Alert on these events:**
- ❌ Data integrity verification failures
- ❌ Repeated input validation errors (potential attack)
- ❌ Server crashes or restarts
- ❌ Unexpected file access errors
- ⚠️ Use of remote data fetch (vs. local file)

---

## Deployment Checklist

### Pre-Deployment

- [ ] Choose appropriate security tier (`BALANCED` recommended for production)
- [ ] Calculate and set `ASVS_DATA_HASH` for integrity verification
- [ ] Configure log file location with proper permissions
- [ ] Set `LOG_LEVEL=warn` or `LOG_LEVEL=error` for production
- [ ] Review and minimize environment variables exposure

### Deployment

- [ ] Run server with least-privilege user account
- [ ] Set restrictive file permissions (600 for config, 400 for secrets)
- [ ] Enable structured logging with log rotation
- [ ] Configure log monitoring and alerting
- [ ] Use local ASVS file (faster, more secure than remote fetch)
- [ ] Implement OS-level process isolation (containers, VMs)

### Post-Deployment

- [ ] Monitor logs for security events
- [ ] Regularly update ASVS data and verify hash
- [ ] Review access logs periodically
- [ ] Test integrity verification (intentionally set wrong hash)
- [ ] Document incident response procedures

### For Remote Deployment (Additional)

- [ ] Use SSH tunneling, TLS proxy, or VPN
- [ ] Implement network-level access controls (firewall)
- [ ] Enable TLS 1.3 for remote connections
- [ ] Consider mutual TLS (mTLS) for service authentication
- [ ] Implement rate limiting at proxy/firewall level

---

## Vulnerability Reporting

### Reporting Security Issues

**DO NOT** open public GitHub issues for security vulnerabilities.

**Instead:**
1. Email: [Add your security contact]
2. Encrypted: [Add PGP key if available]
3. Response time: Within 48 hours

**What to include:**
- Description of the vulnerability
- Steps to reproduce
- Impact assessment
- Proposed fix (if any)

### Security Update Policy

- **Critical vulnerabilities:** Patch within 24 hours
- **High severity:** Patch within 7 days
- **Medium severity:** Patch within 30 days
- **Low severity:** Patch in next release

### Known Limitations

The following are **by design** and not vulnerabilities:

1. **No authentication** - Relies on OS-level access control
2. **Plaintext stdio** - Use SSH/TLS for remote access
3. **No session management** - Server is stateless
4. **No rate limiting** - Implement at OS/proxy level
5. **Public data only** - ASVS data is not sensitive

---

## Security Best Practices

### For Users

✅ **DO:**
- Run in trusted local environment
- Use BALANCED or CONSERVATIVE tier for production
- Enable data integrity verification (ASVS_DATA_HASH)
- Monitor logs for suspicious activity
- Keep Node.js and dependencies updated
- Use local ASVS file (faster, more secure)

❌ **DON'T:**
- Expose server directly to untrusted networks
- Run as root/administrator
- Disable logging in production
- Use GENEROUS tier for public-facing deployments
- Trust remote data without integrity verification

### For Developers

✅ **DO:**
- Review security audit report (SECURITY_AUDIT_REPORT.md)
- Follow secure coding guidelines
- Use TypeScript strict mode
- Validate all inputs (already implemented)
- Log security-relevant events
- Write security tests

❌ **DON'T:**
- Add custom crypto (use Node.js built-in)
- Bypass input validation
- Expose internal errors to users
- Add authentication without expert review
- Ignore dependency vulnerabilities

---

## Compliance Information

### ASVS Level 1 Compliance

**Current Status:** ~78% compliant (after Phase 1)

**Key Gaps:**
- V12: Secure Communication (stdio is plaintext by design)
- V11: Cryptography (uses system crypto, needs explicit config)
- V16: Logging (improved in Phase 1, further enhancements planned)

**See:** `SECURITY_AUDIT_REPORT.md` for full details

### Regulatory Frameworks

This server includes mappings for:
- ✅ **HIPAA** (validated mappings)
- ⚠️ **PCI DSS, GDPR, SOX, ISO 27001** (illustrative examples)

**Note:** Consult qualified compliance professionals for regulatory requirements.

---

## Dependencies Security

### Dependency Management

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Check outdated packages
npm outdated

# Update dependencies
npm update
```

### Current Dependencies

- `@modelcontextprotocol/sdk` ^0.5.0 - MCP protocol implementation
- `node-fetch` ^3.3.2 - HTTP client for remote fetching
- `winston` ^3.11.0 - Structured logging

**Security Note:** All dependencies are actively maintained and have no known critical vulnerabilities (as of 2025-10-23).

---

## Incident Response

### In Case of Security Incident

1. **Isolate:** Stop the server immediately
2. **Assess:** Check logs for IOCs (indicators of compromise)
3. **Contain:** Revoke access, change credentials if applicable
4. **Investigate:** Analyze logs, file integrity, network connections
5. **Remediate:** Apply patches, restore from backup
6. **Report:** Notify users, document lessons learned

### Log Analysis Commands

```bash
# Check for integrity failures
grep -i "integrity" asvs-server.log

# Find errors
grep '"level":"error"' asvs-server.log

# Tool invocation audit trail
grep "Tool invocation" asvs-server.log

# Find suspicious patterns
grep -E "(fail|error|invalid|denied)" asvs-server.log
```

---

## Additional Resources

- **Security Audit Report:** `SECURITY_AUDIT_REPORT.md`
- **OWASP ASVS Project:** https://owasp.org/www-project-application-security-verification-standard/
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **Node.js Security Best Practices:** https://nodejs.org/en/docs/guides/security/

---

**Document Version:** 1.0
**Last Reviewed:** 2025-10-23
**Next Review:** 2026-01-23 (or upon major release)
