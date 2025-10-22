# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **production-ready** MCP (Model Context Protocol) server that provides AI assistants with access to OWASP ASVS (Application Security Verification Standard) data. The server exposes 9 tools for querying security requirements, generating recommendations, and mapping compliance frameworks.

**Current Version**: 0.5.0 (2025-10-23) - Production Security Release
**ASVS Version**: 5.0.0 (345 requirements, 17 chapters)
**Security Status**: ✅ 87% ASVS Level 1 Compliance - Production Ready
**HIPAA Mappings**: ✅ Validated - 76 HIPAA requirements, 102 mappings, 94.7% coverage
**Git Repository**: https://github.com/clintcan/owasp-asvs-mcp-server

**Production Security Features:**
- Winston structured logging with JSON format and rotation
- TLS 1.2+ with certificate validation
- SHA-256 data integrity verification
- Rate limiting (100 req/min default)
- Configurable security tiers (CONSERVATIVE/BALANCED/GENEROUS)
- Request ID tracking with UUID
- Comprehensive security documentation

## Installation from Repository

```bash
# Clone the repository
git clone https://github.com/clintcan/owasp-asvs-mcp-server.git
cd owasp-asvs-mcp-server

# Install dependencies
npm install

# Build the TypeScript code
npm run build
```

The compiled output will be in the `dist/` directory.

## Build Commands

```bash
# Build TypeScript to JavaScript
npm run build

# Watch mode for development
npm run watch

# Build and run the server
npm run dev

# Update ASVS data from OWASP repository (optional)
npm run update-asvs

# Run security tests
npm run test:phase1   # Logging and data integrity tests
npm run test:phase2   # Configuration and TLS tests
npm run test:phase3   # Rate limiting and request ID tests
npm run test:all      # Run all test suites
```

The compiled output goes to `dist/` directory. The main entry point is `dist/index.js`.

## Adding to Claude Code

To use this MCP server in Claude Code:

1. **Clone and build the server**:
   ```bash
   git clone https://github.com/clintcan/owasp-asvs-mcp-server.git
   cd owasp-asvs-mcp-server
   npm install
   npm run build
   ```

