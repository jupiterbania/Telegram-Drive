# Telegram Drive Privacy Policy

Telegram Drive is a local-first client application for desktop and mobile platforms. It does not operate intermediate file-storage or relay servers and does not collect or sell personal information.

## 1. Local-First Data Architecture
- **Credentials & Authentication**: Your Telegram API hash, session tokens, and passwords are encrypted and stored locally in your operating system's native secure credential manager (Windows Credential Manager, macOS Keychain, Linux Secret Service, Android Keystore).
- **Caches & Metadata**: File index caches, transfer queues, and local thumbnails remain stored strictly on your local device.
- **Local Control**: You can clear all cached files, logs, and stored settings at any time directly through the Settings interface.

## 2. Direct Telegram Communication
- Authentication and file operations connect directly between your device and Telegram's official MTProto servers.
- Folders and files are stored within your private Telegram channels and Saved Messages according to Telegram's Terms of Service and Privacy Policy.
- Telegram Drive does not proxy, intercept, or reroute your file transfers through third-party servers.

## 3. Local Sharing Services
- Features such as the WebDAV server and local REST API are disabled by default. When enabled, they run locally on your machine and are secured using user-generated authorization tokens and credentials.

## 4. Optional Client-Side Encryption
- When using client-side encryption (TDENC2), files are encrypted locally on your device before transfer. Encryption keys and passphrases are never transmitted to Telegram or any remote server.

## 5. Contact & Questions
If you have questions or concerns regarding privacy, feel free to open a discussion or issue on the official [GitHub repository](https://github.com/jupiterbania/Telegram-Drive).
