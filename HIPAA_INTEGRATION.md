# HIPAA Integration in OWASP ASVS MCP Server

**Date:** 2025-10-22
**ASVS Version:** 5.0.0
**HIPAA Mapping File:** `data/asvs-5.0.0-hipaa-mapping.json`

---

## Overview

The OWASP ASVS MCP Server now includes **validated HIPAA Security Rule mappings** to ASVS 5.0.0 requirements. This integration enables:

- ✅ **Bidirectional mapping** between HIPAA requirements and ASVS controls
- ✅ **Real-time compliance queries** via MCP tools
- ✅ **Gap analysis** for HIPAA compliance initiatives
- ✅ **Validated mappings** based on official HIPAA Security Rule requirements

---

## Integration Statistics

| Metric | Value |
|--------|-------|
| **HIPAA Requirements Mapped** | 76 |
| **Total ASVS Mappings** | 102 |
| **ASVS Requirements with HIPAA Coverage** | 48 |
| **Coverage Rate** | 94.7% (full), 1.3% (partial), 3.9% (none) |
| **Validation Status** | 100% - All mappings verified |

---

## Architecture

### Data Flow

```
HIPAA Mapping File (asvs-5.0.0-hipaa-mapping.json)
           ↓
     Load on Server Start
           ↓
   Build Bidirectional Index
           ↓
  ┌─────────────────────────┐
  │  ASVS → HIPAA Index     │  (48 ASVS reqs map to HIPAA)
  │  HIPAA → ASVS Index     │  (76 HIPAA reqs map to ASVS)
  └─────────────────────────┘
           ↓
   Enrich ASVS Requirements
           ↓
  compliance.hipaa[] populated
           ↓
    Available via MCP Tools
```

### Key Components

1. **`loadHIPAAMappings()`** - Loads HIPAA mapping file at server startup
2. **`buildHIPAAIndex()`** - Creates bidirectional ASVS ↔ HIPAA index
3. **`enrichASVSWithHIPAAMappings()`** - Adds HIPAA references to ASVS requirements
4. **`asvsToHipaaIndex`** - Map for O(1) lookups: `ASVS ID → HIPAA Requirements[]`

---

## How It Works

### Loading Process

When the MCP server starts:

1. **ASVS data loads** from `data/asvs-5.0.0.json` (345 requirements, 17 chapters)
2. **HIPAA mapping loads** from `data/asvs-5.0.0-hipaa-mapping.json` (76 HIPAA requirements)
3. **Bidirectional index builds** - Creates map of ASVS → HIPAA relationships
4. **ASVS requirements enriched** - Populates `compliance.hipaa` field with HIPAA references

### Example Enrichment

**Before enrichment:**
```typescript
{
  id: "V6.2.1",
  description: "Verify that passwords are at least 8 characters...",
  compliance: {}  // Empty
}
```

**After enrichment:**
```typescript
{
  id: "V6.2.1",
  description: "Verify that passwords are at least 8 characters...",
  compliance: {
    hipaa: [
      "§ 164.308(a)(5)(ii)(D)",  // Password Management (H1.5.3)
      "§ 164.312(d)"              // Person or Entity Authentication (H3.4.1)
    ]
  }
}
```

---

## MCP Tools Enhanced

The following existing MCP tools now work with real HIPAA data:

### 1. `get_compliance_requirements`

Query ASVS requirements mapped to HIPAA:

```typescript
{
  framework: "hipaa",
  level: 1  // Optional: filter by ASVS level
}
```

**Returns:** All ASVS requirements that satisfy HIPAA Security Rule requirements

### 2. `get_compliance_gap_analysis`

Analyze gaps for HIPAA compliance:

```typescript
{
  frameworks: ["hipaa"],
  target_level: 2,
  implemented_requirements: ["V6.2.1", "V15.1.1"]  // Already implemented
}
```

**Returns:** Gap analysis showing which HIPAA requirements need additional ASVS controls

### 3. `map_requirement_to_compliance`

Find HIPAA references for a specific ASVS requirement:

```typescript
{
  requirement_id: "V6.2.1"
}
```

**Returns:** All compliance frameworks (including HIPAA) that the ASVS requirement helps satisfy

---

## HIPAA Coverage Details

### Coverage Breakdown

| Coverage Type | Count | Percentage | Notes |
|--------------|-------|------------|-------|
| **Full** | 72 | 94.7% | Direct ASVS equivalent exists |
| **Partial** | 1 | 1.3% | ASVS partially covers requirement |
| **None** | 3 | 3.9% | No ASVS coverage (physical security) |

### Requirements with No ASVS Coverage

These HIPAA requirements are out of scope for ASVS (application security):

| HIPAA ID | Description | Reason |
|----------|-------------|---------|
| H2.1.1 | Physical facility access controls | Physical security |
| H2.1.2 | Role-based facility access procedures | Physical security |
| H2.1.3 | Physical access verification procedures | Physical security |

**Recommendation:** Implement these as organizational/physical security controls outside the ASVS framework.

---

## Usage Examples

### Example 1: Find All HIPAA-Relevant ASVS Requirements

Using the MCP tool `get_compliance_requirements`:

```typescript
{
  framework: "hipaa",
  level: 1,
  limit: 100
}
```

**Result:** Returns all Level 1 ASVS requirements that help meet HIPAA Security Rule obligations.

### Example 2: HIPAA Gap Analysis

Using the MCP tool `get_compliance_gap_analysis`:

```typescript
{
  frameworks: ["hipaa"],
  target_level: 2,
  implemented_requirements: []  // Starting from scratch
}
```

