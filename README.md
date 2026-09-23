<div align="center">

<img src="Docs/assets/logo.svg" alt="Telegram Drive logo" width="110">

# Telegram Drive

### **Fast, Private & Secure Cloud Workspace Powered by Telegram**

Organize, stream, sync, upload, and download files directly to your Telegram cloud on **Android**, **Windows**, **macOS**, and **Linux**.

[![Version](https://img.shields.io/badge/Release-v1.2.0-blue.svg?style=for-the-badge&logo=github)](https://github.com/jupiterbania/Telegram-Drive/releases/tag/v1.2.0)
[![Platforms](https://img.shields.io/badge/Platforms-Android%20%7C%20Windows%20%7C%20macOS%20%7C%20Linux-brightgreen.svg?style=for-the-badge)](https://github.com/jupiterbania/Telegram-Drive/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg?style=for-the-badge)](LICENSE)

<br/>

[📥 **Download Latest**](#-downloads) • [✨ **Features**](#-key-features) • [🚀 **Getting Started**](#-getting-started) • [🏗️ **Architecture**](#-how-it-works) • [🛠️ **Build From Source**](#%EF%B8%8F-build-from-source)

</div>

---

## 📥 Downloads

Download the latest version **v1.2.0** for your device:

| Platform | Format | Architecture / Type | Direct Download Link |
| :--- | :--- | :--- | :--- |
| 📱 **Android** | `.apk` | ARM64 Release (~11.7 MB) | [**TG-Drive-v1.2.0-Android-ARM64.apk**](https://github.com/jupiterbania/Telegram-Drive/releases/download/v1.2.0/TG-Drive-v1.2.0-Android-ARM64.apk) |
| 💻 **Windows** | `.exe` | Windows x64 Installer (NSIS) | [**TG-Drive-v1.2.0-Windows-x64-Setup.exe**](https://github.com/jupiterbania/Telegram-Drive/releases/download/v1.2.0/TG-Drive-v1.2.0-Windows-x64-Setup.exe) |
| 💻 **Windows** | `.exe` | Windows x64 Standalone Portable | [**TG-Drive-v1.2.0-Windows-x64-Portable.exe**](https://github.com/jupiterbania/Telegram-Drive/releases/download/v1.2.0/TG-Drive-v1.2.0-Windows-x64-Portable.exe) |
| 🍏 **macOS** | `.dmg` | Apple Silicon (M1/M2/M3/M4 ARM64) | [**TG-Drive-v1.2.0-macOS-Apple-Silicon-ARM64.dmg**](https://github.com/jupiterbania/Telegram-Drive/releases/download/v1.2.0/TG-Drive-v1.2.0-macOS-Apple-Silicon-ARM64.dmg) |
| 🍏 **macOS** | `.dmg` | Intel Mac (x86_64) | [**TG-Drive-v1.2.0-macOS-Intel-x64.dmg**](https://github.com/jupiterbania/Telegram-Drive/releases/download/v1.2.0/TG-Drive-v1.2.0-macOS-Intel-x64.dmg) |
| 🍎 **iOS** | `.ipa` / `.zip` | Direct Install / Simulator | [**TG-Drive-v1.2.0-iOS-Direct-Install.ipa**](https://github.com/jupiterbania/Telegram-Drive/releases/download/v1.2.0/TG-Drive-v1.2.0-iOS-Direct-Install.ipa) |

---

## 📖 Overview

**Telegram Drive** transforms your Telegram account into an organized, high-performance personal cloud drive. It connects directly to Telegram servers using the official MTProto protocol without any intermediate servers, trackers, or relays.

> [!NOTE]
> Telegram Drive is an open-source, independent project. Transfers are direct between your device and Telegram's infrastructure according to standard Telegram account limits (up to 2 GB per file).

---

## 🏗️ How It Works

Telegram Drive operates with a strict **local-first, zero-relay architecture**:

```
 ┌─────────────────────────────────────────────────────────────┐
 │                       YOUR DEVICE                           │
 │                                                             │
 │  ┌─────────────────────────┐       ┌─────────────────────┐  │
 │  │      Telegram Drive     │──────▶│   Local Cache & DB  │  │
 │  │    (React + Tauri v2)   │       │ (Metadata/Previews) │  │
 │  └────────────┬────────────┘       └─────────────────────┘  │
 │               │                                             │
 │               │ Loopback                                    │
 │               ▼                                             │
 │  ┌─────────────────────────┐                                │
 │  │    WebDAV / REST Server │                                │
 │  │  (Mount as Local Drive) │                                │
 │  └─────────────────────────┘                                │
 └───────────────┼─────────────────────────────────────────────┘
                 │
                 │ Direct MTProto Connection (Encrypted)
                 ▼
 ┌─────────────────────────────────────────────────────────────┐
 │                 TELEGRAM CLOUD INFRASTRUCTURE               │
 │           (Saved Messages & Private Channel Folders)        │
 └─────────────────────────────────────────────────────────────┘
```

### ⚡ Architectural Highlights
1. **Direct Connection**: No third-party servers; direct connection between your client and Telegram data centers.
2. **Local Metadata Storage**: Fast directory navigation, instant thumbnail caching, and background transfer queues.
3. **Local WebDAV Engine**: Mount your cloud drive directly into Windows Explorer, macOS Finder, or Linux file managers.

---

## ✨ Key Features

### 📁 Smart File & Folder Management
- **Channel-based Folders**: Automatically use private Telegram channels as categorized cloud directories.
- **Saved Messages Workspace**: Quick access to your personal root workspace.
- **High-Performance Virtualized Grid**: Seamlessly browse folders containing thousands of files.
- **Drag & Drop**: Easily drag files and directories directly into the app to upload.

### ⚡ Accelerated Parallel Transfers
- **Multi-part MTProto Engine**: Maximize your bandwidth with concurrent chunk uploads and downloads.
- **Queue Manager**: Pause, resume, cancel, and prioritize active transfers.
- **Automatic Integrity Verification**: SHA-256 and checksum checks guarantee error-free transfers.

### 🎬 Media Streaming & File Previews
- **Instant Video Streaming**: Adaptive streaming (HLS/fast-start) without needing full downloads first.
- **Media Player**: Integrated audio player, photo gallery, and built-in PDF viewer.
- **Archive Viewer**: Browse and extract compressed ZIP and archive files directly.

### 🔐 Client-Side Zero-Knowledge Encryption
- **End-to-End Vaults**: Encrypt sensitive files locally using AES-GCM before upload.
- **Zero-Knowledge Security**: Your encryption passphrases never leave your device.

### 🎨 Modern UI & Global Languages
- **Theme Support**: Sleek modern dark mode and light mode interfaces.
- **24+ Languages**: Full internationalization with automatic language detection.

---

## 🚀 Getting Started

### 1. Telegram API Credentials
Telegram requires third-party applications to authenticate via official API credentials:
1. Go to [my.telegram.org](https://my.telegram.org) and log in.
2. Click on **API development tools**.
3. Create a new app entry (e.g. *Telegram Drive*).
4. Copy your **`api_id`** and **`api_hash`**.

### 2. Login & Setup
1. Launch **Telegram Drive**.
2. Enter your `api_id` and `api_hash`.
3. Log in via your Telegram phone number (OTP code) or scan the QR code.
4. Enjoy unlimited, organized cloud storage!

---

## 🛠️ Build From Source

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+) & `npm`
- [Rust](https://rustup.rs/) (latest stable)
- **Windows**: Visual Studio C++ Build Tools & WebView2
- **macOS**: Xcode Command Line Tools
- **Linux**: `libwebkit2gtk-4.1-dev`, `libssl-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`

### Compilation

```bash
# 1. Clone the repository
git clone https://github.com/jupiterbania/Telegram-Drive.git
cd Telegram-Drive/app

# 2. Install dependencies
npm install

# 3. Development Mode
npm run tauri dev

# 4. Production Build
npm run tauri build
```

---

## 🔒 Security & Privacy

- **Native Credential Storage**: All tokens and sessions are stored encrypted in native system keychains (Windows Credential Manager, macOS Keychain, Linux Secret Service, Android Keystore).
- **Telemetry Free**: No analytics, background telemetry, or third-party trackers.
- Review our [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md) for further details.

---

## 📄 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for details.
