# ASVS Compliance Framework Mapping Audit Report

**Date:** 2025-10-22
**Auditor:** Claude Code
**Subject:** Verification of ASVS to Compliance Framework Mappings

## Executive Summary

This audit examined the compliance framework mappings (PCI DSS, HIPAA, GDPR, SOX, ISO 27001) in the OWASP ASVS MCP Server codebase against official OWASP sources and industry standards.

**Key Finding:** The compliance mappings in the codebase are **NOT** sourced from official OWASP ASVS 5.0 data, as **no compliance framework mappings exist in the official ASVS 5.0.0 specification**.

## Detailed Findings

### 1. Official ASVS 5.0.0 Data Structure

**Location:** `data/asvs-5.0.0.json`

**Fields Present:**
- `Shortcode` (requirement ID, e.g., "V1.1.1")
- `Ordinal` (ordering number)
- `Description` (requirement text)
- `L` (ASVS level: "1", "2", or "3")

**Fields NOT Present:**
- ❌ No `cwe` field
- ❌ No `nist` field
- ❌ No `compliance` object
- ❌ No `pci_dss` mappings
- ❌ No `hipaa` mappings
- ❌ No `gdpr` mappings
- ❌ No `sox` mappings
- ❌ No `iso27001` mappings

### 2. Codebase Implementation

**Location:** `src/index.ts` (lines 395-620)

The mock data includes hardcoded compliance mappings:

```typescript
compliance: {
  pci_dss: ["8.2.3", "8.2.4"],
  hipaa: ["164.308(a)(5)(ii)(D)"],
  gdpr: ["Article 32"],
  sox: [],
  iso27001: ["A.9.4.3"]
}
```

**Status:** These mappings are **fabricated for demonstration purposes only** and are not derived from official sources.

### 3. OWASP's Official Position on Mappings

Based on GitHub Issue #1167 (ASVS v5.0 - mappings to other standards):

1. **CWE and NIST Only:** ASVS 5.0 officially supports only CWE and NIST 800-53/800-63 mappings
2. **Moved to Separate Location:** Even these mappings were removed from the main document and placed in a separate folder
3. **Deferred to OpenCRE:** OWASP intentionally avoids maintaining compliance framework mappings to prevent duplication and synchronization issues
4. **OpenCRE Integration:** The project recommends using OpenCRE (Open Common Requirement Enumeration) at https://www.opencre.org for cross-standard mappings

### 4. What OpenCRE Provides

OpenCRE is a separate OWASP project that provides:
- Cross-standard mappings using transitivity principles
- Links between ASVS and various frameworks including:
  - ISO/IEC 27001
  - NIST SP 800-53
  - NIST SP 800-63b
  - PCI DSS
  - OWASP Top 10
  - OWASP Proactive Controls
  - CWE
  - CAPEC

**Important:** OpenCRE mappings are community-maintained and use algorithmic transitivity (if A→B and B→C, then A→C), which may not reflect direct, authoritative mappings.

### 5. Current Server Behavior

The MCP server's `parseASVSData()` function (src/index.ts:324-367) attempts to extract compliance data:

```typescript
cwe: item.CWE || item.cwe || [],
nist: item.NIST || item.nist || []
```

**Result:** These fields will always be empty arrays when loading from `data/asvs-5.0.0.json` because those fields don't exist in the source data.

The server then falls back to mock data which contains fabricated compliance mappings for demo purposes only.

## Compliance Mapping Accuracy Assessment

### Mock Data Mappings Review

I reviewed sample mappings in the mock data:

| Requirement | Current Mapping | Assessment |
|-------------|-----------------|------------|
| 2.1.1 (Password 12+ chars) | PCI DSS 8.2.3, 8.2.4 | ✅ Reasonable (PCI DSS has password requirements) |
| 2.1.1 | HIPAA 164.308(a)(5)(ii)(D) | ✅ Plausible (Technical safeguards) |
| 2.1.1 | GDPR Article 32 | ✅ Appropriate (Security measures) |
| 2.1.1 | ISO 27001 A.9.4.3 | ✅ Correct area (Password management) |
| 4.1.1 (Access control) | SOX "IT General Controls" | ✅ Reasonable general mapping |