**Result:** Shows which ASVS requirements need to be implemented to achieve HIPAA compliance at Level 2.

### Example 3: Check HIPAA Coverage for ASVS Requirement

Using the MCP tool `map_requirement_to_compliance`:

```typescript
{
  requirement_id: "V15.1.1"
}
```

**Result:**
```json
{
  "requirement_id": "V15.1.1",
  "compliance_mappings": {
    "hipaa": [
      "§ 164.308(a)(1)(i)",    // Security Management Process
      "§ 164.316(b)(2)(i)",    // Documentation Retention
      "§ 164.530(e)(1)"        // Workforce Sanctions
    ]
  }
}
```

---

## Data Source & Validation

### Source File

- **Path:** `data/asvs-5.0.0-hipaa-mapping.json`
- **Created:** 2025-10-22
- **Source ASVS Version:** 4.0.3 (corrected and validated)
- **Target ASVS Version:** 5.0.0
- **Conversion:** Automated with 258-rule mapping dictionary
- **Validation:** 100% - All 102 mappings verified against ASVS 5.0.0

### Validation Steps

1. ✅ **Structural validation** - JSON schema correctness
2. ✅ **Reference validation** - All ASVS IDs exist in ASVS 5.0.0
3. ✅ **Mapping validation** - All HIPAA → ASVS mappings verified
4. ✅ **Bidirectional consistency** - ASVS → HIPAA index matches source
5. ✅ **Runtime testing** - Server loads and indexes data successfully

**Validation Script:** `scripts/validate-asvs5-hipaa-mappings.js`

---

## Comparison with Previous Version

| Aspect | ASVS 4.0.3 | ASVS 5.0.0 |
|--------|------------|------------|
| ASVS Chapters | 14 | 17 |
| ASVS Requirements | 286 | 345 |
| HIPAA Mappings | 102 (99 valid after correction) | 102 (100% valid) |
| Mapping Quality | 6 invalid mappings corrected | All mappings validated |
| Data Source | `asvs-4.0.3-hipaa-mapping.json` | `asvs-5.0.0-hipaa-mapping.json` |

**Key Changes in ASVS 5.0.0:**
- V1 (Architecture) → V15 (Secure Coding and Architecture)
- V2 (Authentication) → V6 (Authentication)
- V5 (Validation) → V1 (Encoding and Sanitization) - major reorg
- V6 (Cryptography) → V11 (Cryptography)
- New chapters: V3 (Web Frontend), V9 (Tokens), V10 (OAuth/OIDC), V17 (WebRTC)

---

## Performance

### Indexing Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Load HIPAA file | ~2-5ms | 76 requirements, 102 mappings |
| Build ASVS → HIPAA index | ~1-2ms | 48 ASVS reqs indexed |
| Enrich ASVS requirements | ~1-2ms | Populates compliance.hipaa |
| **Total overhead** | **~5-10ms** | Negligible impact on startup |

### Lookup Performance

- **ASVS → HIPAA lookup:** O(1) via Map index
- **HIPAA → ASVS lookup:** O(1) direct array access
- **Compliance queries:** O(n) where n = matching requirements (with pagination)

---

## Future Enhancements

### Potential Additions

1. **HIPAA-specific tool** - `get_hipaa_requirements` for querying HIPAA → ASVS direction
2. **Requirement details** - Include HIPAA requirement type (Required vs Addressable)
3. **Implementation specifications** - Surface HIPAA implementation specification details
4. **Coverage analysis** - Tool to analyze HIPAA coverage gaps by category
5. **Compliance reports** - Generate HIPAA compliance reports with evidence

### Compatibility

- ✅ **Backward compatible** - Existing tools continue to work
- ✅ **Non-breaking** - Server starts even if HIPAA file is missing
- ✅ **Graceful degradation** - Falls back to empty HIPAA data if load fails

---

## Testing

### Automated Tests

Run the integration test:

```bash
node scripts/test-hipaa-integration.js
```

**Test Coverage:**
1. ✅ HIPAA data loading
2. ✅ Bidirectional index building
3. ✅ Mapping validation (all 102 mappings)
4. ✅ ASVS → HIPAA lookups
5. ✅ HIPAA → ASVS lookups
6. ✅ Coverage statistics

### Manual Testing

Start the MCP server and test with Claude:

```bash
npm run build
node dist/index.js
```

Then in Claude Code:
- "Show me all ASVS Level 1 requirements that help meet HIPAA compliance"
- "What HIPAA requirements does ASVS V6.2.1 satisfy?"
- "Analyze my HIPAA compliance gaps for Level 2"

---

## Maintenance

### Updating Mappings

If HIPAA mappings need updates:

1. Edit `data/asvs-5.0.0-hipaa-mapping.json`
2. Run validation: `node scripts/validate-asvs5-hipaa-mappings.js`
3. Rebuild server: `npm run build`
4. Test: `node scripts/test-hipaa-integration.js`

### Conversion to Future ASVS Versions

When ASVS 6.0.0 is released:

1. Create new mapping dictionary (ASVS 5 → 6)
2. Run conversion script: `scripts/apply-asvs6-mappings.js`
3. Validate all mappings
4. Update server to load new file

---

## Credits

- **OWASP ASVS:** https://owasp.org/www-project-application-security-verification-standard/
- **HIPAA Security Rule:** 45 CFR Parts 160, 162, and 164
- **Mapping Validation:** Automated scripts with 100% verification
- **MCP Server:** https://github.com/clintcan/owasp-asvs-mcp-server

---

**End of Document**
