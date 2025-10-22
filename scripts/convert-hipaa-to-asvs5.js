import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load data
const asvs4Data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'asvs-4.0.3.json'), 'utf8'));
const asvs5Data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'asvs-5.0.0.json'), 'utf8'));
const hipaaData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'asvs-4.0.3-hipaa-mapping.json'), 'utf8'));

// Build ASVS 4.0.3 index
const asvs4Index = new Map();
asvs4Data.Requirements.forEach(chapter => {
  chapter.Items.forEach(section => {
    section.Items.forEach(requirement => {
      asvs4Index.set(requirement.Shortcode, {
        id: requirement.Shortcode,
        description: requirement.Description,
        chapter: chapter.Shortcode,
        chapterName: chapter.Name
      });
    });
  });
});

// Build ASVS 5.0.0 index
const asvs5Index = new Map();
asvs5Data.Requirements.forEach(chapter => {
  chapter.Items.forEach(section => {
    section.Items.forEach(requirement => {
      asvs5Index.set(requirement.Shortcode, {
        id: requirement.Shortcode,
        description: requirement.Description,
        chapter: chapter.Shortcode,
        chapterName: chapter.Name,
        level: requirement.L
      });
    });
  });
});

console.log('ASVS 4.0.3 to 5.0.0 Mapping Conversion\n');
console.log('='.repeat(80));
console.log(`ASVS 4.0.3: ${asvs4Index.size} requirements`);
console.log(`ASVS 5.0.0: ${asvs5Index.size} requirements`);
console.log('='.repeat(80));