2. **Configure Claude Code MCP settings**:

   **Option 1 - Recommended (using CLI):**
   ```bash
   claude mcp add owasp-asvs node /absolute/path/to/owasp-asvs-mcp-server/dist/index.js
   ```

   **Option 2 - Manual configuration:**

   Edit the user-level configuration file at `~/.claude.json`:
   - **Windows**: `%USERPROFILE%\.claude.json`
   - **macOS/Linux**: `~/.claude.json`

   Find your project path in the `"projects"` object and add to `mcpServers`:
   ```json
   "projects": {
     "/path/to/your/project": {
       "mcpServers": {
         "owasp-asvs": {
           "command": "node",
           "args": ["/absolute/path/to/owasp-asvs-mcp-server/dist/index.js"]
         }
       }
     }
   }
   ```

   **Option 3 - Project-level with environment variables (recommended for production):**

   Create `.mcp.json` in your project root:
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
           "LOG_LEVEL": "warn",
           "LOG_FILE": "./asvs-server.log",
           "ASVS_DATA_HASH": ""
         }
       }
     }
   }
   ```

3. **Restart Claude Code** to load the new MCP server

4. **Verify it's working**:
   - Use `/mcp` command to see available MCP servers
   - Test by asking: "Show me all ASVS Level 1 authentication requirements"
   - Check log file for startup confirmation

**Note**: For Claude Desktop (not Claude Code), use different config files:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**Configuration Documentation**: See `SETUP_GUIDE.md` for detailed setup instructions and `ENVIRONMENT_VARIABLES.md` for complete configuration reference.

## Architecture

### Single-File Server Design
All server logic is in `src/index.ts` (~1400 lines with security features). The server uses:
- **MCP SDK** (`@modelcontextprotocol/sdk`) for protocol handling
- **StdioServerTransport** for communication over stdin/stdout
- **node-fetch** for fetching ASVS data from GitHub with TLS 1.2+
- **winston** for structured logging (JSON format, rotation)
- **crypto** (Node.js built-in) for SHA-256 integrity verification and UUID generation

### Core Components

**ASVSServer class** (lines 102-1197):
- `loadASVSData()` - Loads from local file (ASVS 5.0.0), falls back to GitHub remote fetch, then embedded mock data
- `loadHIPAAMappings()` - Loads validated HIPAA Security Rule mappings (NEW in 0.4.0)
- `buildHIPAAIndex()` - Creates bidirectional ASVS ↔ HIPAA index for O(1) lookups (NEW in 0.4.0)
- `enrichASVSWithHIPAAMappings()` - Populates compliance.hipaa field in ASVS requirements (NEW in 0.4.0)
- `parseASVSData()` - Transforms OWASP JSON format into internal structure
- `setupHandlers()` (line 611) - Registers ListTools and CallTool request handlers
- 9 tool implementation methods (lines 822-1190)

### Data Structure

**ASVSRequirement** (lines 32-47):
- Core fields: `id`, `category`, `subcategory`, `description`, `level[]`
- Optional fields: `cwe[]`, `nist[]`
- `compliance` object maps to 5 frameworks: `pci_dss`, `hipaa`, `gdpr`, `sox`, `iso27001`

**ASVSCategory** (lines 49-53):
- Contains `id`, `name`, and array of requirements

**Mock data** (lines 324-608):
- 7 categories with 23 requirements total
- Includes full compliance mappings for demonstration
- Used when both local and remote data sources fail

### Tool Implementation Patterns

All 9 tools follow this pattern:
1. Extract and validate arguments
2. Search/filter `asvsData` array
3. Apply pagination if supported (5 tools support pagination)
4. Return JSON response in `{ content: [{ type: "text", text: JSON.stringify(...) }] }` format

**Pagination support**:
- **Supported tools**: `get_requirements_by_level`, `get_requirements_by_category`, `search_requirements`, `recommend_priority_controls`, `get_compliance_requirements`
- **Parameters**: `offset` (default: 0), `limit` (default: 50-100, max: 500)
- **Response includes**: `offset`, `limit`, `total`, `returned`, `hasMore` fields
- **Purpose**: Prevents MCP token limit errors (25,000 tokens) when working with large codebases
- **Example**:
  ```json
  {
    "level": "L1",
    "offset": 0,
    "limit": 100,
    "total": 450,
    "returned": 100,
    "hasMore": true,
    "requirements": [...]
  }
  ```

**Priority/scoring logic**:
- `recommendPriorityControls()` - Uses high-priority categories list, sorts by priority then level
- `calculateGapPriority()` - Assigns HIGH/MEDIUM/LOW based on category and compliance patterns

**Compliance mapping**:
- Requirements have `compliance` object with arrays of framework-specific control IDs
- **HIPAA mappings are validated** (✅): 76 HIPAA requirements, 48 ASVS requirements, 102 total mappings
- Other frameworks (PCI DSS, GDPR, SOX, ISO 27001) are illustrative examples only (⚠️)
- Gap analysis calculates coverage percentage per framework
- Bidirectional mapping: ASVS→Compliance and Compliance→ASVS
- HIPAA uses O(1) Map-based indexing for fast lookups

## Key Files

### Core Implementation
- `src/index.ts` - Entire server implementation (~1400 lines with security features)
- `package.json` - Dependencies: MCP SDK, node-fetch, winston; Scripts: build, watch, dev, test
- `tsconfig.json` - ES2022 target, Node16 modules, strict mode enabled

### Data Files
- `data/asvs-5.0.0.json` - ASVS 5.0.0 requirements (345 requirements, 17 chapters)
- `data/asvs-5.0.0-hipaa-mapping.json` - ✅ Validated HIPAA mappings (76 reqs, 102 mappings)
- `data/asvs-cwe-mapping.json` - ✅ Official OWASP CWE mappings (214 mappings)
- `data/asvs-nist-mapping.json` - ✅ Official OWASP NIST 800-63B mappings (52 mappings)

### Documentation
- `README.md` - User-facing documentation with tool descriptions and usage examples
- `SECURITY.md` - Comprehensive security documentation (13.5 KB)
- `SECURITY_AUDIT_REPORT.md` - ASVS Level 1 audit results (87% compliance)
- `SETUP_GUIDE.md` - Four different setup methods with examples
- `ENVIRONMENT_VARIABLES.md` - Complete configuration reference
- `HIPAA_INTEGRATION.md` - Detailed HIPAA mapping documentation
- `CLAUDE.md` - This file - Claude Code instructions
- `PHASE1_IMPLEMENTATION.md` - Logging and data integrity implementation
- `PHASE2_IMPLEMENTATION.md` - Configuration and TLS implementation
- `PHASE3_IMPLEMENTATION.md` - Rate limiting and request ID implementation

### Test Files
- `test-phase1.js` - Tests for logging and data integrity
- `test-phase2.js` - Tests for configuration and TLS
- `test-phase3.js` - Tests for rate limiting and request IDs

## Development Notes

**Testing the server**:
- Use `npm run dev` to test locally (outputs to stderr)
- Configure in MCP client (e.g., Claude Desktop) to test end-to-end
- Server communicates over stdio, so manual testing requires MCP client

**Data source cascade** (src/index.ts:152-202):
- **Primary**: Local file (`data/asvs-5.0.0.json`) - **54x faster** than remote fetch (2ms vs 110ms)
- **Fallback 1**: Remote fetch from GitHub OWASP/ASVS repository (ASVS 5.0.0)
- **Fallback 2**: Embedded mock data with 7 categories (lines 324-608)
- Data source is indicated in `_meta.data_source` field of all responses

**HIPAA data loading** (NEW in 0.4.0):
- **Source**: Local file (`data/asvs-5.0.0-hipaa-mapping.json`)
- **Load time**: ~2-5ms (76 HIPAA requirements, 102 mappings)
- **Indexing**: ~1-2ms to build bidirectional ASVS ↔ HIPAA map
- **Total overhead**: ~5-10ms on server startup (negligible)
- **Graceful degradation**: Server starts even if HIPAA file is missing
- **Test script**: `node scripts/test-hipaa-integration.js`

**Updating ASVS data**:
- Local file is included in the repository
- To update: `npm run update-asvs` downloads latest from OWASP
- Update script: `scripts/update-asvs-data.js`

**Security configuration** (NEW in 0.5.0):
- **Default Tier**: BALANCED (production-recommended)
- **Configuration**: Via `ASVS_SECURITY_TIER` environment variable
- **Rate Limiting**: Enabled by default (100 requests/minute)
- **TLS**: 1.2+ with explicit certificate validation
- **Logging**: Winston with JSON format and rotation (10MB max, 5 files)
- **Data Integrity**: SHA-256 hash verification (configurable via `ASVS_DATA_HASH`)

**Available Security Tiers**:

| Constraint | CONSERVATIVE | BALANCED ⭐ | GENEROUS |
|------------|--------------|-------------|----------|
| File Size | 10 MB | **25 MB** | 50 MB |
| Query Length | 1000 chars | **2000 chars** | 5000 chars |
| Max Category Name | 200 chars | **500 chars** | 1000 chars |
| Max ID Length | 50 chars | **100 chars** | 200 chars |
| Search Results | 100 | **250** | 500 |
| Cache Entries | 5,000 | **10,000** | 20,000 |
| **Security Level** | Excellent | **Excellent** | Good |
| **Best For** | Public APIs | **Production** | Development |

**Additional Security Features (NEW in 0.5.0)**:
- ✅ Rate limiting with sliding window algorithm
- ✅ Request ID tracking with UUID (randomUUID())
- ✅ Memory safety with cache size limits
- ✅ Error sanitization to prevent information disclosure
- ✅ Structured logging with winston (JSON format, rotation)

To configure, set environment variables in `.mcp.json` or deployment configuration (see `SETUP_GUIDE.md`)

**Compliance framework keys**:
Use snake_case internally: `pci_dss`, `hipaa`, `gdpr`, `sox`, `iso27001`

**Compliance framework mapping status**:
- ✅ **HIPAA**: Validated - 76 requirements, 102 mappings, 94.7% coverage (see `HIPAA_INTEGRATION.md`)
- ✅ **CWE**: Official OWASP mappings - 214 mappings
- ✅ **NIST 800-63B**: Official OWASP mappings - 52 mappings
- ⚠️ **PCI DSS, GDPR, SOX, ISO 27001**: Illustrative examples only - not validated

**Adding new tools**:
1. Add tool definition in `setupHandlers()` ListTools response (lines 613-781)
2. Add case in CallTool switch statement (lines 783-820)
3. Implement handler method following existing patterns (see lines 822-1190)

## Security Focus

This is a defensive security tool. All functionality is read-only - it queries and analyzes OWASP ASVS data but does not execute code, modify systems, or perform offensive security operations.

**Security Status**: ✅ **87% ASVS Level 1 Compliance - Production Ready**

The server has undergone comprehensive security hardening (Phases 1-3) and achieved:
- 87% ASVS Level 1 compliance (up from 66%)
- Production-ready status with LOW risk rating
- Comprehensive security controls and documentation
- Automated security test suites

See `SECURITY_AUDIT_REPORT.md` for detailed security assessment.
