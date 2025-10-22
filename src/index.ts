#!/usr/bin/env node

/**
 * OWASP ASVS MCP Server
 * Provides AI-accessible tools for querying and recommending ASVS controls
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from "node-fetch";
import { readFileSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { OpenCREClient } from "./opencre-client.js";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration from environment variables
const USE_OPENCRE = process.env.ASVS_USE_OPENCRE === 'true'; // Enable OpenCRE ISO 27001 mappings

// Security constants - GENEROUS tier (for trusted/internal use)
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_QUERY_LENGTH = 5000;          // 5000 chars
const MAX_CATEGORY_LENGTH = 1000;       // 1000 chars
const MAX_ID_LENGTH = 200;              // 200 chars
const MAX_SEARCH_RESULTS = 500;         // 500 results (return all)
const MAX_TOKENIZE_LENGTH = 50000;      // 50,000 chars

// Types for ASVS data structure
interface ASVSRequirement {
  id: string;
  category: string;
  subcategory: string;
  description: string;
  level: number[];
  cwe?: string[];
  nist?: string[];
  compliance?: {
    pci_dss?: string[];
    hipaa?: string[];
    gdpr?: string[];
    sox?: string[];
    iso27001?: string[];
  };
}

interface ASVSCategory {
  id: string;
  name: string;
  requirements: ASVSRequirement[];
}

// Types for HIPAA mapping data
interface HIPAARequirement {
  id: string;
  level: string[];
  description: string;
  hipaa_reference: string;
  requirement_type: string;
  owasp_asvs_mapping: string[];
  implementation_specification?: string;
  asvs_coverage?: string;
  mapping_note?: string;
}

interface HIPAASection {
  section_id: string;
  section_title: string;
  requirements: HIPAARequirement[];
}

interface HIPAACategory {
  category_id: string;
  category_name: string;
  sections: HIPAASection[];
}

// Tool argument interfaces for type safety
interface GetRequirementsByLevelArgs {
  level: number;
  offset?: number;
  limit?: number;
}

interface GetRequirementsByCategoryArgs {
  category: string;
  level?: number;
  offset?: number;
  limit?: number;
}

interface GetRequirementDetailsArgs {
  requirement_id: string;
}

interface RecommendPriorityControlsArgs {
  target_level: number;
  current_level?: number;
  focus_areas?: string[];
  application_type?: string;
  offset?: number;
  limit?: number;
}

interface SearchRequirementsArgs {
  query: string;
  level?: number;
  offset?: number;
  limit?: number;
}

interface GetComplianceRequirementsArgs {
  framework: string;
  level?: number;
  offset?: number;
  limit?: number;
}

interface GetComplianceGapAnalysisArgs {
  frameworks: string[];
  target_level: number;
  implemented_requirements?: string[];
}

interface MapRequirementToComplianceArgs {
  requirement_id: string;
}

interface PrioritizedRequirement {
  requirement: ASVSRequirement;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  minLevel: number;
}

class ASVSServer {
  // Constants
  private static readonly FRAMEWORK_MAP: Readonly<Record<string, string>> = {
    pci_dss: "PCI DSS",
    hipaa: "HIPAA",
    gdpr: "GDPR",
    sox: "SOX",
    iso27001: "ISO 27001"
  } as const;

  private static readonly GENERAL_HIGH_PRIORITY_CATEGORIES = [
    "Authentication",
    "Access Control",
    "Session Management",
    "Validation, Sanitization and Encoding"
  ] as const;

  private static readonly COMPLIANCE_HIGH_PRIORITY_CATEGORIES = [
    "Authentication",
    "Access Control",
    "Data Protection",
    "Communication"
  ] as const;

  private server: Server;
  private asvsData: ASVSCategory[] = [];
  private dataLoaded: boolean = false;
  private opencreClient: OpenCREClient | null = null;

  // HIPAA mapping data
  private hipaaData: HIPAACategory[] = [];
  private hipaaLoaded: boolean = false;

  // Performance indexes for O(1) lookups
  private requirementIndex: Map<string, { requirement: ASVSRequirement; category: ASVSCategory }> = new Map();
  private categoryIndex: Map<string, ASVSCategory> = new Map();
  private searchIndex: Map<string, Set<string>> = new Map();
  private dataSource: 'local' | 'remote' | 'mock' = 'local';

  // HIPAA bidirectional index: ASVS ID → HIPAA requirements that map to it
  private asvsToHipaaIndex: Map<string, HIPAARequirement[]> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: "owasp-asvs-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize OpenCRE client if enabled
    if (USE_OPENCRE) {
      this.opencreClient = new OpenCREClient();
      console.error("OpenCRE integration enabled - ISO 27001 mappings will be fetched dynamically");
    } else {
      console.error("OpenCRE integration disabled - use ASVS_USE_OPENCRE=true to enable ISO 27001 mappings");
    }

    this.setupHandlers();
  }

  /**
   * Load official CWE and NIST mappings from OWASP ASVS repository
   * These are separate mapping files maintained by OWASP
   */
  private async loadMappings(): Promise<{ cwe: Record<string, string>; nist: Record<string, string[]> }> {
    const cweMappings: Record<string, string> = {};
    const nistMappings: Record<string, string[]> = {};

    try {
      // Load CWE mappings
      const cweFilePath = join(__dirname, '..', 'data', 'asvs-cwe-mapping.json');
      try {
        const cweContent = readFileSync(cweFilePath, 'utf-8');
        const cweData = JSON.parse(cweContent);

        // Convert v5.0.be-X.Y.Z format to X.Y.Z and VX.Y.Z formats for lookup
        for (const [key, value] of Object.entries(cweData)) {
          const match = key.match(/v5\.0\.be-(.+)/);
          if (match) {
            const idWithoutPrefix = match[1]; // e.g., "2.1.1"
            cweMappings[idWithoutPrefix] = String(value);
            cweMappings[`V${idWithoutPrefix}`] = String(value); // Also store with "V" prefix
          }
        }
        console.error(`Loaded ${Object.keys(cweMappings).length / 2} CWE mappings from official OWASP source`);
      } catch (error) {
        console.error("Failed to load CWE mappings:", error);
      }

      // Load NIST mappings
      const nistFilePath = join(__dirname, '..', 'data', 'asvs-nist-mapping.json');
      try {
        const nistContent = readFileSync(nistFilePath, 'utf-8');
        const nistData = JSON.parse(nistContent);

        // Data is in format "X.Y.Z" -> [NIST sections]
        // Add both with and without "V" prefix for compatibility
        for (const [key, value] of Object.entries(nistData)) {
          nistMappings[key] = value as string[];
          nistMappings[`V${key}`] = value as string[]; // Also store with "V" prefix
        }
        console.error(`Loaded ${Object.keys(nistMappings).length / 2} NIST mappings from official OWASP source`);
      } catch (error) {
        console.error("Failed to load NIST mappings:", error);
      }
    } catch (error) {
      console.error("Error loading mapping files:", error);
    }

    return { cwe: cweMappings, nist: nistMappings };
  }

  /**
   * Load HIPAA to ASVS 5.0.0 mapping data
   * This provides validated mappings from HIPAA requirements to ASVS controls
   */
  private async loadHIPAAMappings(): Promise<void> {
    if (this.hipaaLoaded) return;

    try {
      const hipaaFilePath = join(__dirname, '..', 'data', 'asvs-5.0.0-hipaa-mapping.json');

      try {
        // Security: Check file size before reading
        const stats = statSync(hipaaFilePath);
        if (stats.size > MAX_FILE_SIZE) {
          throw new Error(`HIPAA mapping file exceeds maximum allowed size (${MAX_FILE_SIZE} bytes)`);
        }

        const fileContent = readFileSync(hipaaFilePath, 'utf-8');
        const data = JSON.parse(fileContent);

        // Store the complete HIPAA data
        this.hipaaData = data.categories || [];

        // Build bidirectional index for quick ASVS → HIPAA lookups
        this.buildHIPAAIndex();

        // Also populate the compliance.hipaa field in ASVS requirements
        this.enrichASVSWithHIPAAMappings();

        console.error(`Loaded HIPAA mappings: ${this.countHIPAARequirements()} HIPAA requirements mapped to ASVS 5.0.0`);
        this.hipaaLoaded = true;
      } catch (fileError) {
        console.error("HIPAA mapping file not found, HIPAA compliance tools will have limited data:", fileError);
      }
    } catch (error) {
      console.error("Error loading HIPAA mappings:", error);
    }
  }

  /**
   * Build index: ASVS requirement ID → HIPAA requirements that reference it
   */
  private buildHIPAAIndex(): void {
    this.asvsToHipaaIndex.clear();

    for (const category of this.hipaaData) {
      for (const section of category.sections) {
        for (const hipaaReq of section.requirements) {
          // Each HIPAA requirement may map to multiple ASVS requirements
          for (const asvsMapping of hipaaReq.owasp_asvs_mapping || []) {
            // Convert "v5.0.0-1.2.3" to "V1.2.3"
            const asvsId = 'V' + asvsMapping.replace('v5.0.0-', '');

            if (!this.asvsToHipaaIndex.has(asvsId)) {
              this.asvsToHipaaIndex.set(asvsId, []);
            }
            this.asvsToHipaaIndex.get(asvsId)!.push(hipaaReq);
          }
        }
      }
    }

    console.error(`Built HIPAA index: ${this.asvsToHipaaIndex.size} ASVS requirements have HIPAA mappings`);
  }

  /**
   * Enrich ASVS requirements with HIPAA compliance references
   */
  private enrichASVSWithHIPAAMappings(): void {
    for (const category of this.asvsData) {
      for (const asvsReq of category.requirements) {
        const hipaaRefs = this.asvsToHipaaIndex.get(asvsReq.id);
        if (hipaaRefs && hipaaRefs.length > 0) {
          if (!asvsReq.compliance) {
            asvsReq.compliance = {};
          }
          // Store HIPAA requirement IDs and references
          asvsReq.compliance.hipaa = hipaaRefs.map(h => h.hipaa_reference);
        }
      }
    }
  }

  /**
   * Count total HIPAA requirements
   */
  private countHIPAARequirements(): number {
    let count = 0;
    for (const category of this.hipaaData) {
      for (const section of category.sections) {
        count += section.requirements.length;
      }
    }
    return count;
  }

  private async loadASVSData(): Promise<void> {
    if (this.dataLoaded) return;

    try {
      // Load CWE and NIST mappings first
      const mappings = await this.loadMappings();

      // Try to load from local file first (much faster!)
      const localFilePath = join(__dirname, '..', 'data', 'asvs-5.0.0.json');

      try {
        // Security: Check file size before reading to prevent DoS
        const stats = statSync(localFilePath);
        if (stats.size > MAX_FILE_SIZE) {
          throw new Error(`ASVS data file exceeds maximum allowed size (${MAX_FILE_SIZE} bytes)`);
        }

        const fileContent = readFileSync(localFilePath, 'utf-8');
        const data = JSON.parse(fileContent);
        this.asvsData = this.parseASVSData(data, mappings);
        this.dataSource = 'local';
        console.error("ASVS data loaded from local file (fast path)");
      } catch (fileError) {
        // Fallback to remote if local file doesn't exist or is invalid
        console.error("Local file not found, fetching from remote:", fileError);

        // Fetch ASVS 5.0 data from official OWASP repository
        const url = "https://raw.githubusercontent.com/OWASP/ASVS/refs/heads/master/5.0/docs_en/OWASP_Application_Security_Verification_Standard_5.0.0_en.json";
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        // Security: Check Content-Length before downloading
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
          throw new Error(`Remote data exceeds maximum allowed size (${MAX_FILE_SIZE} bytes)`);
        }

        const data = await response.json() as any;
        this.asvsData = this.parseASVSData(data, mappings);
        this.dataSource = 'remote';
        console.error("ASVS data loaded from remote source");
      }

    } catch (error) {
      console.error("Failed to load ASVS data, using mock data:", error);
      this.asvsData = this.getMockData();
      this.dataSource = 'mock';
    }

    this.dataLoaded = true;
    // Build performance indexes
    this.buildIndexes();

    // Load HIPAA mappings after ASVS data is loaded
    await this.loadHIPAAMappings();
  }

  private buildIndexes(): void {
    this.buildRequirementIndex();
    this.buildCategoryIndex();
    this.buildSearchIndex();
  }

  private buildRequirementIndex(): void {
    this.requirementIndex.clear();
    for (const category of this.asvsData) {
      for (const req of category.requirements) {
        this.requirementIndex.set(req.id, { requirement: req, category });
      }
    }
  }

  private buildCategoryIndex(): void {
    this.categoryIndex.clear();
    for (const category of this.asvsData) {
      const normalizedName = category.name.toLowerCase();
      this.categoryIndex.set(normalizedName, category);
      this.categoryIndex.set(category.id.toLowerCase(), category);
    }
  }

  private buildSearchIndex(): void {
    this.searchIndex.clear();
    for (const category of this.asvsData) {
      for (const req of category.requirements) {
        const tokens = new Set([
          ...this.tokenize(req.description),
          ...this.tokenize(req.category),
          ...this.tokenize(req.id),
          ...(req.cwe || []).flatMap(c => this.tokenize(c))
        ]);

        for (const token of tokens) {
          if (!this.searchIndex.has(token)) {
            this.searchIndex.set(token, new Set());
          }
          this.searchIndex.get(token)!.add(req.id);
        }
      }
    }
  }

  private tokenize(text: string | number): string[] {
    // Convert to string if it's a number
    const textStr = String(text);

    // Security: Limit input length to prevent ReDoS
    const safeText = textStr.length > MAX_TOKENIZE_LENGTH
      ? textStr.substring(0, MAX_TOKENIZE_LENGTH)
      : textStr;

    return safeText.toLowerCase()
      .split(/\W+/)
      .filter(t => t.length > 2 && t.length < 100); // Also limit individual token length
  }

  // Helper methods
  private createTextResponse(data: any): { content: Array<{ type: string; text: string }> } {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          ...data,
          _meta: {
            data_source: this.dataSource,
            version: '5.0.0',
            hipaa_mappings_loaded: this.hipaaLoaded,
            hipaa_requirements_count: this.hipaaLoaded ? this.countHIPAARequirements() : 0,
            mappings: {
              cwe_source: 'OWASP ASVS 5.0 official CWE mapping',
              nist_source: 'OWASP ASVS 5.0 official NIST 800-63B mapping',
              hipaa_source: this.hipaaLoaded ? 'Validated HIPAA to ASVS 5.0.0 mappings (data/asvs-5.0.0-hipaa-mapping.json)' : 'Not loaded',
              compliance_note: 'HIPAA mappings are validated and based on official HIPAA Security Rule requirements. Other compliance framework mappings (PCI DSS, GDPR, SOX, ISO 27001) are illustrative examples only. For additional validated mappings, consult OpenCRE (https://www.opencre.org) or qualified compliance professionals.'
            }
          }
        }, null, 2)
      }]
    };
  }

  private applyPagination<T>(
    items: T[],
    offset: number = 0,
    limit: number = 100
  ): { items: T[], pagination: { offset: number, limit: number, total: number, returned: number, hasMore: boolean } } {
    // Security: Validate pagination parameters
    const safeOffset = Math.max(0, Math.min(offset, items.length));
    const safeLimit = Math.max(1, Math.min(limit, 500)); // Max 500 items per page

    const paginatedItems = items.slice(safeOffset, safeOffset + safeLimit);

    return {
      items: paginatedItems,
      pagination: {
        offset: safeOffset,
        limit: safeLimit,
        total: items.length,
        returned: paginatedItems.length,
        hasMore: safeOffset + paginatedItems.length < items.length
      }
    };
  }

  private createErrorResponse(message: string): { content: Array<{ type: string; text: string }>; isError: boolean } {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({ error: message }, null, 2)
      }],
      isError: true
    };
  }

  private parseASVSData(
    data: any,
    mappings?: { cwe: Record<string, string>; nist: Record<string, string[]> }
  ): ASVSCategory[] {
    // Parse the ASVS JSON structure into our format
    const categories: ASVSCategory[] = [];

    // Handle both capital 'Requirements' (ASVS 4.0.3) and lowercase 'requirements' (ASVS 5.0)
    const requirementsArray = data.Requirements || data.requirements || [];

    for (const category of requirementsArray) {
      const categoryName = category.Name || category.name || category.title || '';
      const categoryId = category.Shortcode || category.shortcode || category.chapter || '';
      const allRequirements: any[] = [];

      // ASVS 4.0.3 has nested structure: Requirements -> Sections -> Items
      // Each category has Items which are sections, and each section has Items which are requirements
      const sections = category.Items || category.items || [];

      for (const section of sections) {
        const sectionName = section.Name || section.name || '';
        const items = section.Items || section.items || [];

        for (const item of items) {
          const requirementId = item.Shortcode || item.shortcode || item.id || item.req_id || '';

          // Try to get mappings from official OWASP mapping files
          const cweMapping = mappings?.cwe?.[requirementId];
          const nistMapping = mappings?.nist?.[requirementId];

          allRequirements.push({
            id: requirementId,
            category: categoryName,
            subcategory: sectionName,
            description: item.Description || item.description || item.requirement || '',
            level: this.extractLevels(item),
            // Use official mappings if available, otherwise check inline data, fallback to empty array
            cwe: cweMapping ? [`CWE-${cweMapping}`] : (item.CWE || item.cwe || []),
            nist: nistMapping || (item.NIST || item.nist || [])
          });
        }
      }

      if (allRequirements.length > 0) {
        categories.push({
          id: categoryId,
          name: categoryName,
          requirements: allRequirements
        });
      }
    }

    return categories;
  }

  private extractLevels(item: any): number[] {
    const levels: number[] = [];

    // ASVS 4.0.3 format: { L1: { Required: true/false }, L2: {...}, L3: {...} }
    // ASVS 5.0 format: level_1: true/false, level_2: true/false, level_3: true/false
    if ((item.L1 && item.L1.Required === true) || item.level_1 === true) levels.push(1);
    if ((item.L2 && item.L2.Required === true) || item.level_2 === true) levels.push(2);
    if ((item.L3 && item.L3.Required === true) || item.level_3 === true) levels.push(3);

    return levels.length > 0 ? levels : [1, 2, 3];
  }

  private getMockData(): ASVSCategory[] {
    return [
      {
        id: "V2",
        name: "Authentication",
        requirements: [
          {
            id: "2.1.1",
            category: "Authentication",
            subcategory: "Password Security",
            description: "Verify that user set passwords are at least 12 characters in length.",
            level: [1, 2, 3],
            cwe: ["CWE-521"],
            nist: ["SP800-63B"],
            compliance: {
              pci_dss: ["8.2.3", "8.2.4"],
              hipaa: ["164.308(a)(5)(ii)(D)"],
              gdpr: ["Article 32"],
              sox: [],
              iso27001: ["A.9.4.3"]
            }
          },
          {
            id: "2.1.7",
            category: "Authentication",
            subcategory: "Password Security",
            description: "Verify that passwords submitted during account registration, login, and password change are checked against a set of breached passwords.",
            level: [2, 3],
            cwe: ["CWE-521"],
            nist: [],
            compliance: {
              pci_dss: ["8.2.1"],
              hipaa: ["164.308(a)(5)(ii)(D)"],
              gdpr: ["Article 32"],
              sox: [],
              iso27001: ["A.9.4.3"]
            }
          },
          {
            id: "2.2.1",
            category: "Authentication",
            subcategory: "MFA",
            description: "Verify that anti-automation controls are effective at mitigating breached credential testing, brute force, and account lockout attacks.",
            level: [1, 2, 3],
            cwe: ["CWE-307"],
            nist: [],
            compliance: {
              pci_dss: ["8.2.4", "8.2.5"],
              hipaa: ["164.312(a)(1)"],
              gdpr: ["Article 32"],
              sox: [],
              iso27001: ["A.9.4.2"]
            }
          }
        ]
      },
      {
        id: "V3",
        name: "Session Management",
        requirements: [
          {
            id: "3.2.1",
            category: "Session Management",
            subcategory: "Session Binding",
            description: "Verify the application generates a new session token on user authentication.",
            level: [1, 2, 3],
            cwe: ["CWE-384"],
            nist: [],
            compliance: {
              pci_dss: ["6.5.10"],
              hipaa: ["164.312(a)(1)"],
              gdpr: ["Article 32"],
              sox: [],
              iso27001: ["A.9.4.2"]
            }
          },
          {
            id: "3.3.1",
            category: "Session Management",
            subcategory: "Session Logout",
            description: "Verify that logout and expiration invalidate the session token.",
            level: [1, 2, 3],
            cwe: ["CWE-613"],
            nist: [],
            compliance: {
              pci_dss: ["6.5.10", "8.1.8"],
              hipaa: ["164.312(a)(1)"],
              gdpr: ["Article 32"],
              sox: [],
              iso27001: ["A.9.4.2"]
            }
          }
        ]
      },
      {
        id: "V4",
        name: "Access Control",
        requirements: [
          {
            id: "4.1.1",
            category: "Access Control",
            subcategory: "General Access Control",
            description: "Verify that the application enforces access control rules on a trusted service layer.",
            level: [1, 2, 3],
            cwe: ["CWE-602"],
            nist: [],
            compliance: {
              pci_dss: ["6.5.8", "7.1"],
              hipaa: ["164.308(a)(4)", "164.312(a)(1)"],
              gdpr: ["Article 32"],
              sox: ["IT General Controls"],
              iso27001: ["A.9.4.1"]
            }
          },
          {
            id: "4.2.1",
            category: "Access Control",
            subcategory: "Operation Level",
            description: "Verify that sensitive data and APIs are protected against Insecure Direct Object Reference (IDOR) attacks.",
            level: [1, 2, 3],
            cwe: ["CWE-639"],
            nist: [],
            compliance: {
              pci_dss: ["6.5.8"],
              hipaa: ["164.308(a)(4)", "164.312(a)(1)"],
              gdpr: ["Article 32"],
              sox: [],
              iso27001: ["A.9.4.1"]
            }
          }
        ]
      },
      {
        id: "V5",
        name: "Validation, Sanitization and Encoding",
        requirements: [
          {
            id: "5.1.1",
            category: "Input Validation",
            subcategory: "Input Validation",
            description: "Verify that the application has defenses against HTTP parameter pollution attacks.",
            level: [1, 2, 3],
            cwe: ["CWE-235"],
            nist: [],
            compliance: {
              pci_dss: ["6.5.1"],
              hipaa: ["164.308(a)(1)(ii)(B)"],
              gdpr: ["Article 32"],
              sox: [],
              iso27001: ["A.14.2.1"]
            }
          },
          {
            id: "5.2.1",
            category: "Sanitization and Sandboxing",
            subcategory: "Sanitization",
            description: "Verify that all untrusted HTML input is sanitized using a vetted library or framework feature.",
            level: [1, 2, 3],
            cwe: ["CWE-116"],
            nist: [],
            compliance: {
              pci_dss: ["6.5.7"],
              hipaa: ["164.308(a)(1)(ii)(B)"],
              gdpr: ["Article 32"],
              sox: [],
              iso27001: ["A.14.2.1"]
            }
          }
        ]
      },
      {
        id: "V7",
        name: "Error Handling and Logging",
        requirements: [
          {
            id: "7.1.1",
            category: "Error Handling",
            subcategory: "Log Content",
            description: "Verify that the application does not log credentials or payment details.",
            level: [1, 2, 3],
            cwe: ["CWE-532"],
            nist: [],
            compliance: {
              pci_dss: ["3.2", "10.2"],
              hipaa: ["164.308(a)(1)(ii)(D)", "164.312(b)"],
              gdpr: ["Article 32"],
              sox: ["IT General Controls"],
              iso27001: ["A.12.4.1"]
            }
          },
          {
            id: "7.4.1",
            category: "Error Handling",
            subcategory: "Error Handling",
            description: "Verify that a generic message is shown when an unexpected or security sensitive error occurs.",
            level: [1, 2, 3],
            cwe: ["CWE-210"],
            nist: [],
            compliance: {
              pci_dss: ["6.5.5"],
              hipaa: ["164.308(a)(1)(ii)(B)"],
              gdpr: ["Article 32"],
              sox: [],
              iso27001: ["A.12.4.1"]
            }
          }
        ]
      },
      {
        id: "V8",
        name: "Data Protection",
        requirements: [
          {
            id: "8.2.1",
            category: "Data Protection",
            subcategory: "Client-side Data Protection",
            description: "Verify the application sets sufficient anti-caching headers so that sensitive data is not cached in modern browsers.",
            level: [1, 2, 3],
            cwe: ["CWE-525"],
            nist: [],
            compliance: {
              pci_dss: ["3.4"],
              hipaa: ["164.312(a)(2)(iv)"],
              gdpr: ["Article 32"],
              sox: [],
              iso27001: ["A.8.2.3"]
            }
          },
          {
            id: "8.3.4",
            category: "Data Protection",
            subcategory: "Sensitive Private Data",
            description: "Verify that sensitive data is sent to the server in the HTTP message body or headers and that query string parameters from any HTTP verb do not contain sensitive data.",
            level: [1, 2, 3],
            cwe: ["CWE-319"],
            nist: [],
            compliance: {
              pci_dss: ["4.1"],
              hipaa: ["164.312(e)(1)"],
              gdpr: ["Article 32"],
              sox: [],
              iso27001: ["A.10.1.1"]
            }
          }
        ]
      },
      {
        id: "V9",
        name: "Communication",
        requirements: [
          {
            id: "9.1.1",
            category: "Communication",
            subcategory: "Client Communication Security",
            description: "Verify that TLS is used for all client connectivity, and does not fall back to insecure or unencrypted communications.",
            level: [1, 2, 3],
            cwe: ["CWE-319"],
            nist: [],
            compliance: {
              pci_dss: ["4.1", "2.3"],
              hipaa: ["164.312(e)(1)"],
              gdpr: ["Article 32"],
              sox: [],
              iso27001: ["A.13.1.1"]
            }
          },
          {
            id: "9.2.1",
            category: "Communication",
            subcategory: "Server Communication Security",
            description: "Verify that connections to and from the server use trusted TLS certificates.",
            level: [2, 3],
            cwe: ["CWE-295"],
            nist: [],
            compliance: {
              pci_dss: ["4.1"],
              hipaa: ["164.312(e)(1)"],
              gdpr: ["Article 32"],
              sox: [],
              iso27001: ["A.13.1.1"]
            }
          }
        ]
      }
    ];
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "get_requirements_by_level",
          description: "Get all ASVS requirements for a specific verification level (L1, L2, or L3). L1 is for all applications, L2 for applications handling sensitive data, L3 for critical applications. Supports pagination for large result sets.",
          inputSchema: {
            type: "object",
            properties: {
              level: {
                type: "number",
                description: "Verification level (1, 2, or 3)",
                enum: [1, 2, 3]
              },
              offset: {
                type: "number",
                description: "Optional: number of results to skip (default: 0). Use for pagination.",
                default: 0
              },
              limit: {
                type: "number",
                description: "Optional: maximum number of results to return (default: 100, max: 500). Use for pagination.",
                default: 100
              }
            },
            required: ["level"]
          }
        },
        {
          name: "get_requirements_by_category",
          description: "Get all ASVS requirements for a specific category (e.g., Authentication, Session Management, Access Control, etc.). Supports pagination for large result sets.",
          inputSchema: {
            type: "object",
            properties: {
              category: {
                type: "string",
                description: "Category name (e.g., 'Authentication', 'Session Management', 'Access Control', 'Validation, Sanitization and Encoding', 'Error Handling and Logging')"
              },
              level: {
                type: "number",
                description: "Optional: filter by verification level (1, 2, or 3)",
                enum: [1, 2, 3]
              },
              offset: {
                type: "number",
                description: "Optional: number of results to skip (default: 0). Use for pagination.",
                default: 0
              },
              limit: {
                type: "number",
                description: "Optional: maximum number of results to return (default: 100, max: 500). Use for pagination.",
                default: 100
              }
            },
            required: ["category"]
          }
        },
        {
          name: "get_requirement_details",
          description: "Get detailed information about a specific ASVS requirement by its ID (e.g., '2.1.1', '3.2.1')",
          inputSchema: {
            type: "object",
            properties: {
              requirement_id: {
                type: "string",
                description: "ASVS requirement ID (e.g., '2.1.1')"
              }
            },
            required: ["requirement_id"]
          }
        },
        {
          name: "recommend_priority_controls",
          description: "Get prioritized security control recommendations based on application context, current security level, and specific concerns. Returns high-priority requirements that should be implemented first. Supports pagination for large result sets.",
          inputSchema: {
            type: "object",
            properties: {
              target_level: {
                type: "number",
                description: "Target verification level (1, 2, or 3)",
                enum: [1, 2, 3]
              },
              current_level: {
                type: "number",
                description: "Current verification level (0, 1, or 2)",
                enum: [0, 1, 2]
              },
              focus_areas: {
                type: "array",
                items: { type: "string" },
                description: "Optional: specific areas of concern (e.g., ['Authentication', 'Access Control'])"
              },
              application_type: {
                type: "string",
                description: "Type of application (e.g., 'web', 'api', 'mobile', 'financial', 'healthcare')"
              },
              offset: {
                type: "number",
                description: "Optional: number of results to skip (default: 0). Use for pagination.",
                default: 0
              },
              limit: {
                type: "number",
                description: "Optional: maximum number of results to return (default: 50, max: 500). Use for pagination.",
                default: 50
              }
            },
            required: ["target_level"]
          }
        },
        {
          name: "search_requirements",
          description: "Search ASVS requirements by keyword or description text. Useful for finding requirements related to specific security concerns or vulnerabilities. Supports pagination for large result sets.",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query (e.g., 'password', 'SQL injection', 'XSS')"
              },
              level: {
                type: "number",
                description: "Optional: filter by verification level",
                enum: [1, 2, 3]
              },
              offset: {
                type: "number",
                description: "Optional: number of results to skip (default: 0). Use for pagination.",
                default: 0
              },
              limit: {
                type: "number",
                description: "Optional: maximum number of results to return (default: 50, max: 500). Use for pagination.",
                default: 50
              }
            },
            required: ["query"]
          }
        },
        {
          name: "get_category_summary",
          description: "Get a summary of all ASVS categories with requirement counts and descriptions",
          inputSchema: {
            type: "object",
            properties: {}
          }
        },
        {
          name: "get_compliance_requirements",
          description: "Get ASVS requirements mapped to specific compliance frameworks (PCI DSS, HIPAA, GDPR, SOX, ISO 27001). Useful for understanding which ASVS controls help meet regulatory requirements. Supports pagination for large result sets.",
          inputSchema: {
            type: "object",
            properties: {
              framework: {
                type: "string",
                description: "Compliance framework",
                enum: ["pci_dss", "hipaa", "gdpr", "sox", "iso27001"]
              },
              level: {
                type: "number",
                description: "Optional: filter by ASVS level (1, 2, or 3)",
                enum: [1, 2, 3]
              },
              offset: {
                type: "number",
                description: "Optional: number of results to skip (default: 0). Use for pagination.",
                default: 0
              },
              limit: {
                type: "number",
                description: "Optional: maximum number of results to return (default: 100, max: 500). Use for pagination.",
                default: 100
              }
            },
            required: ["framework"]
          }
        },
        {
          name: "get_compliance_gap_analysis",
          description: "Analyze gaps between current implementation and compliance requirements. Shows which ASVS requirements are needed for specific compliance frameworks.",
          inputSchema: {
            type: "object",
            properties: {
              frameworks: {
                type: "array",
                items: {
                  type: "string",
                  enum: ["pci_dss", "hipaa", "gdpr", "sox", "iso27001"]
                },
                description: "List of compliance frameworks to analyze"
              },
              target_level: {
                type: "number",
                description: "Target ASVS level (1, 2, or 3)",
                enum: [1, 2, 3]
              },
              implemented_requirements: {
                type: "array",
                items: { type: "string" },
                description: "List of ASVS requirement IDs already implemented (e.g., ['2.1.1', '3.2.1'])"
              }
            },
            required: ["frameworks", "target_level"]
          }
        },
        {
          name: "map_requirement_to_compliance",
          description: "Show which compliance frameworks a specific ASVS requirement helps satisfy. Useful for understanding the regulatory impact of implementing a control.",
          inputSchema: {
            type: "object",
            properties: {
              requirement_id: {
                type: "string",
                description: "ASVS requirement ID (e.g., '2.1.1')"
              }
            },
            required: ["requirement_id"]
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      await this.loadASVSData();

      const args = request.params.arguments || {};

      switch (request.params.name) {
        case "get_requirements_by_level":
          return this.getRequirementsByLevel(args as unknown as GetRequirementsByLevelArgs);

        case "get_requirements_by_category":
          return this.getRequirementsByCategory(args as unknown as GetRequirementsByCategoryArgs);

        case "get_requirement_details":
          return this.getRequirementDetails(args as unknown as GetRequirementDetailsArgs);

        case "recommend_priority_controls":
          return this.recommendPriorityControls(args as unknown as RecommendPriorityControlsArgs);

        case "search_requirements":
          return this.searchRequirements(args as unknown as SearchRequirementsArgs);

        case "get_category_summary":
          return this.getCategorySummary();

        case "get_compliance_requirements":
          return this.getComplianceRequirements(args as unknown as GetComplianceRequirementsArgs);

        case "get_compliance_gap_analysis":
          return this.getComplianceGapAnalysis(args as unknown as GetComplianceGapAnalysisArgs);

        case "map_requirement_to_compliance":
          return this.mapRequirementToCompliance(args as unknown as MapRequirementToComplianceArgs);

        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });
  }

  private getRequirementsByLevel(args: GetRequirementsByLevelArgs) {
    const { level, offset, limit } = args;

    if (![1, 2, 3].includes(level)) {
      return this.createErrorResponse(`Invalid level: ${level}. Must be 1, 2, or 3.`);
    }

    const requirements: ASVSRequirement[] = [];
    for (const category of this.asvsData) {
      for (const req of category.requirements) {
        if (req.level.includes(level)) {
          requirements.push(req);
        }
      }
    }

    const paginated = this.applyPagination(requirements, offset, limit);

    return this.createTextResponse({
      level: `L${level}`,
      ...paginated.pagination,
      requirements: paginated.items
    });
  }

  private getRequirementsByCategory(args: GetRequirementsByCategoryArgs) {
    const { category: categoryName, level, offset, limit } = args;

    // Security: Validate input length
    if (categoryName.length > MAX_CATEGORY_LENGTH) {
      return this.createErrorResponse(`Category name too long (max ${MAX_CATEGORY_LENGTH} characters)`);
    }

    const normalized = categoryName.toLowerCase();

    // Try to find using index first
    let category = this.categoryIndex.get(normalized);

    // Fallback to partial match
    if (!category) {
      for (const [key, cat] of this.categoryIndex.entries()) {
        if (key.includes(normalized) || normalized.includes(key)) {
          category = cat;
          break;
        }
      }
    }

    if (!category) {
      return this.createErrorResponse(
        `Category '${categoryName}' not found. Available categories: ${this.asvsData.map(c => c.name).join(', ')}`
      );
    }

    let requirements = category.requirements;
    if (level) {
      requirements = requirements.filter(r => r.level.includes(level));
    }

    const paginated = this.applyPagination(requirements, offset, limit);

    return this.createTextResponse({
      category: category.name,
      id: category.id,
      ...paginated.pagination,
      requirements: paginated.items
    });
  }

  private getRequirementDetails(args: GetRequirementDetailsArgs) {
    const { requirement_id: reqId } = args;

    // Security: Validate input length
    if (reqId.length > MAX_ID_LENGTH) {
      return this.createErrorResponse(`Requirement ID too long (max ${MAX_ID_LENGTH} characters)`);
    }

    const indexed = this.requirementIndex.get(reqId);

    if (indexed) {
      return this.createTextResponse({
        requirement: indexed.requirement,
        category_name: indexed.category.name,
        category_id: indexed.category.id
      });
    }

    return this.createErrorResponse(`Requirement '${reqId}' not found.`);
  }

  private recommendPriorityControls(args: RecommendPriorityControlsArgs) {
    const { target_level: targetLevel, current_level = 0, focus_areas = [], application_type: appType, offset, limit } = args;

    const recommendations: PrioritizedRequirement[] = [];

    // Get requirements for target level that are above current level
    for (const category of this.asvsData) {
      const isHighPriority = ASVSServer.GENERAL_HIGH_PRIORITY_CATEGORIES.some(hpc =>
        category.name.includes(hpc)
      );

      const isFocusArea = focus_areas.length === 0 || focus_areas.some(fa =>
        category.name.toLowerCase().includes(fa.toLowerCase())
      );

      if (!isFocusArea && focus_areas.length > 0) continue;

      for (const req of category.requirements) {
        if (req.level.includes(targetLevel)) {
          const minLevel = Math.min(...req.level);
          if (minLevel > current_level) {
            recommendations.push({
              requirement: req,
              priority: isHighPriority ? "HIGH" : "MEDIUM",
              minLevel
            });
          }
        }
      }
    }

    // Sort by priority and level using cached minLevel
    recommendations.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority === "HIGH" ? -1 : 1;
      }
      return a.minLevel - b.minLevel;
    });

    const recommendationsWithPriority = recommendations.map(r => ({
      ...r.requirement,
      priority: r.priority
    }));

    const paginated = this.applyPagination(recommendationsWithPriority, offset, limit ?? 50);

    return this.createTextResponse({
      target_level: `L${targetLevel}`,
      current_level: `L${current_level}`,
      application_type: appType,
      focus_areas,
      ...paginated.pagination,
      recommendations: paginated.items
    });
  }

  private searchRequirements(args: SearchRequirementsArgs) {
    const { query, level, offset, limit } = args;

    // Security: Validate query length
    if (query.length > MAX_QUERY_LENGTH) {
      return this.createErrorResponse(`Query too long (max ${MAX_QUERY_LENGTH} characters)`);
    }

    const queryTokens = this.tokenize(query);
    const matchingIds = new Set<string>();

    // Find requirements matching any token using search index
    for (const token of queryTokens) {
      const ids = this.searchIndex.get(token);
      if (ids) {
        ids.forEach(id => matchingIds.add(id));
      }
    }

    // Get full requirements using requirement index
    const results: ASVSRequirement[] = [];
    for (const id of matchingIds) {
      const indexed = this.requirementIndex.get(id);
      if (indexed && (!level || indexed.requirement.level.includes(level))) {
        results.push(indexed.requirement);
      }
    }

    const paginated = this.applyPagination(results, offset, limit ?? 50);

    return this.createTextResponse({
      query,
      ...paginated.pagination,
      results: paginated.items
    });
  }

  private getCategorySummary() {
    const summary = this.asvsData.map(category => {
      const counts = { l1: 0, l2: 0, l3: 0 };

      // Single pass through requirements
      category.requirements.forEach(r => {
        if (r.level.includes(1)) counts.l1++;
        if (r.level.includes(2)) counts.l2++;
        if (r.level.includes(3)) counts.l3++;
      });

      return {
        id: category.id,
        name: category.name,
        requirement_count: category.requirements.length,
        l1_requirements: counts.l1,
        l2_requirements: counts.l2,
        l3_requirements: counts.l3
      };
    });

    return this.createTextResponse({
      total_categories: summary.length,
      categories: summary
    });
  }

  private getComplianceRequirements(args: GetComplianceRequirementsArgs) {
    const { framework, level, offset, limit } = args;

    const results: Array<ASVSRequirement & { compliance_references: string[] }> = [];

    for (const category of this.asvsData) {
      for (const req of category.requirements) {
        if (level && !req.level.includes(level)) continue;

        const complianceRefs = req.compliance?.[framework as keyof typeof req.compliance];
        if (complianceRefs && complianceRefs.length > 0) {
          results.push({
            ...req,
            compliance_references: complianceRefs
          });
        }
      }
    }

    const paginated = this.applyPagination(results, offset, limit);

    return this.createTextResponse({
      framework: ASVSServer.FRAMEWORK_MAP[framework] || framework,
      framework_key: framework,
      level: level ? `L${level}` : "All levels",
      ...paginated.pagination,
      requirements: paginated.items
    });
  }

  private getComplianceGapAnalysis(args: GetComplianceGapAnalysisArgs) {
    const { frameworks, target_level: targetLevel, implemented_requirements = [] } = args;
    const implemented = new Set(implemented_requirements);

    const gaps: Record<string, any[]> = {};
    const coverage: Record<string, { total: number; implemented: number; missing: number }> = {};

    // Initialize structures
    for (const framework of frameworks) {
      gaps[framework] = [];
      coverage[framework] = { total: 0, implemented: 0, missing: 0 };
    }

    // Single pass through all requirements, checking all frameworks
    for (const category of this.asvsData) {
      for (const req of category.requirements) {
        if (!req.level.includes(targetLevel)) continue;

        for (const framework of frameworks) {
          const complianceRefs = req.compliance?.[framework as keyof typeof req.compliance];
          if (complianceRefs && complianceRefs.length > 0) {
            coverage[framework].total++;

            if (implemented.has(req.id)) {
              coverage[framework].implemented++;
            } else {
              coverage[framework].missing++;
              gaps[framework].push({
                requirement_id: req.id,
                category: req.category,
                description: req.description,
                compliance_references: complianceRefs,
                priority: this.calculateGapPriority(req, framework)
              });
            }
          }
        }
      }
    }

    // Sort gaps by priority for each framework
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    for (const framework of frameworks) {
      gaps[framework].sort((a, b) =>
        priorityOrder[a.priority as keyof typeof priorityOrder] -
        priorityOrder[b.priority as keyof typeof priorityOrder]
      );
    }

    return this.createTextResponse({
      target_level: `L${targetLevel}`,
      frameworks_analyzed: frameworks.map(f => ASVSServer.FRAMEWORK_MAP[f] || f),
      coverage_summary: Object.keys(coverage).map(f => ({
        framework: ASVSServer.FRAMEWORK_MAP[f] || f,
        framework_key: f,
        total_requirements: coverage[f].total,
        implemented: coverage[f].implemented,
        missing: coverage[f].missing,
        coverage_percentage: coverage[f].total > 0
          ? Math.round((coverage[f].implemented / coverage[f].total) * 100)
          : 0
      })),
      gaps
    });
  }

  private calculateGapPriority(req: ASVSRequirement, framework: string): string {
    // Critical compliance controls
    const criticalCompliancePatterns: Record<string, string[]> = {
      pci_dss: ["3.2", "3.4", "4.1", "8.2"],
      hipaa: ["164.312(a)(1)", "164.312(e)(1)", "164.308(a)(4)"],
      gdpr: ["Article 32"],
      sox: ["IT General Controls"],
      iso27001: ["A.9.4", "A.10.1", "A.13.1"]
    };

    const complianceRefs = req.compliance?.[framework as keyof typeof req.compliance] || [];
    const isCriticalCompliance = criticalCompliancePatterns[framework]?.some(pattern =>
      complianceRefs.some(ref => ref.includes(pattern))
    );

    const isHighPriorityCategory = ASVSServer.COMPLIANCE_HIGH_PRIORITY_CATEGORIES.some(cat =>
      req.category.includes(cat)
    );

    if (isCriticalCompliance || (isHighPriorityCategory && req.level.includes(1))) {
      return "HIGH";
    } else if (isHighPriorityCategory || req.level.includes(2)) {
      return "MEDIUM";
    }

    return "LOW";
  }

  private mapRequirementToCompliance(args: MapRequirementToComplianceArgs) {
    const { requirement_id: reqId } = args;

    // Security: Validate input length
    if (reqId.length > MAX_ID_LENGTH) {
      return this.createErrorResponse(`Requirement ID too long (max ${MAX_ID_LENGTH} characters)`);
    }

    const indexed = this.requirementIndex.get(reqId);

    if (!indexed) {
      return this.createErrorResponse(`Requirement '${reqId}' not found.`);
    }

    const req = indexed.requirement;
    const complianceMapping: Record<string, string[]> = {};
    let totalMappings = 0;

    if (req.compliance) {
      for (const [framework, refs] of Object.entries(req.compliance)) {
        if (refs && refs.length > 0) {
          complianceMapping[ASVSServer.FRAMEWORK_MAP[framework] || framework] = refs;
          totalMappings += refs.length;
        }
      }
    }

    return this.createTextResponse({
      requirement: {
        id: req.id,
        category: req.category,
        description: req.description,
        level: req.level.map(l => `L${l}`)
      },
      compliance_mappings: complianceMapping,
      total_framework_mappings: Object.keys(complianceMapping).length,
      total_control_references: totalMappings,
      compliance_impact: totalMappings > 0
        ? "Implementing this requirement helps satisfy multiple compliance frameworks"
        : "No direct compliance mappings identified"
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("OWASP ASVS MCP server running on stdio");
  }
}

const server = new ASVSServer();
server.run().catch(console.error);