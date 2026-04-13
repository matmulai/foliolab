## 2025-02-12 - Prevent SSRF via rss-parser
**Vulnerability:** The RSS fetch functionality uses `rss-parser` directly without validating user-provided URLs or preventing DNS rebinding. This allows SSRF (Server-Side Request Forgery) attacks where a user could provide a local network URL (like `http://localhost:8080` or `http://169.254.169.254`) or use DNS rebinding to access internal services.
**Learning:** `rss-parser` does not block local/private IP addresses by default. In a cloud environment, this is critical.
**Prevention:** Implement a custom `dns.lookup` function to validate resolved IP addresses and ensure the URL hostname itself is pre-flight checked before processing the feed.
