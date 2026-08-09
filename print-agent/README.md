# 🖨️ CampusPrint Hardware Print Agent Daemon (`print-agent/`)

The **CampusPrint Print Agent** is a lightweight, background CLI daemon running on print shop workstations (Windows & macOS). 

It polls the CampusPrint backend API, downloads queued print jobs over HTTPS, and spools them directly to connected physical printers using local hardware drivers.

---

## ✨ Key Features

- **⚡ Outbound HTTPS Polling Engine**: Polls `GET /api/shops/:id/poll-print` every 3 seconds; requires no open inbound ports or public IP addresses.
- **🖨️ Multi-OS Silent Background Spooling**:
  - **Windows**: Uses bundled `SumatraPDF.exe` CLI for silent PDF printing (`SumatraPDF.exe -print-to <Printer> <File>`).
  - **macOS**: Uses Unix `lp` print spooler (`lp -d <Printer> <File>`).
- **🔐 Interactive First-Time Setup**: Authenticates shop operators via CLI login, auto-discovers the shop ID, and generates an encrypted `config.json`.
- **🔄 Automatic Recovery & Autostart**:
  - Self-installs as a macOS `LaunchAgent` daemon (`start-agent.command`).
  - Windows autostart script (`start-agent.bat`).

---

## 🛠️ Tech Stack

- **Runtime**: Node.js v18+
- **HTTP Client**: Axios
- **Windows Print Engine**: SumatraPDF CLI (`SumatraPDF.exe`)
- **macOS Print Engine**: Native Unix CUPS (`lp`)

---

## 📂 Repository Structure

```
print-agent/
├── agent.js              # Core polling loop, print spooler & interactive setup logic
├── config.json           # Local shop configuration (API Base URL, Shop ID, Auth Token)
├── SumatraPDF.exe        # Bundled Windows PDF CLI printing binary
├── start-agent.bat       # Windows startup script
├── start-agent.command   # macOS LaunchAgent startup script
└── package.json          # Agent dependencies
```

---

## 🚀 Quickstart & Setup Guide

### 1. Installation

On the print shop workstation:
```bash
cd print-agent
npm install
```

### 2. Interactive Configuration & Boot

Run the agent script:
```bash
node agent.js
```

1. Enter your shop operator email and password when prompted.
2. Select your assigned CampusPrint Shop ID.
3. The agent saves `config.json` and immediately starts polling for incoming print jobs.

### 3. Autostart Setup

- **macOS**: Double click `start-agent.command` or register as a `LaunchAgent`.
- **Windows**: Add `start-agent.bat` to your Windows Startup folder (`shell:startup`).