**Note:** While these mappings are *conceptually reasonable*, they are not officially validated or maintained by OWASP and should be clearly marked as **illustrative/educational only**.

## Recommendations

### 1. Immediate Documentation Updates Required

**Update:** `README.md`, `CLAUDE.md`, and tool descriptions must include prominent disclaimers:

```
⚠️ DISCLAIMER: Compliance framework mappings (PCI DSS, HIPAA, GDPR, SOX, ISO 27001)
provided by this server are for ILLUSTRATIVE PURPOSES ONLY. They are not official
OWASP ASVS mappings and have not been validated by compliance auditors.

For authoritative compliance mappings:
- Use OpenCRE (https://www.opencre.org) for community-maintained cross-standard mappings
- Consult framework-specific documentation
- Engage qualified compliance professionals

These mappings should NOT be used as sole evidence for compliance assessments.
```

### 2. Add Data Source Transparency

The server already includes `_meta.data_source` in responses. Enhance this:

```typescript
_meta: {
  data_source: "embedded_mock_data",
  compliance_mappings_official: false,
  compliance_mappings_disclaimer: "Illustrative only - not validated for compliance use"
}
```

### 3. Consider Integration with OpenCRE

**Option A - Reference Only:**
Add tool descriptions that direct users to OpenCRE for official mappings:

```
Note: For validated compliance mappings, use OpenCRE at https://www.opencre.org
```

**Option B - Future Enhancement:**
Create an optional OpenCRE integration that fetches live mappings via API (if available).

### 4. Update Mock Data Disclaimer

In `src/index.ts` around line 381, add comment:

```typescript
/**
 * Mock data for demonstration purposes.
 *
 * IMPORTANT: The compliance mappings below are FABRICATED EXAMPLES for
 * illustrating the data structure. They are NOT official OWASP mappings
 * and should NOT be used for actual compliance assessments.
 *
 * Official ASVS 5.0 does not include compliance framework mappings.
 * For validated mappings, consult:
 * - OpenCRE: https://www.opencre.org
 * - Framework-specific documentation
 * - Qualified compliance professionals
 */
```

### 5. Consider Removing Compliance Features

**Alternative Approach:** Remove compliance mapping features entirely:

**Pros:**
- Eliminates risk of misuse
- Reduces maintenance burden
- Aligns with OWASP's official position

**Cons:**
- Reduces utility for users seeking guidance
- Removes valuable conceptual framework

**Recommendation:** Keep features but add strong disclaimers and rename tools to indicate educational purpose:
- `get_compliance_requirements` → `get_illustrative_compliance_mappings`
- `get_compliance_gap_analysis` → `get_illustrative_gap_analysis`

## Conclusion

The OWASP ASVS MCP Server provides useful compliance mapping features, but these mappings are not officially endorsed by OWASP and do not exist in the source ASVS 5.0.0 data. To maintain integrity and prevent misuse:

1. ✅ The mappings are conceptually reasonable for educational purposes
2. ❌ They are NOT official OWASP mappings
3. ❌ They should NOT be used as compliance evidence
4. ✅ Strong disclaimers are REQUIRED in all documentation
5. ✅ Consider integration with or references to OpenCRE for validated mappings

## References

1. **OWASP ASVS GitHub Repository:** https://github.com/OWASP/ASVS
2. **ASVS Issue #1167 (v5.0 mappings):** https://github.com/OWASP/ASVS/issues/1167
3. **OpenCRE (Common Requirement Enumeration):** https://www.opencre.org
4. **Security Compass ASVS-ISO 27001 Mapping:** https://www.securitycompass.com/whitepapers/mapping-security-requirements-to-standards-owasp-asvs-to-iso-27001/
5. **Pivot Point Security ASVS-ISO 27001 Alignment:** https://www.pivotpointsecurity.com/owasp-asvs-vs-iso-27001-alignment/

## Audit Trail

- **Data Source Examined:** `data/asvs-5.0.0.json`
- **Code Examined:** `src/index.ts` (lines 324-620, 822-1190)
- **External Sources Verified:** OWASP GitHub, OpenCRE, industry whitepapers
- **Verification Method:** Direct file inspection, web searches, official documentation review
