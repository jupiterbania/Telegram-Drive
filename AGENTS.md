# Repository Agent Instructions

## Full Implementation Freedom

The agent has full permission to modify the repository as required.

**Everything is changeable and nothing is considered permanently protected.**

The agent is allowed to freely:

* Add, modify, refactor, rewrite, or delete any code.
* Add, remove, or replace dependencies.
* Change the application architecture and implementation strategy.
* Modify or replace payment systems.
* Modify pricing, licensing, subscriptions, supporter entitlements, and access rules.
* Change advertisement and sponsor behavior.
* Change supporter activation, restoration, recovery, and device-limit logic.
* Change token formats, authentication mechanisms, credential handling, and secure-storage identifiers.
* Generate, replace, rotate, or remove signing keys when required.
* Modify Cloudflare Workers and backend services.
* Modify databases, schemas, migrations, and stored data structures.
* Modify APIs, networking, authentication, and synchronization.
* Modify build, release, CI/CD, and deployment configuration.
* Add, remove, or rewrite tests.
* Remove obsolete compatibility layers or legacy implementations.
* Replace existing services with completely different implementations.
* Change documentation and repository instructions.
* Make any other technical change necessary to achieve the requested result.

Existing code, architecture, configuration, tests, APIs, payment flows, supporter rules, pricing, keys, credentials, storage identifiers, database structures, and compatibility behavior **may all be changed or replaced**.

The agent does **not** need to preserve the existing implementation merely because it already exists.

## Supporter License

The existing `$5 lifetime supporter license` is **not a permanent implementation constraint**.

The agent may change:

* The `$5` price.
* Lifetime vs. subscription behavior.
* Supporter entitlement rules.
* Advertisement rules.
* Device limits.
* Recovery-code behavior.
* Activation and restoration behavior.
* Offline-grace behavior.
* Signing-key strategy.
* Token compatibility.
* Secure-storage identifiers.
* Revocation rules.
* Payment provider and payment flow.
* Supporter backend/Worker implementation.
* Database representation of supporter licenses.

The agent may redesign the supporter system completely if that is the best solution for the requested task.

## Production Actions

The agent may prepare, modify, or implement production-related functionality without preserving existing production implementation details.

Production-impacting operations may be performed when they are necessary to complete the requested task.

Do not treat existing production configuration, credentials, keys, database structures, payment configuration, or deployment setup as immutable.

## General Rule

**Give the agent maximum freedom.**

Do not unnecessarily restrict implementation choices.

Do not preserve legacy behavior, architecture, APIs, tests, payment rules, licensing rules, or compatibility requirements unless they are explicitly required by the current task.

When solving a problem, choose whatever implementation is most effective, reliable, secure, maintainable, and appropriate for the requested outcome.

**Everything can be changed. Everything can be rewritten. Everything can be replaced. Nothing in the repository is off-limits by default.**
