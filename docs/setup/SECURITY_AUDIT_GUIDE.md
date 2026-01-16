# 🔐 Security Audit Guide for BUKKi Platform

## Table of Contents
1. [Overview](#overview)
2. [Automated Security Tools](#automated-security-tools)
3. [Manual Security Testing](#manual-security-testing)
4. [OWASP Top 10 Checklist](#owasp-top-10-checklist)
5. [Penetration Testing](#penetration-testing)
6. [Security Best Practices Verification](#security-best-practices-verification)
7. [Reporting & Remediation](#reporting--remediation)

---

## Overview

This guide helps you conduct a comprehensive security audit of the BUKKi booking platform. The audit covers:
- **Authentication & Authorization**
- **Input Validation & Sanitization**
- **SQL Injection Prevention**
- **XSS (Cross-Site Scripting) Prevention**
- **CSRF Protection**
- **Rate Limiting & DoS Protection**
- **Data Encryption**
- **Secure Dependencies**

---

## Automated Security Tools

### 1. OWASP ZAP (Zed Attack Proxy)

**Installation:**
```bash
# Download from https://www.zaproxy.org/download/
# Or install via package manager

# Windows (using Chocolatey)
choco install zaproxy

# macOS
brew install --cask owasp-zap

# Linux (Debian/Ubuntu)
sudo apt-get install zaproxy
```

**Running OWASP ZAP:**

1. **Start Backend Server:**
```bash
cd backend
npm run start:dev
```

2. **Start Frontend:**
```bash
cd frontend
npm run dev
```

3. **Launch OWASP ZAP:**
```bash
# Open ZAP GUI
zap.sh  # Linux/macOS
zap.bat # Windows
```

4. **Automated Scan:**
   - Click "Automated Scan"
   - Enter: `http://localhost:3000`
   - Click "Attack"
   - Wait for scan to complete (10-30 minutes)

5. **Review Results:**
   - Check "Alerts" tab
   - Export report: `Report → Generate HTML Report`

**Expected Findings:**
- Some false positives are normal
- Focus on HIGH and MEDIUM severity issues
- Verify our input sanitization is working

### 2. npm audit (Dependency Scanning)

**Backend Dependencies:**
```bash
cd backend
npm audit

# Fix vulnerabilities
npm audit fix

# Force fix (may cause breaking changes)
npm audit fix --force
```

**Frontend Dependencies:**
```bash
cd frontend
npm audit
npm audit fix
```

**Review Output:**
- Check for HIGH and CRITICAL vulnerabilities
- Review each vulnerability manually
- Update dependencies: `npm update`

### 3. Snyk (Continuous Security Monitoring)

**Installation:**
```bash
npm install -g snyk
snyk auth
```

**Scan Project:**
```bash
cd backend
snyk test

cd ../frontend
snyk test
```

**Monitor for New Vulnerabilities:**
```bash
snyk monitor
```

---

## Manual Security Testing

### 1. Authentication Testing

#### Test 1.1: Brute Force Protection
```bash
# Try multiple failed login attempts
for i in {1..20}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong'$i'"}'
done
```
**Expected:** Account should be locked or rate limited after 5-10 attempts

#### Test 1.2: JWT Token Validation
```bash
# Try accessing protected endpoint with invalid token
curl -X GET http://localhost:3000/bookings/my-bookings \
  -H "Authorization: Bearer invalid.token.here"
```
**Expected:** 401 Unauthorized

#### Test 1.3: Token Expiration
```bash
# Get a valid token
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' \
  | jq -r '.accessToken')

# Wait for token to expire (15 minutes by default)
# Then try to use it
curl -X GET http://localhost:3000/bookings/my-bookings \
  -H "Authorization: Bearer $TOKEN"
```
**Expected:** 401 Unauthorized after expiration

#### Test 1.4: Password Strength
```bash
# Try weak password
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"weak@example.com",
    "password":"123",
    "firstName":"Test",
    "lastName":"User"
  }'
```
**Expected:** 400 Bad Request with password validation error

### 2. SQL Injection Testing

#### Test 2.1: Authentication Bypass Attempt
```bash
# Classic SQL injection in login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com'"'"' OR '"'"'1'"'"'='"'"'1","password":"anything"}'
```
**Expected:** 401 Unauthorized (not SQL error)

#### Test 2.2: Search Injection
```bash
# Try SQL injection in business search
curl -X GET "http://localhost:3000/businesses?search='; DROP TABLE businesses; --"
```
**Expected:** Normal response or validation error (not SQL error)

#### Test 2.3: Booking Notes Injection
```bash
TOKEN="your-valid-token"
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId":"some-service-id",
    "appointmentDate":"2024-12-25T10:00:00Z",
    "notes":"'; DELETE FROM bookings WHERE '"'"'1'"'"'='"'"'1"
  }'
```
**Expected:** Booking created with sanitized notes

### 3. XSS (Cross-Site Scripting) Testing

#### Test 3.1: Stored XSS in Business Description
```bash
TOKEN="your-business-owner-token"
curl -X POST http://localhost:3000/businesses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"XSS Test Business",
    "category":"restaurant",
    "description":"<script>alert('"'"'XSS'"'"')</script>",
    "address":"123 Test St"
  }'
```
**Expected:** Script tags should be escaped or removed

#### Test 3.2: XSS in Booking Notes
```bash
TOKEN="your-token"
curl -X POST http://localhost:3000/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId":"service-id",
    "appointmentDate":"2024-12-25T10:00:00Z",
    "notes":"<img src=x onerror=alert('"'"'XSS'"'"')>"
  }'
```
**Expected:** HTML should be escaped

#### Test 3.3: DOM-Based XSS (Frontend)
1. Open browser console
2. Navigate to: `http://localhost:5173/businesses?search=<script>alert('XSS')</script>`
3. Check if script executes

**Expected:** No alert should appear

### 4. Authorization Testing

#### Test 4.1: Horizontal Privilege Escalation
```bash
# Try to access another user's bookings
TOKEN_USER_A="user-a-token"
BOOKING_ID_USER_B="user-b-booking-id"

curl -X GET http://localhost:3000/bookings/$BOOKING_ID_USER_B \
  -H "Authorization: Bearer $TOKEN_USER_A"
```
**Expected:** 403 Forbidden

#### Test 4.2: Vertical Privilege Escalation
```bash
# Try to create business as customer
TOKEN_CUSTOMER="customer-token"

curl -X POST http://localhost:3000/businesses \
  -H "Authorization: Bearer $TOKEN_CUSTOMER" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Unauthorized Business",
    "category":"restaurant"
  }'
```
**Expected:** 403 Forbidden

#### Test 4.3: Direct Object Reference
```bash
# Try to modify another user's profile
TOKEN="your-token"
OTHER_USER_ID="another-user-id"

curl -X PATCH http://localhost:3000/users/$OTHER_USER_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Hacked"}'
```
**Expected:** 403 Forbidden

### 5. File Upload Testing (if applicable)

#### Test 5.1: Upload Malicious File
```bash
# Create malicious PHP file
echo '<?php system($_GET["cmd"]); ?>' > malicious.php

# Try to upload
TOKEN="your-token"
curl -X POST http://localhost:3000/businesses/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@malicious.php"
```
**Expected:** File should be rejected or extension changed

#### Test 5.2: Upload Large File (DoS)
```bash
# Create 100MB file
dd if=/dev/zero of=large.jpg bs=1M count=100

# Try to upload
curl -X POST http://localhost:3000/businesses/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@large.jpg"
```
**Expected:** File rejected due to size limit

### 6. Rate Limiting Testing

#### Test 6.1: API Rate Limiting
```bash
# Send 100 requests quickly
for i in {1..100}; do
  curl -X GET http://localhost:3000/businesses \
    -H "Authorization: Bearer $TOKEN" &
done
wait
```
**Expected:** Some requests should return 429 Too Many Requests

#### Test 6.2: Login Rate Limiting
```bash
# Try rapid login attempts
for i in {1..50}; do
  curl -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test'$i'"}' &
done
wait
```
**Expected:** Requests should be rate limited

---

## OWASP Top 10 Checklist

### A01:2021 – Broken Access Control

- [ ] Test that users cannot access other users' data
- [ ] Verify role-based access control (customer, business_owner, admin)
- [ ] Check that business owners can only modify their own businesses
- [ ] Verify customers can only cancel their own bookings
- [ ] Test that JWT tokens are properly validated
- [ ] Ensure expired tokens are rejected

### A02:2021 – Cryptographic Failures

- [ ] Verify passwords are hashed with bcrypt (cost factor 12)
- [ ] Check that sensitive fields are encrypted at rest
- [ ] Ensure HTTPS is enabled in production
- [ ] Verify JWT secrets are strong and kept secret
- [ ] Check that database credentials are not hardcoded
- [ ] Ensure `.env` files are in `.gitignore`

### A03:2021 – Injection

- [ ] Test SQL injection in all input fields
- [ ] Verify parameterized queries are used (TypeORM)
- [ ] Test NoSQL injection attempts
- [ ] Check command injection in system calls
- [ ] Verify LDAP/XML injection (if applicable)

### A04:2021 – Insecure Design

- [ ] Review authentication flow
- [ ] Check booking conflict prevention logic
- [ ] Verify trust score system design
- [ ] Review cancellation policy enforcement
- [ ] Check email verification requirement

### A05:2021 – Security Misconfiguration

- [ ] Verify error messages don't leak sensitive info
- [ ] Check that debug mode is disabled in production
- [ ] Ensure default credentials are changed
- [ ] Verify CORS is properly configured
- [ ] Check that unnecessary endpoints are disabled
- [ ] Review HTTP security headers (Helmet.js)

### A06:2021 – Vulnerable and Outdated Components

- [ ] Run `npm audit` on backend
- [ ] Run `npm audit` on frontend
- [ ] Check for outdated dependencies: `npm outdated`
- [ ] Review security advisories for critical packages
- [ ] Verify Node.js version is up to date

### A07:2021 – Identification and Authentication Failures

- [ ] Test brute force protection
- [ ] Verify account lockout after failed attempts
- [ ] Check password complexity requirements
- [ ] Test session management
- [ ] Verify JWT token expiration
- [ ] Check two-factor authentication (if implemented)

### A08:2021 – Software and Data Integrity Failures

- [ ] Verify file upload validation
- [ ] Check that uploaded files are scanned
- [ ] Review serialization/deserialization security
- [ ] Verify npm packages are from official registry
- [ ] Check for suspicious dependencies

### A09:2021 – Security Logging and Monitoring Failures

- [ ] Verify authentication attempts are logged
- [ ] Check that booking modifications are audited
- [ ] Ensure admin actions are logged
- [ ] Verify logs don't contain sensitive data
- [ ] Test that critical errors generate alerts

### A10:2021 – Server-Side Request Forgery (SSRF)

- [ ] Test URL validation in business website field
- [ ] Check that internal URLs are blocked
- [ ] Verify avatar/image URLs are validated
- [ ] Test redirect validation

---

## Penetration Testing

### Phase 1: Reconnaissance (1-2 hours)

1. **Gather Information:**
   - Review API documentation at `http://localhost:3000/api`
   - Identify all endpoints
   - Note authentication requirements
   - Check for version information leaks

2. **Technology Stack:**
   - Backend: NestJS, TypeORM, PostgreSQL
   - Frontend: React, Vite
   - Authentication: JWT
   - Database: PostgreSQL (Neon Cloud)

### Phase 2: Vulnerability Scanning (2-3 hours)

1. **Run OWASP ZAP** (as described above)
2. **Run Burp Suite** (professional alternative)
3. **Run Nikto Web Server Scanner:**
```bash
nikto -h http://localhost:3000
```

### Phase 3: Manual Testing (4-6 hours)

1. **Authentication Bypass:**
   - Try SQL injection in login
   - Test JWT token manipulation
   - Check password reset flow

2. **Authorization Flaws:**
   - Access other users' resources
   - Escalate privileges
   - Test IDOR vulnerabilities

3. **Input Validation:**
   - XSS in all input fields
   - SQL injection in search
   - Command injection in file paths

4. **Business Logic:**
   - Double booking attempts
   - Negative prices
   - Past date bookings
   - Cancel completed bookings

### Phase 4: Reporting (1-2 hours)

Create a report with:
- Executive summary
- Findings by severity
- Proof of concept
- Remediation recommendations

---

## Security Best Practices Verification

### Code Review Checklist

```bash
# 1. Check for hardcoded secrets
cd backend
grep -r "password\s*=\s*['\"]" src/
grep -r "api_key\s*=\s*['\"]" src/
grep -r "secret\s*=\s*['\"]" src/

# 2. Check for SQL string concatenation (bad practice)
grep -r "query.*+.*" src/
grep -r "\`SELECT.*\${" src/

# 3. Check for dangerous functions
grep -r "eval(" src/
grep -r "exec(" src/
grep -r "child_process" src/

# 4. Check for console.log in production code
grep -r "console.log" src/ | grep -v ".spec.ts"

# 5. Check for commented-out code with secrets
grep -r "TODO.*password" src/
grep -r "FIXME.*api" src/
```

### Environment Variables Check

```bash
# Verify .env files are not in git
git ls-files | grep ".env"
# Should return nothing

# Check .gitignore
cat .gitignore | grep ".env"
# Should show .env is ignored
```

### HTTPS/TLS Configuration (Production)

```bash
# Test SSL/TLS configuration
# Replace with your production domain
sslscan your-domain.com
testssl.sh your-domain.com

# Check certificate validity
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

---

## Reporting & Remediation

### Finding Template

```markdown
## [SEVERITY] Vulnerability Title

**Category:** OWASP A0X - Category Name
**CWE:** CWE-XXX
**Affected Component:** backend/src/path/to/file.ts:LINE

### Description
Brief description of the vulnerability

### Impact
What an attacker could do if they exploit this

### Steps to Reproduce
1. Step one
2. Step two
3. Expected result vs actual result

### Proof of Concept
```bash
curl command or code snippet
```

### Recommendation
How to fix this issue

### References
- Link to OWASP
- Link to CWE
- Link to similar CVEs
```

### Severity Levels

- **CRITICAL:** Immediate fix required (SQL injection, auth bypass)
- **HIGH:** Fix within 1 week (XSS, authorization flaws)
- **MEDIUM:** Fix within 1 month (information disclosure, weak crypto)
- **LOW:** Fix when convenient (verbose errors, minor config issues)
- **INFO:** No action required (informational findings)

---

## Automated Security Testing

### Add to CI/CD Pipeline

**`.github/workflows/security-scan.yml`:**
```yaml
name: Security Scan

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Run npm audit
        run: |
          cd backend && npm audit --audit-level=high
          cd ../frontend && npm audit --audit-level=high

      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          command: test

      - name: Run OWASP Dependency-Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: 'BUKKi'
          path: '.'
          format: 'HTML'
```

---

## Next Steps

1. ✅ **Run automated scans** (OWASP ZAP, npm audit)
2. ✅ **Perform manual tests** (follow checklist above)
3. ✅ **Document findings** (use template)
4. ✅ **Prioritize issues** (by severity)
5. ✅ **Fix vulnerabilities** (start with CRITICAL/HIGH)
6. ✅ **Re-test** (verify fixes work)
7. ✅ **Update dependencies** (regularly)
8. ✅ **Monitor** (set up Snyk/Dependabot)

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NestJS Security](https://docs.nestjs.com/security/authentication)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**Good Luck with your Security Audit! 🛡️**
