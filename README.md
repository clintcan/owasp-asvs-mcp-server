# OWASP ASVS MCP Server

[![Security Status](https://img.shields.io/badge/ASVS%20L1%20Compliance-87%25-brightgreen)](SECURITY_AUDIT_REPORT.md)
[![Production Ready](https://img.shields.io/badge/Production-Ready-success)](SECURITY.md)
[![OWASP ASVS](https://img.shields.io/badge/OWASP%20ASVS-5.0.0-blue)](https://owasp.org/www-project-application-security-verification-standard/)

A **production-ready** Model Context Protocol (MCP) server that provides AI assistants with access to the OWASP Application Security Verification Standard (ASVS), enabling intelligent security recommendations and requirement lookups.

**Git Repository**: https://github.com/clintcan/owasp-asvs-mcp-server

**Security:** This server achieves **87% ASVS Level 1 compliance** with production-grade security controls including structured logging, TLS 1.2+, data integrity verification, rate limiting, and configurable security tiers. See [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md) for detailed assessment.

## Features

### Core Capabilities
- **Query by Level**: Get all requirements for ASVS verification levels L1, L2, or L3
- **Query by Category**: Filter requirements by security categories (Authentication, Access Control, etc.)
- **Detailed Requirements**: Look up specific requirements by ID
- **Smart Recommendations**: Get prioritized control recommendations based on your application context
- **Search**: Find requirements by keyword or vulnerability type
- **Category Overview**: See summaries of all ASVS categories
- **Compliance Mapping**: Map ASVS requirements to compliance frameworks with validated HIPAA mappings
- **Gap Analysis**: Identify missing controls needed for compliance frameworks
- **Compliance Impact**: Understand which regulations a security control helps satisfy
- **HIPAA Integration**: 76 validated HIPAA Security Rule mappings to ASVS 5.0.0 requirements

### Production-Grade Security ✅
- **Structured Logging**: Winston-based JSON logging with rotation (10MB max, 5 files)
- **Data Integrity**: SHA-256 hash verification for remote data fetching
- **TLS 1.2+**: Explicit TLS configuration with certificate validation
- **Rate Limiting**: Sliding window algorithm (configurable: 100 req/min default)
- **Memory Safety**: Cache size limits and input validation
- **Request Tracking**: UUID-based request IDs for log correlation
- **Configurable Security**: Three tiers (CONSERVATIVE/BALANCED/GENEROUS)
- **Environment Variables**: Full configuration via env vars (see [SETUP_GUIDE.md](SETUP_GUIDE.md))

## Installation

### From Git Repository (Recommended)

```bash
# Clone the repository
git clone https://github.com/clintcan/owasp-asvs-mcp-server.git
cd owasp-asvs-mcp-server

# Install dependencies
npm install

# Build the TypeScript code
npm run build
```

### Manual Installation

```bash
# Create the project directory
mkdir owasp-asvs-mcp-server
cd owasp-asvs-mcp-server

# Initialize and install dependencies
npm install

# Build the TypeScript code
npm run build
```

## Project Structure

```
owasp-asvs-mcp-server/
├── src/
│   └── index.ts                          # Main server code (~1200 lines)
├── data/
│   ├── asvs-5.0.0.json                   # ASVS 5.0.0 requirements (345 reqs)
│   ├── asvs-5.0.0-hipaa-mapping.json     # Validated HIPAA mappings ✅
│   ├── asvs-cwe-mapping.json             # Official CWE mappings from OWASP
│   └── asvs-nist-mapping.json            # Official NIST 800-63B mappings
├── scripts/
│   ├── update-asvs-data.js               # Update ASVS from OWASP GitHub
│   ├── parse-nist-mapping.cjs            # Parse NIST markdown to JSON
│   ├── benchmark-loading.js              # Performance benchmarking
│   ├── validate-asvs5-hipaa-mappings.js  # Validate HIPAA mappings
│   └── test-hipaa-integration.js         # Test HIPAA integration
├── dist/                                  # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
├── README.md
├── CLAUDE.md                              # Claude Code instructions
└── HIPAA_INTEGRATION.md                   # HIPAA integration docs
```

## Data Sources

This MCP server uses **official OWASP ASVS data and mappings**:

### ASVS Requirements
- **Source**: [OWASP ASVS 5.0.0](https://github.com/OWASP/ASVS)
- **File**: `data/asvs-5.0.0.json`
- **Contains**: All security verification requirements with levels (L1, L2, L3)

### CWE Mappings ✅ Official
- **Source**: [OWASP ASVS 5.0 CWE Mapping](https://github.com/OWASP/ASVS/blob/master/5.0/mappings/v5.0.be_cwe_mapping.json)
- **File**: `data/asvs-cwe-mapping.json`
- **Contains**: 214 mappings from ASVS requirements to Common Weakness Enumeration (CWE) IDs
- **Status**: Official OWASP mapping

### NIST Mappings ✅ Official
- **Source**: [OWASP ASVS 5.0 NIST Mapping](https://github.com/OWASP/ASVS/blob/master/5.0/mappings/nist.md)
- **File**: `data/asvs-nist-mapping.json`
- **Contains**: 52 mappings from ASVS requirements to NIST 800-63B authentication guidelines
- **Status**: Official OWASP mapping

### HIPAA Mappings ✅ Validated
- **Source**: Validated HIPAA Security Rule mappings (45 CFR Parts 164.308, 164.312, etc.)
- **File**: `data/asvs-5.0.0-hipaa-mapping.json`
- **Contains**: 76 HIPAA requirements mapped to 48 ASVS 5.0.0 requirements (102 total mappings)
- **Coverage**: 94.7% full coverage, 1.3% partial, 3.9% no coverage (physical security only)
- **Status**: Validated - All mappings verified against ASVS 5.0.0 and HIPAA Security Rule
- **Date**: Created 2025-10-22
- **See**: `HIPAA_INTEGRATION.md` for detailed documentation

### Other Compliance Framework Mappings ⚠️ Illustrative Only
- **Frameworks**: PCI DSS, GDPR, SOX, ISO 27001
- **Status**: **Not official** - Illustrative examples for demonstration purposes only
- **Important**: These mappings are conceptually reasonable but have NOT been validated by compliance auditors
- **Recommendation**: For production compliance work, use [OpenCRE](https://www.opencre.org) or consult qualified compliance professionals. HIPAA mappings (above) are an exception - they have been validated.

### Updating Data

```bash
# Update ASVS requirements data
npm run update-asvs

# Update CWE and NIST mappings (manual)
curl -o data/asvs-cwe-mapping.json https://raw.githubusercontent.com/OWASP/ASVS/master/5.0/mappings/v5.0.be_cwe_mapping.json
curl -o data/asvs-nist-mapping.md https://raw.githubusercontent.com/OWASP/ASVS/master/5.0/mappings/nist.md
node scripts/parse-nist-mapping.cjs
```

## Configuration

The server supports comprehensive configuration via environment variables. See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed setup instructions and [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) for complete reference.

### Quick Start Configuration

Add the server to your MCP client configuration:

### For Claude Code

1. **Clone and build the server**:
   ```bash
   git clone https://github.com/clintcan/owasp-asvs-mcp-server.git
   cd owasp-asvs-mcp-server
   npm install
   npm run build
   ```

2. **Configure MCP server** using one of these methods:

   **Option A - Recommended (CLI):**
   ```bash
   claude mcp add owasp-asvs node /absolute/path/to/owasp-asvs-mcp-server/dist/index.js
   ```

   **Option B - Manual user-level config:**

   Edit `~/.claude.json` (Windows: `%USERPROFILE%\.claude.json`)

   Find your project in the `"projects"` object and add:
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

   **Option C - Project-level config with environment variables:**

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
           "LOG_FILE": "./asvs-server.log"
         }
       }
     }
   }
   ```

3. **Restart Claude Code** to load the new MCP server

4. **Verify it's working**:
   - Use `/mcp` command to see available MCP servers
   - Test by asking: "Show me all ASVS Level 1 authentication requirements"

### Environment Variables

The server supports comprehensive configuration. See [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) for complete reference.

**Key Variables:**
- `ASVS_SECURITY_TIER`: CONSERVATIVE | BALANCED | GENEROUS (default: BALANCED)
- `ASVS_RATE_LIMIT`: Enable rate limiting (default: true)
- `ASVS_RATE_LIMIT_REQUESTS`: Max requests per window (default: 100)
- `LOG_LEVEL`: error | warn | info | debug (default: info)
- `LOG_FILE`: Path to log file (default: ./asvs-server.log)
- `ASVS_DATA_HASH`: SHA-256 hash for data integrity verification (optional)

**Example Production Configuration:**
```json
{
  "mcpServers": {
    "owasp-asvs": {
      "command": "node",
      "args": ["/path/to/owasp-asvs-mcp-server/dist/index.js"],
      "env": {
        "ASVS_SECURITY_TIER": "BALANCED",
        "ASVS_RATE_LIMIT": "true",
        "ASVS_RATE_LIMIT_REQUESTS": "100",
        "ASVS_RATE_LIMIT_WINDOW_MS": "60000",
        "LOG_LEVEL": "warn",
        "LOG_FILE": "/var/log/asvs-server.log",
        "ASVS_DATA_HASH": "your_sha256_hash_here"
      }
    }
  }
}
```

### For Claude Desktop (macOS)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

### For Claude Desktop (Windows)

Edit `%APPDATA%/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "owasp-asvs": {
      "command": "node",
      "args": ["C:\\path\\to\\owasp-asvs-mcp-server\\dist\\index.js"]
    }
  }
}
```

## Available Tools

### 1. get_requirements_by_level
Get all requirements for a specific verification level. **Supports pagination.**

**Parameters:**
- `level` (number): 1, 2, or 3
- `offset` (number, optional): Number of results to skip (default: 0)
- `limit` (number, optional): Max results to return (default: 100, max: 500)

**Response includes:** `offset`, `limit`, `total`, `returned`, `hasMore` for pagination

**Example Use:**
- "Show me all Level 1 ASVS requirements"
- "What are the L2 security requirements?"
- "Get the first 50 Level 1 requirements" (automatically uses pagination)

### 2. get_requirements_by_category
Get requirements filtered by security category. **Supports pagination.**

**Parameters:**
- `category` (string): Category name (e.g., "Authentication", "Access Control")
- `level` (number, optional): Filter by level
- `offset` (number, optional): Number of results to skip (default: 0)
- `limit` (number, optional): Max results to return (default: 100, max: 500)

**Response includes:** `offset`, `limit`, `total`, `returned`, `hasMore` for pagination

**Example Use:**
- "What are the authentication requirements in ASVS?"
- "Show me Level 2 session management requirements"
- "Get the first 25 access control requirements"

### 3. get_requirement_details
Get detailed information about a specific requirement.

**Parameters:**
- `requirement_id` (string): ASVS ID (e.g., "2.1.1")

**Example Use:**
- "Tell me about ASVS requirement 2.1.1"
- "What does requirement 3.2.1 say?"

### 4. recommend_priority_controls
Get prioritized security recommendations based on context. **Supports pagination.**

**Parameters:**
- `target_level` (number): Target verification level (1-3)
- `current_level` (number, optional): Current level (0-2)
- `focus_areas` (array, optional): Specific categories to focus on
- `application_type` (string, optional): Type of application
- `offset` (number, optional): Number of results to skip (default: 0)
- `limit` (number, optional): Max results to return (default: 50, max: 500)

**Response includes:** `offset`, `limit`, `total`, `returned`, `hasMore` for pagination

**Example Use:**
- "We're a fintech app at L1, recommend priority controls to reach L2"
- "What authentication controls should we implement first for a healthcare application?"

### 5. search_requirements
Search requirements by keyword. **Supports pagination.**

**Parameters:**
- `query` (string): Search term
- `level` (number, optional): Filter by level
- `offset` (number, optional): Number of results to skip (default: 0)
- `limit` (number, optional): Max results to return (default: 50, max: 500)

**Response includes:** `offset`, `limit`, `total`, `returned`, `hasMore` for pagination

**Example Use:**
- "Find requirements related to SQL injection"
- "Search for password requirements"

### 6. get_category_summary
Get an overview of all ASVS categories.

**Example Use:**
- "Give me a summary of all ASVS categories"
- "How many requirements are in each category?"

### 7. get_compliance_requirements
Get ASVS requirements mapped to specific compliance frameworks. **Supports pagination.**

**Parameters:**
- `framework` (string): "pci_dss", "hipaa", "gdpr", "sox", or "iso27001"
- `level` (number, optional): Filter by ASVS level
- `offset` (number, optional): Number of results to skip (default: 0)
- `limit` (number, optional): Max results to return (default: 100, max: 500)

**Response includes:** `offset`, `limit`, `total`, `returned`, `hasMore` for pagination

**Example Use:**
- "Show me all ASVS requirements that map to PCI DSS"
- "What ASVS L2 requirements help with HIPAA compliance?"
- "Which controls satisfy GDPR Article 32?"

### 8. get_compliance_gap_analysis
Analyze compliance gaps and identify missing controls.

**Parameters:**
- `frameworks` (array): List of frameworks to analyze
- `target_level` (number): Target ASVS level
- `implemented_requirements` (array, optional): List of already-implemented requirement IDs

**Example Use:**
- "We need PCI DSS and SOX compliance at L2. What are we missing?"
- "Gap analysis for HIPAA compliance, we've implemented requirements 2.1.1, 3.2.1, and 4.1.1"
- "Show compliance coverage for GDPR and ISO 27001"

### 9. map_requirement_to_compliance
Show which compliance frameworks a specific requirement satisfies.

**Parameters:**
- `requirement_id` (string): ASVS requirement ID

**Example Use:**
- "Which compliance frameworks does requirement 2.1.1 help with?"
- "What's the regulatory impact of implementing ASVS 8.3.4?"
- "Show me the compliance mapping for requirement 9.1.1"

## Pagination Support

Five tools support pagination to prevent MCP token limit errors (25,000 tokens) when working with large ASVS datasets:

- `get_requirements_by_level`
- `get_requirements_by_category`
- `search_requirements`
- `recommend_priority_controls`
- `get_compliance_requirements`

**Pagination Parameters:**
- `offset`: Number of results to skip (default: 0)
- `limit`: Maximum results to return (default: 50-100 depending on tool, max: 500)

**Response Format:**
All paginated responses include:
```json
{
  "offset": 0,
  "limit": 100,
  "total": 450,
  "returned": 100,
  "hasMore": true,
  "requirements": [...]
}
```

**Example:**
```
"Get the first 25 Level 1 authentication requirements"
```

The AI will automatically use pagination parameters when needed. To retrieve additional pages, specify the offset:
```
"Get the next 25 Level 1 authentication requirements starting from offset 25"
```

## Usage Examples

Once configured in Claude Desktop, you can ask questions like:

**Security Requirements:**
- "What are the top priority security controls for a new web application?"
- "Show me all ASVS Level 2 authentication requirements"
- "Our application currently meets L1. What are the most critical requirements to reach L2?"
- "Find ASVS requirements related to cross-site scripting (XSS)"
- "What does ASVS say about password policies?"
- "Recommend security controls for a financial services API"

**Compliance Questions:**
- "We're building a payment processing app. Which ASVS requirements help us meet PCI DSS?"
- "Show me all HIPAA-related security controls in ASVS Level 1" (uses validated HIPAA mappings ✅)
- "What HIPAA Security Rule sections does ASVS V6.2.1 satisfy?" (validated mappings ✅)
- "Our company needs SOX and ISO 27001 compliance. What's the gap between L1 and L2?"
- "If I implement ASVS requirement 9.1.1, which compliance frameworks does it satisfy?"
- "We've implemented basic auth controls. Run a gap analysis for GDPR compliance at L2"
- "What percentage of HIPAA requirements do we currently meet?" (uses validated mappings ✅)

**Real-World Scenarios:**
- "We're a healthcare startup. Map our path from no security controls to HIPAA compliance" (validated ✅)
- "Generate a compliance roadmap for a fintech app targeting PCI DSS Level 1"
- "We have L1 covered. Prioritize L2 requirements by compliance impact for PCI and SOX"
- "Which ASVS controls give us the most compliance coverage across multiple frameworks?"
- "Show me the 48 ASVS requirements that satisfy HIPAA Security Rule" (validated ✅)

## Data Source

The server uses a cascading data source strategy for optimal performance:

1. **Local File (Primary)**: Loads from `data/asvs-5.0.0.json` - **54x faster** than remote fetch (2ms vs 110ms)
2. **Remote Fetch (Fallback)**: Downloads from official OWASP ASVS GitHub repository (ASVS 5.0.0) if local file unavailable
3. **Mock Data (Last Resort)**: Uses built-in representative requirements if both sources fail

To update the local ASVS data file:
```bash
npm run update-asvs
```

The data source used is indicated in the `_meta.data_source` field of all responses (`local`, `remote`, or `mock`).

### Security & Performance

The server implements **configurable security tiers** to match your deployment environment:

#### Security Constraint Tiers

Configure via `ASVS_SECURITY_TIER` environment variable:

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

**Default**: BALANCED tier (recommended for production)

**Additional Security Features:**
- ✅ **Rate Limiting**: Sliding window algorithm (100 requests/minute default)
- ✅ **TLS 1.2+**: Explicit TLS configuration with certificate validation
- ✅ **Data Integrity**: SHA-256 hash verification for remote data
- ✅ **Request Tracking**: UUID-based request IDs for log correlation
- ✅ **Structured Logging**: Winston with JSON format and rotation
- ✅ **Memory Safety**: Cache size limits and input validation

See [SECURITY.md](SECURITY.md) for comprehensive security documentation.

## Development

```bash
# Watch mode for development
npm run watch

# Build for production
npm run build

# Test the server
npm run dev

# Update ASVS data from OWASP repository
npm run update-asvs

# Run security tests
npm run test:phase1   # Logging and data integrity tests
npm run test:phase2   # Configuration and TLS tests
npm run test:phase3   # Rate limiting and request ID tests
npm run test:all      # Run all test suites
```

## Compliance Frameworks Supported

The server maps ASVS requirements to the following compliance frameworks:

### PCI DSS (Payment Card Industry Data Security Standard)
- Requirement sections: 3.x (Data Protection), 4.x (Encryption), 6.x (Secure Development), 8.x (Access Control), 10.x (Logging)
- Use case: Payment processing, e-commerce, financial services

### HIPAA (Health Insurance Portability and Accountability Act) ✅ Validated
- **Security Rule sections**: 164.308 (Administrative), 164.312 (Technical), 164.316 (Policies), 164.502/514 (Use & Disclosure)
- **Mappings**: 76 HIPAA requirements → 48 ASVS 5.0.0 controls (102 total mappings)
- **Coverage**: 94.7% of HIPAA requirements have full ASVS coverage
- **Use case**: Healthcare applications, medical records, patient data, PHI (Protected Health Information)
- **Validation**: All mappings verified against HIPAA Security Rule (45 CFR)
- **Documentation**: See `HIPAA_INTEGRATION.md` for complete details

### GDPR (General Data Protection Regulation)
- Articles: Article 32 (Security of Processing), Article 25 (Privacy by Design)
- Use case: EU data processing, personal data protection, privacy compliance

### SOX (Sarbanes-Oxley Act)
- IT General Controls (ITGC)
- Use case: Financial reporting, publicly traded companies, audit controls

### ISO 27001 (Information Security Management)
- Annex A controls across all domains
- Use case: Information security management systems, global security standards

## Compliance Mapping Features

**Bidirectional Mapping:**
- From ASVS → Compliance: "Which frameworks does this control satisfy?"
- From Compliance → ASVS: "Which ASVS controls help meet PCI DSS 8.2.3?"

**Gap Analysis:**
- Identify missing requirements for compliance
- Calculate coverage percentage per framework
- Prioritize gaps by criticality and compliance impact

**Multi-Framework Analysis:**
- Compare requirements across multiple frameworks simultaneously
- Find controls that satisfy multiple regulations
- Optimize compliance efforts by implementing high-impact controls

- **Level 1**: Applications where information disclosure or modification would not cause material harm
- **Level 2**: Applications that contain sensitive data requiring protection (most applications)
- **Level 3**: Critical applications performing high-value transactions or containing sensitive medical data

## Key Categories

- **V1**: Architecture, Design and Threat Modeling
- **V2**: Authentication
- **V3**: Session Management
- **V4**: Access Control
- **V5**: Validation, Sanitization and Encoding
- **V6**: Stored Cryptography
- **V7**: Error Handling and Logging
- **V8**: Data Protection
- **V9**: Communication
- **V10**: Malicious Code
- **V11**: Business Logic
- **V12**: Files and Resources
- **V13**: API and Web Service
- **V14**: Configuration

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository: https://github.com/clintcan/owasp-asvs-mcp-server
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Submit a pull request

The server can be enhanced with:
- Additional validated compliance framework mappings (NIST 800-53, CSA CCM, ISO 27002, etc.)
- More sophisticated prioritization algorithms
- Integration with OpenCRE for additional compliance mappings
- Custom risk scoring based on threat modeling
- Automated compliance report generation
- Real-time compliance status tracking
- HIPAA-specific tools (e.g., `get_hipaa_requirements` for reverse lookup)

### Recent Enhancements

**Version 0.5.0 (2025-10-23) - Production Security Release:**
- ✅ **87% ASVS Level 1 Compliance** achieved (up from 66%)
- ✅ **Winston Structured Logging** with JSON format and rotation
- ✅ **Rate Limiting** with sliding window algorithm
- ✅ **TLS 1.2+** explicit configuration with certificate validation
- ✅ **Data Integrity** SHA-256 hash verification
- ✅ **Configurable Security Tiers** via environment variables
- ✅ **Request ID Tracking** with UUID for log correlation
- ✅ **Comprehensive Documentation**: SECURITY.md, SETUP_GUIDE.md, ENVIRONMENT_VARIABLES.md
- ✅ **Automated Test Suites** for all security features
- ✅ **Production Ready** status confirmed by security audit

**Version 0.4.0 (2025-10-22):**
- ✅ ASVS 5.0.0 integration (345 requirements, 17 chapters)
- ✅ Validated HIPAA Security Rule mappings (76 requirements, 102 mappings)
- ✅ Bidirectional HIPAA ↔ ASVS indexing for O(1) lookups
- ✅ Official CWE mappings (214 mappings)
- ✅ Official NIST 800-63B mappings (52 mappings)
- ✅ Comprehensive validation scripts for data integrity

## License

MIT

## Documentation

- **[README.md](README.md)** - This file - Quick start and overview
- **[SECURITY.md](SECURITY.md)** - Comprehensive security documentation (13.5 KB)
- **[SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md)** - ASVS Level 1 audit results (87% compliance)
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Four different setup methods with examples
- **[ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md)** - Complete configuration reference
- **[HIPAA_INTEGRATION.md](HIPAA_INTEGRATION.md)** - Validated HIPAA mapping documentation
- **[CLAUDE.md](CLAUDE.md)** - Instructions for Claude Code integration
- **[PHASE1_IMPLEMENTATION.md](PHASE1_IMPLEMENTATION.md)** - Logging and data integrity implementation
- **[PHASE2_IMPLEMENTATION.md](PHASE2_IMPLEMENTATION.md)** - Configuration and TLS implementation
- **[PHASE3_IMPLEMENTATION.md](PHASE3_IMPLEMENTATION.md)** - Rate limiting and request ID implementation

## Resources

- [OWASP ASVS Official Site](https://owasp.org/www-project-application-security-verification-standard/)
- [ASVS GitHub Repository](https://github.com/OWASP/ASVS) - Source for official mappings
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html) - Official HHS documentation
- [OpenCRE](https://www.opencre.org) - Additional compliance mappings and cross-references