// Define mapping rules from ASVS 4.0.3 to 5.0.0
// This is a manual mapping based on OWASP documentation and requirement analysis
const mapping4to5 = {
  // V1 Architecture (4.0.3) -> V15 Secure Coding and Architecture (5.0.0)
  'V1.1.1': ['V15.1.1'], // Secure SDLC
  'V1.1.2': ['V15.1.2'], // Threat modeling
  'V1.1.3': ['V15.1.3'], // Security constraints in stories
  'V1.1.4': ['V15.1.4'], // Trust boundaries documentation
  'V1.1.5': ['V15.1.5'], // Architecture security analysis
  'V1.1.6': ['V15.2.2'], // Centralized security controls
  'V1.1.7': ['V15.1.1'], // Security policy/checklist

  // V1.2 Authentication Architecture (4.0.3) -> V6 Authentication (5.0.0)
  'V1.2.1': ['V6.1.1'], // Low-privilege accounts
  'V1.2.2': ['V13.2.1'], // Component authentication
  'V1.2.3': ['V6.1.2'], // Single authentication mechanism
  'V1.2.4': ['V6.1.3'], // Consistent authentication strength

  // V1.4 Access Control Architecture (4.0.3) -> V8 Authorization (5.0.0)
  'V1.4.1': ['V8.2.1'], // Server-side access control
  'V1.4.4': ['V8.2.2'], // Single access control mechanism
  'V1.4.5': ['V8.2.3'], // Attribute/feature-based access control

  // V1.5 Input/Output Architecture (4.0.3) -> V1 Encoding/V2 Validation (5.0.0)
  'V1.5.1': ['V2.1.1'], // Input/output requirements documentation
  'V1.5.2': ['V1.5.2'], // Deserialization safety
  'V1.5.3': ['V2.2.2'], // Server-side validation
  'V1.5.4': ['V1.1.2'], // Output encoding

  // V1.6 Cryptographic Architecture (4.0.3) -> V11 Cryptography (5.0.0)
  'V1.6.1': ['V11.1.1'], // Key management policy
  'V1.6.2': ['V13.3.1'], // Key vaults/secret management
  'V1.6.3': ['V11.1.2'], // Key rotation
  'V1.6.4': ['V11.1.3'], // No client-side secrets

  // V1.7 Errors/Logging Architecture (4.0.3) -> V16 Logging (5.0.0)
  'V1.7.1': ['V16.2.1'], // Common logging format
  'V1.7.2': ['V16.4.1'], // Secure log transmission

  // V1.8 Data Protection Architecture (4.0.3) -> V14 Data Protection (5.0.0)
  'V1.8.1': ['V14.1.1'], // Data classification
  'V1.8.2': ['V14.1.2'], // Protection requirements per level

  // V1.9 Communications Architecture (4.0.3) -> V12 Secure Communication (5.0.0)
  'V1.9.1': ['V12.3.1'], // Encrypted component communications
  'V1.9.2': ['V12.3.2'], // TLS certificate validation

  // V1.10 Malicious Software (4.0.3) -> V15 Secure Coding (5.0.0)
  'V1.10.1': ['V15.2.1'], // Source code control

  // V1.11 Business Logic (4.0.3) -> V2.3 Business Logic Security (5.0.0)
  'V1.11.1': ['V15.1.4'], // Component documentation
  'V1.11.2': ['V15.4.1'], // No shared state
  'V1.11.3': ['V15.4.2'], // Thread safety

  // V1.12 Secure File Upload (4.0.3) -> V5 File Handling (5.0.0)
  'V1.12.2': ['V5.2.1'], // File download protection

  // V1.14 Configuration (4.0.3) -> V13 Configuration (5.0.0)
  'V1.14.1': ['V13.2.1'], // Component segregation
  'V1.14.2': ['V15.2.3'], // Trusted deployment
  'V1.14.3': ['V15.2.4'], // Dependency checking
  'V1.14.4': ['V13.1.2'], // Automated deployment
  'V1.14.5': ['V13.2.2'], // Sandboxing
  'V1.14.6': ['V15.2.5'], // No deprecated technologies

  // V2 Authentication (4.0.3) -> V6 Authentication (5.0.0)
  'V2.1.1': ['V6.2.1'], // Password length
  'V2.1.2': ['V6.2.2'], // Password max length
  'V2.1.3': ['V6.2.3'], // No password truncation
  'V2.1.4': ['V6.2.4'], // Unicode in passwords
  'V2.1.5': ['V6.2.5'], // Password change
  'V2.1.6': ['V6.2.6'], // Current password for change
  'V2.1.7': ['V6.2.7'], // Breached password check
  'V2.1.8': ['V6.2.8'], // Password strength meter
  'V2.1.9': ['V6.2.9'], // No password composition rules
  'V2.1.10': ['V6.2.10'], // No password rotation
  'V2.1.11': ['V6.2.11'], // Paste allowed
  'V2.1.12': ['V6.2.12'], // Show password option

  // V2.2 General Authenticator (4.0.3) -> V6.3 General Authentication (5.0.0)
  'V2.2.1': ['V6.3.1'], // Anti-automation
  'V2.2.2': ['V6.3.2'], // Weak authenticators limited
  'V2.2.3': ['V6.3.3'], // Secure notifications
  'V2.2.4': ['V6.3.4'], // Phishing resistance
  'V2.2.5': ['V6.3.5'], // Mutually authenticated TLS
  'V2.2.6': ['V6.3.6'], // Replay resistance
  'V2.2.7': ['V6.3.7'], // Intent to authenticate

  // V2.3 Authenticator Lifecycle (4.0.3) -> V6.4 Factor Lifecycle (5.0.0)
  'V2.3.1': ['V6.4.1'], // Initial passwords
  'V2.3.2': ['V6.4.2'], // User-provided devices
  'V2.3.3': ['V6.4.3'], // Renewal instructions

  // V2.4 Credential Storage (4.0.3) -> V6.2 Password Security (5.0.0)
  'V2.4.1': ['V6.2.1'], // Password hashing
  'V2.4.2': ['V6.2.1'], // Salt requirements
  'V2.4.3': ['V6.2.1'], // PBKDF2 iterations
  'V2.4.4': ['V6.2.1'], // bcrypt work factor
  'V2.4.5': ['V6.2.1'], // Additional key derivation

  // V2.5 Credential Recovery (4.0.3) -> V6.4 Factor Recovery (5.0.0)
  'V2.5.1': ['V6.4.4'], // No clear text secrets
  'V2.5.2': ['V6.4.5'], // No knowledge-based auth
  'V2.5.3': ['V6.4.4'], // No password reveal
  'V2.5.4': ['V6.3.8'], // No shared accounts
  'V2.5.5': ['V6.4.6'], // Notify on factor change
  'V2.5.6': ['V6.4.4'], // Secure recovery mechanism
  'V2.5.7': ['V6.4.4'], // Identity proofing for recovery

  // V2.6 Lookup Secret (4.0.3) -> V6.7 Cryptographic Auth (5.0.0)
  'V2.6.1': ['V6.7.1'], // One-time use
  'V2.6.2': ['V6.7.2'], // Sufficient randomness
  'V2.6.3': ['V6.7.2'], // Offline attack resistance

  // V2.7 Out of Band (4.0.3) -> V6.6 Out-of-Band (5.0.0)
  'V2.7.1': ['V6.6.1'], // Strong alternatives first
  'V2.7.2': ['V6.6.2'], // Expiration time
  'V2.7.3': ['V6.6.3'], // One-time use
  'V2.7.4': ['V6.6.4'], // Secure independent channel
  'V2.7.5': ['V6.6.2'], // Hashed authentication code

  // V3 Session Management (4.0.3) -> V7 Session Management (5.0.0)
  'V3.1.1': ['V7.2.1'], // Framework session management
  'V3.2.1': ['V7.2.2'], // Random session tokens
  'V3.2.2': ['V7.2.3'], // Session token validation
  'V3.2.3': ['V7.4.1'], // Logout invalidates token
  'V3.2.4': ['V7.4.2'], // Timeout invalidates session
  'V3.3.1': ['V7.3.1'], // Idle timeout
  'V3.3.2': ['V7.3.2'], // Absolute timeout
  'V3.3.3': ['V7.4.3'], // Session termination
  'V3.3.4': ['V7.4.4'], // Logout on all devices
  'V3.4.1': ['V7.2.4'], // Cookie-based tokens protected
  'V3.4.2': ['V7.1.1'], // Session token in cookies
  'V3.4.3': ['V3.3.1'], // Secure flag
  'V3.4.4': ['V3.3.4'], // HttpOnly flag
  'V3.4.5': ['V3.3.2'], // SameSite attribute
  'V3.5.1': ['V7.5.1'], // Session fixation protection
  'V3.5.2': ['V7.5.2'], // Session token in URL
  'V3.5.3': ['V7.1.2'], // Re-authentication for sensitive ops

  // V4 Access Control (4.0.3) -> V8 Authorization (5.0.0)
  'V4.1.1': ['V8.2.1'], // Access control enforced
  'V4.1.2': ['V8.2.2'], // Attribute-based access
  'V4.1.3': ['V8.2.3'], // Principle of least privilege
  'V4.1.4': ['V8.3.1'], // Operation-level authorization
  'V4.1.5': ['V8.2.4'], // Access control can be overridden
  'V4.2.1': ['V8.3.2'], // CRUD operations authorized
  'V4.2.2': ['V8.3.3'], // Record-level access control
  'V4.3.1': ['V8.4.1'], // Admin functions segregated
  'V4.3.2': ['V8.4.2'], // Directory browsing disabled
  'V4.3.3': ['V8.3.1'], // Emergency/privileged access

  // V5 Validation (4.0.3) -> V2 Validation (5.0.0)
  'V5.1.1': ['V2.2.1'], // Input validation
  'V5.1.2': ['V2.2.2'], // Server-side validation
  'V5.1.3': ['V2.2.1'], // Positive validation
  'V5.1.4': ['V2.2.3'], // Structured data validation
  'V5.1.5': ['V2.2.1'], // Sanitization
  'V5.2.1': ['V2.1.1'], // Sanitization documented
  'V5.2.2': ['V1.3.1'], // HTML sanitization
  'V5.2.3': ['V1.3.2'], // No eval
  'V5.2.4': ['V1.3.3'], // Dangerous context sanitization
  'V5.2.5': ['V1.3.4'], // SVG sanitization
  'V5.2.6': ['V1.3.5'], // Template sanitization
  'V5.2.7': ['V1.3.6'], // SSRF protection
  'V5.2.8': ['V1.3.7'], // Template injection protection
  'V5.3.1': ['V1.1.2'], // Output encoding
  'V5.3.2': ['V1.2.1'], // HTML output encoding
  'V5.3.3': ['V1.2.3'], // JavaScript output encoding
  'V5.3.4': ['V1.2.2'], // URL output encoding
  'V5.3.5': ['V1.1.1'], // Canonical form
  'V5.3.6': ['V1.2.4'], // SQL parameterization
  'V5.3.7': ['V1.2.5'], // OS command protection
  'V5.3.8': ['V1.2.6'], // LDAP injection protection
  'V5.3.9': ['V1.2.7'], // XPath injection protection
  'V5.3.10': ['V1.2.8'], // XML injection protection
  'V5.5.1': ['V1.5.1'], // XXE prevention
  'V5.5.2': ['V1.5.2'], // Deserialization protection
  'V5.5.3': ['V1.4.1'], // Memory-safe operations
  'V5.5.4': ['V1.4.2'], // Integer overflow protection

  // V6 Cryptography (4.0.3) -> V11 Cryptography (5.0.0)
  'V6.1.1': ['V11.2.1'], // TLS everywhere
  'V6.1.2': ['V12.1.1'], // Modern TLS versions
  'V6.1.3': ['V12.1.2'], // Strong cipher suites
  'V6.2.1': ['V11.3.1'], // Approved encryption
  'V6.2.2': ['V11.3.2'], // Random IVs
  'V6.2.3': ['V11.4.1'], // MAC before encryption
  'V6.2.4': ['V11.5.1'], // Random number generation
  'V6.2.5': ['V11.3.3'], // Known insecure algorithms blocked
  'V6.2.6': ['V11.5.2'], // Non-deterministic RNG
  'V6.2.7': ['V11.6.1'], // Public key crypto
  'V6.3.1': ['V13.3.1'], // Secrets not in source
  'V6.3.2': ['V13.3.2'], // Keys not in config files
  'V6.3.3': ['V13.3.3'], // Keys protected at rest
  'V6.4.1': ['V11.1.4'], // Key escrow
  'V6.4.2': ['V11.1.2'], // Key lifecycle

  // V7 Error Handling and Logging (4.0.3) -> V16 Logging (5.0.0)
  'V7.1.1': ['V16.2.1'], // Log all failures
  'V7.1.2': ['V16.2.2'], // Log successes
  'V7.1.3': ['V16.3.1'], // Log security events
  'V7.1.4': ['V16.2.3'], // Time source
  'V7.2.1': ['V16.2.4'], // Log format
  'V7.2.2': ['V16.2.5'], // Log injection protection
  'V7.3.1': ['V16.3.2'], // Incident detection
  'V7.3.2': ['V16.3.3'], // Incident response
  'V7.3.3': ['V16.3.4'], // Breach notification
  'V7.3.4': ['V16.3.3'], // Administrators alerted
  'V7.4.1': ['V16.5.1'], // Error messages generic
  'V7.4.2': ['V16.5.2'], // Exception handling
  'V7.4.3': ['V16.5.3'], // Last resort error handler

  // V8 Data Protection (4.0.3) -> V14 Data Protection (5.0.0)
  'V8.1.1': ['V14.2.1'], // Sensitive data protected
  'V8.1.2': ['V14.2.2'], // Minimal data collection
  'V8.1.3': ['V14.2.3'], // User access to own data
  'V8.1.4': ['V14.2.4'], // User data deletion
  'V8.2.1': ['V14.2.5'], // Data integrity protection
  'V8.2.2': ['V14.2.6'], // Data tampering detection
  'V8.2.3': ['V14.2.7'], // Data audit logs
  'V8.3.1': ['V14.3.1'], // Client-side storage protected
  'V8.3.2': ['V14.3.2'], // No sensitive data in browser storage
  'V8.3.3': ['V14.3.3'], // Session storage cleared
  'V8.3.4': ['V14.2.8'], // Data removed on disposal
  'V8.3.5': ['V11.3.4'], // Authenticated encryption
  'V8.3.6': ['V14.2.8'], // Secure deletion
  'V8.3.7': ['V14.3.1'], // Cache control headers
  'V8.3.8': ['V14.3.2'], // Autocomplete disabled

  // V9 Communications (4.0.3) -> V12 Secure Communication (5.0.0)
  'V9.1.1': ['V12.2.1'], // HTTPS everywhere
  'V9.1.2': ['V12.1.1'], // Modern TLS
  'V9.1.3': ['V12.1.3'], // Certificate validation
  'V9.2.1': ['V12.3.3'], // Same or stronger crypto
  'V9.2.2': ['V12.3.4'], // Server authentication
  'V9.2.3': ['V12.3.5'], // Different credentials
  'V9.2.4': ['V12.1.4'], // Certificate revocation
  'V9.2.5': ['V12.1.5'], // TLS failures handled

  // V10 Malicious Code (4.0.3) -> V15 Secure Coding (5.0.0)
  'V10.1.1': ['V15.2.1'], // Code integrity
  'V10.2.1': ['V15.3.1'], // Auto-update mechanisms
  'V10.2.2': ['V15.3.2'], // Update signing
  'V10.2.3': ['V15.3.3'], // Update integrity
  'V10.2.4': ['V15.3.4'], // No insecure auto-update
  'V10.2.5': ['V15.3.5'], // Malware protection
  'V10.2.6': ['V15.3.6'], // Update mechanism protection
  'V10.3.1': ['V15.2.4'], // Dependency checking
  'V10.3.2': ['V15.2.4'], // Component signing
  'V10.3.3': ['V15.2.4'], // Component integrity

  // V11 Business Logic (4.0.3) -> V2.3 Business Logic (5.0.0)
  'V11.1.1': ['V2.3.1'], // Sequential step order
  'V11.1.2': ['V2.3.2'], // Timing controls
  'V11.1.3': ['V2.3.3'], // Transaction consistency
  'V11.1.4': ['V2.3.4'], // Double-booking protection
  'V11.1.5': ['V2.3.5'], // Multi-user approval
  'V11.1.6': ['V2.4.1'], // Anti-automation
  'V11.1.7': ['V2.4.2'], // Human timing
  'V11.1.8': ['V2.1.3'], // Business limits documented

  // V12 Files (4.0.3) -> V5 File Handling (5.0.0)
  'V12.1.1': ['V5.2.1'], // File type validation
  'V12.1.2': ['V5.2.2'], // Filename sanitization
  'V12.1.3': ['V5.2.3'], // File size limits
  'V12.2.1': ['V5.3.1'], // Untrusted files stored outside webroot
  'V12.3.1': ['V5.2.4'], // Filename metadata validation
  'V12.3.2': ['V5.2.5'], // User-uploaded files not executed
  'V12.3.3': ['V5.2.6'], // ZIP bomb protection
  'V12.3.4': ['V5.3.2'], // File permissions
  'V12.3.5': ['V5.3.3'], // Temporary files cleaned up
  'V12.3.6': ['V5.4.1'], // User-uploaded files served safely
  'V12.4.1': ['V5.4.2'], // File download protection
  'V12.4.2': ['V5.4.3'], // Arbitrary file access prevention
  'V12.5.1': ['V5.2.1'], // File upload validation
  'V12.5.2': ['V5.2.2'], // Direct file access blocked
  'V12.6.1': ['V5.4.3'], // SSRF protection via files

  // V13 API (4.0.3) -> V4 API and Web Service (5.0.0)
  'V13.1.1': ['V4.1.1'], // All API parts authenticated
  'V13.1.2': ['V4.1.2'], // Keys not in URL
  'V13.1.3': ['V4.1.3'], // API keys authorization
  'V13.1.4': ['V8.3.1'], // Authorization at endpoint
  'V13.1.5': ['V4.1.4'], // Resource IDs not guessable
  'V13.2.1': ['V4.2.1'], // RESTful method validation
  'V13.2.2': ['V4.2.2'], // JSON schema validation
  'V13.2.3': ['V4.2.3'], // RESTful web services use authentication
  'V13.2.4': ['V4.2.4'], // REST path traversal
  'V13.2.5': ['V4.2.5'], // SOAP injection
  'V13.2.6': ['V4.3.1'], // GraphQL query limits
  'V13.3.1': ['V4.3.2'], // GraphQL introspection disabled
  'V13.4.1': ['V4.1.5'], // Rate limiting
  'V13.4.2': ['V4.4.1'], // WebSocket authentication
  'V13.4.3': ['V4.4.2'], // WebSocket origin validation

  // V14 Configuration (4.0.3) -> V13 Configuration (5.0.0)
  'V14.1.1': ['V13.2.1'], // Build step automation
  'V14.1.2': ['V13.1.3'], // Compiler flags
  'V14.1.3': ['V13.1.4'], // Server hardening
  'V14.1.4': ['V13.1.2'], // Deployment automation
  'V14.1.5': ['V13.2.2'], // Deployment sandboxing
  'V14.2.1': ['V15.2.4'], // Dependency updates
  'V14.2.2': ['V13.4.1'], // Unnecessary features removed
  'V14.2.3': ['V4.1.4'], // CDN with SRI
  'V14.2.4': ['V15.2.4'], // Trusted component sources
  'V14.2.5': ['V15.2.4'], // Software Bill of Materials
  'V14.2.6': ['V13.2.2'], // Sandboxing
  'V14.3.2': ['V13.4.2'], // Debug modes disabled
  'V14.3.3': ['V13.4.3'], // HTTP headers don't expose info
  'V14.4.1': ['V3.2.1'], // Content-Type header
  'V14.4.2': ['V5.4.2'], // Content-Disposition header
  'V14.4.3': ['V3.4.3'], // Content-Security-Policy
  'V14.4.4': ['V3.4.4'], // X-Content-Type-Options
  'V14.4.5': ['V3.4.1'], // Strict-Transport-Security
  'V14.4.6': ['V3.4.5'], // Referrer-Policy
  'V14.4.7': ['V3.4.6'], // Frame-ancestors
  'V14.5.1': ['V4.2.1'], // HTTP methods allowlist
  'V14.5.2': ['V3.5.1'], // Origin header validation
  'V14.5.3': ['V3.4.2'], // CORS allowlist
  'V14.5.4': ['V13.4.4'], // Trusted proxy headers
};

console.log('\nMapping Statistics:');
console.log(`  Defined mappings: ${Object.keys(mapping4to5).length}`);
console.log('');

// Export the mapping for use in other scripts
fs.writeFileSync(
  path.join(__dirname, 'asvs4-to-5-mapping.json'),
  JSON.stringify(mapping4to5, null, 2)
);

console.log('✓ Mapping rules saved to: scripts/asvs4-to-5-mapping.json\n');

export { mapping4to5, asvs4Index, asvs5Index };
