# Testing Skill

## Goal
Add useful tests without over-engineering the 48-hour assessment.

## Backend Tests
Prioritize:
- registration
- duplicate email
- login
- invalid login
- protected routes
- message history
- cursor pagination
- socket message delivery where practical

## Frontend Tests
Prioritize:
- auth helpers
- API client behavior
- message formatting utilities
- offline queue logic
- reusable hooks where practical

## Socket Tests
Test where practical:
- authenticated connection
- rejected unauthenticated connection
- message acknowledgement
- disconnect cleanup

## Security Tests
Cover:
- invalid payloads
- missing JWT
- invalid JWT
- SQL injection-like input
- unauthorized access

## Definition of Done
A tested feature should:
- build successfully
- pass TypeScript
- pass relevant tests
- avoid brittle snapshot tests
- avoid excessive mocking