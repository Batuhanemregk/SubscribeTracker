# SubscribeTracker

A privacy-first subscription tracking app that extracts subscriptions from Gmail using a hybrid rule + LLM approach.

## 🔒 Privacy Principles

- **Never** store raw email content (subject, body, attachments)
- **Only** derived data: merchant, amount, cadence, dates, confidence
- User controls: Disconnect & Delete Account (forget me)
- Explainable AI: Review queue shows "why" without exposing PII

## 📁 Project Structure

```
apps/mobile/          # React Native + Expo mobile app
services/api/         # .NET 8 Backend API
services/worker/      # Python 3.11 Sync & Extraction Worker
packages/shared/      # Shared OpenAPI specs & types
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- .NET 8 SDK
- Python 3.11+
- Docker & Docker Compose

### Local Development

```bash
# Start all services
docker-compose up -d

# Mobile app (separate terminal)
cd apps/mobile
npm install
npm start
```

### Environment Setup

```bash
cp .env.example .env
# Fill in required values
```

## 📖 Documentation

- [Implementation Plan](docs/implementation_plan.md)
- [API Documentation](packages/shared/openapi/api.yaml)
- [Extraction Rules](services/worker/rules/README.md)

## 🧪 Testing

```bash
# API tests
cd services/api && dotnet test

# Worker tests
cd services/worker && pytest

# Mobile tests
cd apps/mobile && npm test
```

## 📄 License

Private - All rights reserved
