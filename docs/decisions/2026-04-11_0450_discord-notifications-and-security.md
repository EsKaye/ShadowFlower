# Discord Notifications and Security Hardening

## 1. Title
Discord Notifications and Locked-Down Access Policy Implementation

## 2. Timestamp
2026-04-11 04:50 EST

---

## 3. Scope of the pass
Added Discord notification adapter and implemented locked-down service policy for ShadowFlower. This included webhook-based notifications, admin gate functionality, root endpoint protection, and comprehensive documentation of the private service posture.

---

## 4. Why this pass was needed
- **Notification Requirements**: Need to send moderation alerts to private Discord server for admin awareness
- **Security Posture**: ShadowFlower should behave as a private backend service, not a public website
- **Admin Access**: Need protected admin endpoints with secure access control
- **Route Protection**: Ensure all job/action endpoints require proper authentication
- **Information Disclosure**: Root endpoint should reveal nothing useful about the service

---

## 5. Files changed

### New Files
- `src/notifications/discord.ts` - Discord webhook notification adapter
- `src/notifications/index.ts` - Notification layer exports
- `src/routes/index.ts` - Root endpoint returning 404

### Modified Files
- `src/security/auth.ts` - Added `validateAdminKey` and `requireAdmin` functions
- `.env.example` - Added Discord and admin environment variables
- `README.md` - Added Discord notifications documentation and private service posture

---

## 6. Architecture / logic changes

### What changed
- **Notification Layer**: Added webhook-based Discord notification adapter
- **Admin Gate**: Implemented admin key validation with 404 response for invalid attempts
- **Root Protection**: Root endpoint now returns 404 instead of any information
- **Security Middleware**: Extended with admin-specific authentication functions
- **Documentation**: Added comprehensive Discord setup and private service posture documentation

### How it works now
- **Discord Notifications**: Webhook-based adapter sends structured messages via Discord webhooks
- **Admin Gate**: `requireAdmin` middleware validates `SHADOWFLOWER_ADMIN_KEY` header, returns 404 on failure
- **Root Endpoint**: Returns 404 to avoid revealing service information
- **Route Protection**: All job endpoints require `SHADOWFLOWER_API_KEY` via `requireAuth` middleware
- **Private Service Posture**: Service explicitly designed as private backend with no public UI

### Why this approach was taken
- **Webhook Simplicity**: Webhook-based notifications are lighter than full Discord bot implementation
- **Security by Obscurity**: Returning 404 for admin endpoints avoids revealing their existence
- **Minimal Root**: 404 response is standard for non-existent routes, doesn't reveal service information
- **Provider Agnostic**: Discord adapter designed to be extensible to other notification providers
- **Scope Limits**: Focused on outbound notifications and route lockdown, no public frontend

---

## 7. Runtime behavior changes

### Before
- Root endpoint did not exist (would return 404 from Vercel)
- No Discord notification capability
- No admin gate functionality
- Documentation did not emphasize private service posture

### After
- Root endpoint explicitly returns 404 with minimal response
- Discord webhook notifications available for moderation events
- Admin gate middleware available for protected admin endpoints
- Documentation clearly states private service posture and security requirements
- Environment variables documented for Discord and admin configuration

---

## 8. Validation performed

### Commands run
- `npm run build` - TypeScript compilation successful (no errors)

### Tests executed
- TypeScript build validation - Clean build confirmed
- Discord adapter type checking - All types validated

### Manual checks
- Discord adapter interface design verified
- Admin gate logic verified
- Root endpoint implementation verified
- Environment variable documentation verified

---

## 9. Immediate results

### Successes
- **Discord Adapter**: Webhook-based notification adapter implemented with structured message types
- **Admin Gate**: Secure admin authentication with 404 response for invalid attempts
- **Root Protection**: Root endpoint returns 404 to avoid information disclosure
- **Type Safety**: All new code passes TypeScript strict mode compilation
- **Documentation**: Comprehensive documentation of Discord setup and private service posture

### Failures
- None encountered during implementation

### Observations
- Discord adapter is provider-agnostic and can be extended to other notification providers
- Admin gate returns 404 instead of 401 to avoid revealing admin endpoints exist
- Discord notifications not yet integrated into moderation pipeline (future work)

