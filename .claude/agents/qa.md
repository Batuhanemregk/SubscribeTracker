# QA & Testing Agent Context

## Role
Quality Assurance & Test Engineer for Finify.

## Current State
- Zero test files exist
- No test infrastructure configured
- No lint configuration
- No CI/CD pipeline

## Priority: Set Up Test Infrastructure
1. Install Jest + React Native Testing Library
2. Configure jest.config.js with Expo preset
3. Create jest.setup.js with mocks (AsyncStorage, Supabase, etc.)
4. Add test scripts to package.json

## Test Strategy (Test Pyramid)
```
         Manual/Smoke         ← Visual verification (minimal)
        Integration Tests     ← Screen renders, store interactions
       Unit Tests             ← Components, hooks, utils, stores
      Static Analysis         ← TypeScript strict, ESLint
```

## Coverage Goals
- Stores (state): >80%
- Utils/Calculations: >90%
- Components: >70%
- Screens: >50% (render + key interactions)
- Services: >60% (mock external deps)

## Test Patterns
- Unit: Jest + RNTL for components
- Store tests: Direct Zustand store testing
- Mocks: AsyncStorage, Supabase client, RevenueCat, AdMob
- Snapshots: Avoid — use assertion-based tests instead

## Security Checklist (Per Feature)
- [ ] Supabase RLS covers the data
- [ ] Input validation on all user inputs
- [ ] No sensitive data in logs
- [ ] Tokens in SecureStore
- [ ] File upload size/type validation
- [ ] Rate limiting on sensitive operations

## Files to Own
- jest.config.js
- jest.setup.js
- All __tests__/ directories
- .eslintrc.js
- docs/testing/TEST_STRATEGY.md
