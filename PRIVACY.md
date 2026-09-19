# Privacy Policy

**Product**: TG Drive: Unlimited Cloud  
**Publisher**: Eveyka Software (by Jupiter Bania)  
**Effective Date**: September 18, 2026  

TG Drive: Unlimited Cloud is built from the ground up as a **local-first, zero-knowledge** client application. We respect your privacy and believe your personal files, encryption keys, and credentials should belong solely to you.

---

### 1. Zero Middleman Data Storage
* **No Cloud Account Server**: Eveyka Software does not operate any intermediate database or file-relay servers for your files.
* **Direct MTProto Connection**: All authentication and file transfers happen directly and encrypted between your device and Telegram's official servers.
* **We Never See Your Files**: We cannot see, store, analyze, or share any files or folders stored in your Telegram Drive.

---

### 2. Local-First Security & Credential Storage
* **Native Encrypted Storage**: Your Telegram credentials, API tokens, and local cache metadata are encrypted and stored inside your operating system's native secure vault:
  * **Windows**: Windows Credential Manager / Local AppData
  * **macOS**: Apple Keychain
  * **Linux**: FreeDesktop Secret Service
  * **Android**: Android Keystore
* **Local Control**: You can delete all local caches, indexes, and sessions anytime via the Settings page.

---

### 3. Optional Zero-Knowledge Vault Encryption (TDENC2)
* When you enable Client-Side Encryption, files are encrypted with military-grade AES-256-GCM / ChaCha20-Poly1305 on your device *before* upload.
* Passphrases and vault keys are never transmitted to Telegram, Eveyka Software, or any third party.

---

### 4. Commercial License Verification
* To verify your active Commercial License, the Software periodically connects to our lightweight Cloudflare Edge licensing API.
* **What is sent**: Your License Key and an anonymous cryptographic hardware fingerprint (Hardware ID).
* **What is NEVER sent**: Your personal files, file names, Telegram messages, phone numbers, or contacts are never sent to the license server.

---

### 5. Contact & Privacy Inquiries
If you have any questions regarding this Privacy Policy, you can reach out via:
* **Telegram**: [@Theexposes](https://t.me/Theexposes)
* **GitHub**: [https://github.com/jupiterbania/Telegram-Drive](https://github.com/jupiterbania/Telegram-Drive)
