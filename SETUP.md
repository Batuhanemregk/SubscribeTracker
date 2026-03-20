# Finify - New PC Setup Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | v22+ | https://nodejs.org |
| npm | 10+ | Comes with Node.js |
| Claude Code | latest | `npm install -g @anthropic-ai/claude-code` |
| EAS CLI | 16+ | `npm install -g eas-cli` |
| Git | latest | https://git-scm.com |

## 1. Clone & Install

```bash
git clone https://github.com/Batuhanemregk/SubscribeTracker.git
cd SubscribeTracker/apps/mobile
npm install
```

## 2. Environment Variables

Create `apps/mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=<supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
EXPO_PUBLIC_REVENUECAT_IOS_KEY=<revenuecat-ios-key>
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=<revenuecat-android-key>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<google-ios-client-id>
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<google-android-client-id>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<google-web-client-id>
```

Values are in the previous PC's `apps/mobile/.env` file or in respective service dashboards:
- Supabase: https://supabase.com/dashboard → Project Settings → API
- RevenueCat: https://app.revenuecat.com → Project → API Keys
- Google OAuth: https://console.cloud.google.com/apis/credentials

## 3. EAS Configuration

Update `apps/mobile/eas.json` submit section:

```json
"ios": {
  "appleId": "batuhanemregk@icloud.com",
  "ascAppId": "6758860219",
  "appleTeamId": "YR2V3VZ35A"
}
```

Then login and link:

```bash
eas login
eas init --force
```

## 4. Claude Code Setup

### Global Packages

```bash
npm install -g @anthropic-ai/claude-code
npm install -g eas-cli
```

### Claude Code Model

```
claude config set model claude-opus-4-6
```

### Claude Code Plugins (Marketplaces + Plugins)

Run these commands to add the plugin marketplaces:

```bash
claude plugin marketplace add claude-plugins-official
claude plugin marketplace add affaan-m/everything-claude-code
claude plugin marketplace add expo/skills
```

Then install all plugins:

```bash
claude plugin install figma
claude plugin install superpowers
claude plugin install everything-claude-code
claude plugin install frontend-design
claude plugin install feature-dev
claude plugin install context7
claude plugin install skill-creator
claude plugin install code-review
claude plugin install expo
```

### Claude Code Permissions

Add to `~/.claude/settings.json` (or run `claude config`):

```json
{
  "permissions": {
    "allow": [
      "Bash(*)",
      "Edit(*)",
      "Write(*)",
      "NotebookEdit(*)",
      "WebFetch(*)",
      "WebSearch(*)"
    ]
  }
}
```

### MCP Servers

Create `.vscode/mcp.json` in the project root (already gitignored):

```json
{
  "servers": {
    "revenuecat-mcp": {
      "url": "https://mcp.revenuecat.ai/mcp",
      "type": "http",
      "headers": {
        "Authorization": "Bearer <REVENUECAT_SECRET_API_KEY>"
      }
    }
  },
  "inputs": []
}
```

RevenueCat secret key: Get from https://app.revenuecat.com → Project → API Keys → Secret API Key

## 5. Installed Claude Code Plugins Summary

| Plugin | Source | Purpose |
|--------|--------|---------|
| figma | claude-plugins-official | Figma design-to-code |
| superpowers | claude-plugins-official | Brainstorming, planning, TDD workflows |
| everything-claude-code | affaan-m/everything-claude-code | Extended skills (build resolvers, reviewers, etc.) |
| frontend-design | claude-plugins-official | Frontend design implementation |
| feature-dev | claude-plugins-official | Guided feature development |
| context7 | claude-plugins-official | Library docs lookup |
| skill-creator | claude-plugins-official | Create/edit custom skills |
| code-review | claude-plugins-official | PR code review |
| expo | expo/skills | Expo/EAS build, deploy, UI skills |

## 6. MCP Servers Summary

| Server | URL | Purpose |
|--------|-----|---------|
| RevenueCat MCP | https://mcp.revenuecat.ai/mcp | RevenueCat dashboard interaction |

## 7. Run Commands

```bash
cd apps/mobile
npm start               # Expo dev server
npm run android         # Android build
npm run ios             # iOS build (macOS only)
npm test                # Jest tests
npx tsc --noEmit        # Type check

# EAS builds
npm run build:ios       # iOS production build
npm run submit:ios      # Submit to TestFlight
```
