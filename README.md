# OWASP ASVS MCP Server

A Model Context Protocol (MCP) server that provides AI assistants with access to the OWASP Application Security Verification Standard (ASVS), enabling intelligent security recommendations and requirement lookups.

**Git Repository**: https://github.com/clintcan/owasp-asvs-mcp-server

## Features

- **Query by Level**: Get all requirements for ASVS verification levels L1, L2, or L3
- **Query by Category**: Filter requirements by security categories (Authentication, Access Control, etc.)
- **Detailed Requirements**: Look up specific requirements by ID
- **Smart Recommendations**: Get prioritized control recommendations based on your application context
- **Search**: Find requirements by keyword or vulnerability type
- **Category Overview**: See summaries of all ASVS categories
- **Compliance Mapping**: Map ASVS requirements to PCI DSS, HIPAA, GDPR, SOX, and ISO 27001
- **Gap Analysis**: Identify missing controls needed for compliance frameworks
- **Compliance Impact**: Understand which regulations a security control helps satisfy

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
│   └── index.ts          # Main server code
├── data/
│   └── asvs-5.0.0.json   # Local ASVS data (loads 54x faster than remote)
├── scripts/
│   ├── update-asvs-data.js      # Update ASVS data from OWASP
│   └── benchmark-loading.js     # Performance benchmarking tool
├── dist/                  # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## Configuration

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

   **Option C - Project-level config:**

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
- "Show me all HIPAA-related security controls in ASVS"
- "Our company needs SOX and ISO 27001 compliance. What's the gap between L1 and L2?"
- "If I implement ASVS requirement 9.1.1, which compliance frameworks does it satisfy?"
- "We've implemented basic auth controls. Run a gap analysis for GDPR compliance at L2"
- "What percentage of PCI DSS requirements do we currently meet?"

**Real-World Scenarios:**
- "We're a healthcare startup. Map our path from no security controls to HIPAA compliance"
- "Generate a compliance roadmap for a fintech app targeting PCI DSS Level 1"
- "We have L1 covered. Prioritize L2 requirements by compliance impact for PCI and SOX"
- "Which ASVS controls give us the most compliance coverage across multiple frameworks?"

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

The server implements **generous security constraints** optimized for trusted/internal environments:

- **File Size Limit**: 50 MB (supports future ASVS versions and extended datasets)
- **Query Length**: 5000 characters (enables complex searches with full paragraphs)
- **Search Results**: 500 maximum (returns all matches in most cases)
- **DoS Protection**: Input validation and resource limits prevent abuse while allowing extensive legitimate use

**Recommended for**: Internal tools, development environments, trusted networks

#### Security Constraint Tiers

The server can be configured with different security tiers. Currently using **Generous** tier:

| Constraint | Conservative | Balanced | Generous ⭐ | Maximum |
|------------|--------------|----------|-------------|---------|
| File Size | 10 MB | 25 MB | **50 MB** | 100 MB |
| Query Length | 1000 | 2000 | **5000** | 10000 |
| Search Results | 100 | 250 | **500** | 1000 |
| **Security Level** | Excellent | Excellent | Good | Fair |
| **Best For** | Public APIs | Most uses | **Internal** | Dev only |

To change security tiers, modify the constants in `src/index.ts` (lines 23-29).

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
```

## Compliance Frameworks Supported

The server maps ASVS requirements to the following compliance frameworks:

### PCI DSS (Payment Card Industry Data Security Standard)
- Requirement sections: 3.x (Data Protection), 4.x (Encryption), 6.x (Secure Development), 8.x (Access Control), 10.x (Logging)
- Use case: Payment processing, e-commerce, financial services

### HIPAA (Health Insurance Portability and Accountability Act)
- Security Rule sections: 164.308 (Administrative), 164.312 (Technical), 164.316 (Policies)
- Use case: Healthcare applications, medical records, patient data

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
- Additional compliance framework mappings (NIST 800-53, CSA CCM, etc.)
- More sophisticated prioritization algorithms
- Integration with CVE/CWE databases
- Custom risk scoring based on threat modeling
- Automated compliance report generation
- Real-time compliance status tracking

## License

MIT

## Resources

- [OWASP ASVS Official Site](https://owasp.org/www-project-application-security-verification-standard/)
- [ASVS GitHub Repository](https://github.com/OWASP/ASVS)
- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)