---

## 10. Known limitations / follow-ups

### Current limitations
- **Discord Integration**: Discord adapter not integrated into moderation pipeline yet
- **Admin Endpoints**: No admin endpoints currently implemented (middleware ready for future use)
- **Notification Testing**: Discord webhook not tested with actual Discord server
- **Rate Limiting**: Discord webhook rate limiting not implemented (relies on Discord's built-in limits)

### Follow-ups
- Integrate Discord notifications into moderation pipeline for batch completion/failure
- Add admin endpoints for monitoring and debugging (protected by admin gate)
- Test Discord webhook with actual Discord server
- Add retry logic for failed Discord notifications

---

## 11. Risks introduced

### Deployment risks
- **Environment Configuration**: Discord and admin environment variables must be configured for features to work
- **Webhook Exposure**: Discord webhook URL must be kept secret (stored in environment variables)

### Mitigation strategies
- Discord webhook URL stored in environment variables, never in code
- Admin gate returns 404 to avoid revealing admin endpoints
- Documentation clearly states security requirements
- TypeScript strict mode catches type errors at build time

---

## 12. Decision record (EMBEDDED)

### Decision 1: Use Webhook-Based Discord Notifications
**Context**: Need to send moderation alerts to Discord server
**Options considered**:
- Full Discord bot implementation with command handling
- Webhook-based notifications only
- No Discord integration
**Choice**: Webhook-based notifications only
**Tradeoffs**:
- Pro: Simpler, lighter, no bot token management
- Pro: No need for Discord bot permissions
- Pro: Provider-agnostic design allows future extensions
- Con: No inbound Discord commands (outbound only)
- Con: Relies on Discord webhook rate limits
**Reasoning**: Webhook-based approach is sufficient for outbound notifications, simpler to implement and maintain

### Decision 2: Admin Gate Returns 404 on Failure
**Context**: Need to protect admin endpoints without revealing their existence
**Options considered**:
- Return 401 Unauthorized
- Return 403 Forbidden
- Return 404 Not Found
**Choice**: Return 404 Not Found
**Tradeoffs**:
- Pro: Avoids revealing admin endpoints exist
- Pro: Standard response for non-existent routes
- Pro: Security through obscurity for endpoint discovery
- Con: Less clear error message for legitimate admin users
**Reasoning**: Security through obscurity for endpoint discovery is valuable, 404 is standard for non-existent routes

### Decision 3: Root Endpoint Returns 404
**Context**: Root endpoint should not reveal service information
**Options considered**:
- Return service information
- Return health check
- Return 404
- Return minimal non-informative message
**Choice**: Return 404
**Tradeoffs**:
- Pro: Standard response for non-existent routes
- Pro: Reveals nothing about the service
- Pro: Consistent with admin gate behavior
- Con: No way to confirm service is running at root
**Reasoning**: Private service should not reveal information at root, 404 is standard and safe

### Decision 4: Discord Adapter Not Integrated Yet
**Context**: Discord adapter implemented but not connected to moderation pipeline
**Options considered**:
- Integrate into moderation pipeline immediately
- Implement adapter only, integrate later
- Add notification hooks to pipeline
**Choice**: Implement adapter only, integrate later
**Tradeoffs**:
- Pro: Smaller scope for this pass
- Pro: Adapter can be tested independently
- Pro: Integration can be done with proper testing
- Con: Discord notifications not available until integration
**Reasoning**: Focus on adapter implementation first, integration requires testing with actual moderation pipeline

---

## 13. Next recommended step

### Immediate next step
**Test Discord webhook** with actual Discord server to validate notification delivery.

### Specific actions
1. Create Discord webhook in private server
2. Set DISCORD_WEBHOOK_URL environment variable
3. Test each notification type (batch completed, failed, escalation)
4. Verify message formatting and embed display
5. Test error handling for invalid webhook URL

### Success criteria
- Discord webhook delivers messages successfully
- Message formatting displays correctly in Discord
- Error handling works gracefully for invalid configuration
- All notification types function as expected

### Following steps
- Integrate Discord notifications into moderation pipeline
- Add admin endpoints for monitoring (protected by admin gate)
- Implement retry logic for failed Discord notifications
- Add notification rate limiting
