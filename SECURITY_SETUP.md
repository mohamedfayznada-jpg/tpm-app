# TPM Security Setup

## 1) Configure runtime secrets (no hardcoded keys)

1. Copy `config.local.example.js` to `config.local.js`.
2. Put your real keys inside `config.local.js`.
3. Keep `config.local.js` local only (already ignored in `.gitignore`).

Example:

```js
window.__TPM_CONFIG__ = {
  geminiApiKey: "YOUR_GEMINI_KEY",
  imgbbApiKey: "YOUR_IMGBB_KEY"
};
```

## 2) Install Firebase CLI

Run in PowerShell:

```powershell
npm install -g firebase-tools
firebase --version
```

## 3) Login + select project

```powershell
firebase login
firebase use tpm-audit-system
```

Project defaults are already configured via `.firebaserc`.

## 4) Deploy Realtime Database rules

Rules file: `firebase.rules.json`  
Deploy command:

```powershell
firebase deploy --only database
```

## 5) Map roles by Firebase UID

In Realtime Database:

`tpm_system/users/{uid} = "admin" | "auditor" | "viewer"`

The app prefers UID-based role lookup now.

## 6) Validate roles and access

Use `ROLE_TEST_MATRIX.md` to test:

- admin full access
- auditor operational access
- viewer read-only

## 7) Daily backup

Manual backup command:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-tpm.ps1
```

This stores timestamped JSON files under `.\backups`.
