# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that provides AI assistants with access to OWASP ASVS (Application Security Verification Standard) data. The server exposes 9 tools for querying security requirements, generating recommendations, and mapping compliance frameworks.

**Current Version**: 0.4.0 (2025-10-22)
**ASVS Version**: 5.0.0 (345 requirements, 17 chapters)
**HIPAA Mappings**: ✅ Validated - 76 HIPAA requirements, 102 mappings, 94.7% coverage
**Git Repository**: https://github.com/clintcan/owasp-asvs-mcp-server

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

   **Option 3 - Project-level (version controlled):**

   Create `.mcp.json` in your project root:
   ```json
   {
     "mcpServers": {
       "owasp-asvs": {
         "command": "node",
         "args": ["/absolute/path/to/owasp-asvs-mcp-server/dist/index.js"]
       }
     }
   }
   ```

3. **Restart Claude Code** to load the new MCP server

4. **Verify it's working**:
   - Use `/mcp` command to see available MCP servers
   - Test by asking: "Show me all ASVS Level 1 authentication requirements"

**Note**: For Claude Desktop (not Claude Code), use different config files:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

## Architecture

### Single-File Server Design
All server logic is in `src/index.ts` (~1200 lines). The server uses:
- **MCP SDK** (`@modelcontextprotocol/sdk`) for protocol handling
- **StdioServerTransport** for communication over stdin/stdout
- **node-fetch** for fetching ASVS data from GitHub

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

- `src/index.ts` - Entire server implementation (~1200 lines)
- `data/asvs-5.0.0.json` - ASVS 5.0.0 requirements (345 requirements, 17 chapters)
- `data/asvs-5.0.0-hipaa-mapping.json` - ✅ Validated HIPAA mappings (76 reqs, 102 mappings)
- `data/asvs-cwe-mapping.json` - ✅ Official OWASP CWE mappings (214 mappings)
- `data/asvs-nist-mapping.json` - ✅ Official OWASP NIST 800-63B mappings (52 mappings)
- `package.json` - Dependencies: MCP SDK, node-fetch; Scripts: build, watch, dev
- `tsconfig.json` - ES2022 target, Node16 modules, strict mode enabled
- `README.md` - User-facing documentation with tool descriptions and usage examples
- `HIPAA_INTEGRATION.md` - Detailed HIPAA mapping documentation
- `CLAUDE.md` - This file - Claude Code instructions

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

**Security constraints** (src/index.ts:23-29):
- **Current Tier**: Generous (for trusted/internal use)
- File size limit: 50 MB (covers future ASVS versions)
- Query length: 5000 chars (complex searches supported)
- Search results: 500 max (returns all matches in most cases)
- Input validation prevents DoS while allowing extensive legitimate use

**Available Security Tiers**:

| Constraint | Conservative | Balanced | Generous ⭐ | Maximum |
|------------|--------------|----------|-------------|---------|
| File Size | 10 MB | 25 MB | **50 MB** | 100 MB |
| Query Length | 1000 | 2000 | **5000** | 10000 |
| Category Name | 200 | 500 | **1000** | 2000 |
| ID Length | 50 | 100 | **200** | 500 |
| Search Results | 100 | 250 | **500** | 1000 |
| Tokenize Input | 10K | 20K | **50K** | 100K |
| **Security Level** | Excellent | Excellent | Good | Fair |
| **Best For** | Public APIs | Most uses | Internal | Dev only |

To change tiers, modify the constants at the top of `src/index.ts` (lines 23-29)

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
