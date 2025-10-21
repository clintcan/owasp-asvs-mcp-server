/**
 * OpenCRE API Client
 *
 * Fetches ASVS requirement mappings from OpenCRE (Open Common Requirement Enumeration)
 * to provide transitive mappings to ISO 27001 and other standards.
 *
 * API Documentation: https://www.opencre.org/rest/v1/
 * GitHub: https://github.com/OWASP/OpenCRE
 */

import fetch from 'node-fetch';

// OpenCRE API response types
interface OpenCREStandard {
  doctype: 'Standard' | 'CRE';
  id?: string;
  name?: string;
  section?: string;
  sectionID?: string;
  hyperlink?: string;
}

interface OpenCRELink {
  document: OpenCREStandard;
  ltype: string;
}

interface OpenCRECRE {
  doctype: 'CRE';
  id: string;
  name: string;
  links?: OpenCRELink[];
}

interface OpenCREResponse {
  data?: OpenCRECRE;
}

interface ISO27001Mapping {
  sectionID: string;
  section: string;
  via_cre: string; // CRE ID that links them
}

export class OpenCREClient {
  private static readonly BASE_URL = 'https://www.opencre.org/rest/v1';
  private static readonly REQUEST_TIMEOUT = 10000; // 10 seconds
  private static readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  // Simple in-memory cache
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  // Rate limiting
  private lastRequestTime = 0;
  private minRequestInterval = 100; // 100ms between requests

  /**
   * Get ISO 27001 mappings for an ASVS requirement via OpenCRE
   *
   * Process:
   * 1. Fetch ASVS requirement from OpenCRE
   * 2. Get linked CREs
   * 3. For each CRE, fetch its links
   * 4. Extract ISO 27001 mappings
   */
  async getISO27001Mappings(asvsId: string): Promise<ISO27001Mapping[]> {
    try {
      const mappings: ISO27001Mapping[] = [];

      // Get ASVS requirements to find CRE links
      const asvsData = await this.fetchASVSRequirement(asvsId);

      if (!asvsData || !asvsData.links) {
        return [];
      }

      // Extract CRE links
      const creLinks = asvsData.links.filter(
        (link: OpenCRELink) => link.document.doctype === 'CRE'
      );

      // For each CRE, get its ISO 27001 mappings
      for (const creLink of creLinks) {
        if (!creLink.document.id) continue;

        const creData = await this.fetchCRE(creLink.document.id);

        if (creData && creData.links) {
          const iso27001Links = creData.links.filter(
            (link: OpenCRELink) =>
              link.document.name === 'ISO 27001' &&
              link.document.sectionID
          );

          for (const isoLink of iso27001Links) {
            mappings.push({
              sectionID: isoLink.document.sectionID!,
              section: isoLink.document.section || '',
              via_cre: creLink.document.id!
            });
          }
        }
      }

      return this.deduplicateMappings(mappings);
    } catch (error) {
      console.error(`Failed to get ISO 27001 mappings for ${asvsId}:`, error);
      return [];
    }
  }

  /**
   * Fetch ASVS requirement data from OpenCRE
   */
  private async fetchASVSRequirement(asvsId: string): Promise<any> {
    const cacheKey = `asvs:${asvsId}`;

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Query OpenCRE for ASVS standards
      const url = `${OpenCREClient.BASE_URL}/standard/ASVS?page=1&limit=1000`;
      const response = await this.fetchWithRateLimit(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as { standards?: any[] };

      if (!data.standards) {
        return null;
      }

      // Find the specific ASVS requirement
      const requirement = data.standards.find(
        (std: any) => std.sectionID === asvsId
      );

      if (requirement) {
        this.setCache(cacheKey, requirement);
      }

      return requirement || null;
    } catch (error) {
      console.error(`Failed to fetch ASVS requirement ${asvsId}:`, error);
      return null;
    }
  }

  /**
   * Fetch CRE data by ID
   */
  private async fetchCRE(creId: string): Promise<OpenCRECRE | null> {
    const cacheKey = `cre:${creId}`;

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const url = `${OpenCREClient.BASE_URL}/id/${creId}`;
      const response = await this.fetchWithRateLimit(url);

      if (!response.ok) {
        if (response.status === 404) {
          return null; // CRE not found
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json() as OpenCREResponse;

      if (data.data) {
        this.setCache(cacheKey, data.data);
        return data.data;
      }

      return null;
    } catch (error) {
      console.error(`Failed to fetch CRE ${creId}:`, error);
      return null;
    }
  }

  /**
   * Fetch with rate limiting to be nice to OpenCRE API
   */
  private async fetchWithRateLimit(url: string): Promise<any> {
    // Simple rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      await new Promise(resolve =>
        setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
      );
    }

    this.lastRequestTime = Date.now();

    // Fetch with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OpenCREClient.REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'OWASP-ASVS-MCP-Server/1.0'
        }
      });

      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Get data from cache if not expired
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);

    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > OpenCREClient.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Store data in cache
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Remove duplicate ISO 27001 mappings
   */
  private deduplicateMappings(mappings: ISO27001Mapping[]): ISO27001Mapping[] {
    const seen = new Set<string>();
    const unique: ISO27001Mapping[] = [];

    for (const mapping of mappings) {
      if (!seen.has(mapping.sectionID)) {
        seen.add(mapping.sectionID);
        unique.push(mapping);
      }
    }

    return unique;
  }

  /**
   * Clear the cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}
