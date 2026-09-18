# Security Policy

## Reporting Security Issues

We take the security and privacy of Telegram Drive seriously. If you discover a potential vulnerability or security issue, please help us by reporting it responsibly.

### How to Report

- Report security concerns or vulnerability details privately via [GitHub Security Advisories](https://github.com/jupiterbania/Telegram-Drive/security/advisories) or by opening a confidential discussion with the repository maintainers.
- Please provide detailed steps to reproduce the issue along with the affected platform and app version.

> [!WARNING]
> **Never include private credentials, session files, phone numbers, encryption keys, or personal file contents in public issue reports.**

### Responsible Security Practices

- Telegram Drive communicates directly with Telegram servers using MTProto. Sensitive credentials such as API hashes and session tokens are protected using the operating system's native secure credential storage (Windows Credential Manager, macOS Keychain, Linux Secret Service, Android Keystore).
- Local integrations such as WebDAV and REST endpoints are bound to loopback interfaces by default and protected by capability tokens and keys.

For more details on data handling, please refer to [PRIVACY.md](PRIVACY.md).
