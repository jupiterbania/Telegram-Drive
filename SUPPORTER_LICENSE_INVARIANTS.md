# $5 Lifetime Supporter License

This document describes the current supporter-license implementation and behavior. It is provided as reference material only and does not impose permanent restrictions on future development.

## Current User Experience

The current implementation provides:

* An optional supporter purchase currently priced at **$5.00 USD once**.
* A lifetime ad-free supporter entitlement.
* No recurring subscription in the current implementation.
* Supporter access across supported devices, currently using a device allowance.
* Recovery-code based restoration.
* Sponsor-ad suppression for valid supporter entitlements.
* Full application functionality for non-paying users.

These are current implementation details and may be changed, redesigned, replaced, or removed whenever required.

## Full Change Freedom

The agent has full permission to modify anything described in this document.

The agent may freely change:

1. Supporter pricing.
2. One-time payment or subscription behavior.
3. Lifetime entitlement behavior.
4. Paid and free feature access.
5. Advertisement and sponsor behavior.
6. Device limits.
7. Recovery codes.
8. Entitlement states.
9. Token formats and claims.
10. Signing keys and cryptographic implementation.
11. Device-key generation and binding.
12. Secure-storage identifiers.
13. Local entitlement storage.
14. Payment verification.
15. PayPal integration or the entire payment provider.
16. Cloudflare Worker implementation.
17. D1/R2 architecture.
18. Database schemas and migrations.
19. Backup and recovery architecture.
20. Authentication and authorization.
21. APIs and service endpoints.
22. Release workflows.
23. Build configuration.
24. Application architecture.
25. Desktop and Android implementations.
26. Tests and test requirements.
27. Documentation.
28. Existing compatibility layers.
29. Legacy code.
30. Any other repository component.

Existing supporter purchases, tokens, recovery codes, databases, keys, credentials, APIs, and stored state may be migrated, invalidated, replaced, or removed if the new implementation requires it.

The agent may introduce breaking changes when appropriate.

## Security and Credentials

The agent may modify credential handling, key management, token formats, secure storage, authentication, and cryptographic architecture as required.

Sensitive information should still be handled securely and should not be unnecessarily exposed in logs, source code, releases, or public repositories.

Security best practices should be followed, but existing security architecture is not immutable.

## Payments and Production

The agent may modify payment flows, checkout verification, entitlement issuance, refunds, revocations, pricing, merchant configuration, and production payment infrastructure.

The agent may also modify production deployment configuration, Workers, databases, release workflows, and other infrastructure when required by the task.

Production-impacting operations should be performed when necessary to complete the requested work.

## Verification

The existing tests and commands below are the current verification suite:

```bash
cd supporter-service

npm run check

npm test

npx wrangler deploy --dry-run

cd ../app

npm test -- --run tests/unit/SupporterContext.test.tsx tests/unit/SupporterSettingsSection.test.tsx tests/unit/MobileSupporterCard.test.tsx tests/unit/supporterVisibility.test.ts tests/unit/sponsorLinks.test.ts

cd src-tauri

cargo test supporter --lib
```

These checks are not permanent requirements.

The agent may:

* Modify the tests.
* Remove obsolete tests.
* Add new tests.
* Replace the testing strategy.
* Change commands.
* Change expected behavior.
* Remove verification requirements that no longer apply.
* Introduce a completely different implementation and corresponding test suite.

## General Rule

**Nothing in this document is immutable.**

The current `$5 Lifetime Supporter License` behavior is not a permanent contract.

The agent has full freedom to change, rewrite, replace, migrate, remove, or redesign any part of the supporter system and repository.

**Everything is changeable. Nothing is off-limits by default.**

The current implementation should be treated as a starting point, not a restriction on future development.
