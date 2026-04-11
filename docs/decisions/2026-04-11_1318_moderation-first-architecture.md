# Moderation-First Architecture Shift

**Timestamp:** 2026-04-11 13:18 EST
**Type:** Architecture Refactor
**Status:** In Progress

---

## Scope of the pass

Reorganize ShadowFlower into a moderation-first service and defer Discord bot interactions for a later pass:
- Audit current ShadowFlower codebase
- Identify core moderation functionality vs optional Discord functionality
- Make moderation-first the main architecture
- Isolate Discord interaction code behind optional feature flag
- Ensure service works without Discord interaction verification
- Update documentation to reflect moderation-first status
- Validate moderation pipeline still works

---

## Why this pass was needed

Previous work focused on making Discord bot production-ready, but this became a blocker for shipping ShadowFlower's core value: private moderation assistance for GameDin. The Discord interaction verification issues were consuming time and preventing the service from being useful.

This pass shifts focus to:
- Moderation pipeline as primary responsibility
- Discord interactions as optional future enhancement
- Service deployment and usefulness without Discord bot support

---

## Files changed

- src/types/config.ts - Added enableDiscordInteractions feature flag to EnvironmentConfig
- src/config/index.ts - Added ENABLE_DISCORD_INTERACTIONS environment variable loading
- src/routes/api/discord/interactions.ts - Added feature flag check to disable endpoint by default
- api/discord/interactions.js - Added feature flag check to disable Vercel function by default
- .env - Added ENABLE_DISCORD_INTERACTIONS=false
- .env.example - Added ENABLE_DISCORD_INTERACTIONS documentation
- README.md - Updated to reflect moderation-first architecture

---

## Architecture / logic changes

### Current State (Audit Results)

**Core Moderation Functionality:**
- src/jobs/moderation-pipeline.ts - Core moderation pipeline with GameDin integration
- src/lib/gamedin-client.ts - GameDin API client
- src/providers/ - AI providers (NVIDIA, etc.)
- src/infrastructure/redis.ts - Redis coordination
- src/security/signing.ts - HMAC signing
- src/security/auth.ts - Authentication
- src/security/route-policy.ts - Route policy
- src/security/audit-logger.ts - Audit logging

**Discord Functionality:**
- src/notifications/discord.ts - Discord webhook notifications (outbound only)
- src/routes/api/discord/interactions.ts - Discord interaction endpoint (inbound slash commands)
- src/security/discord-verification.ts - Discord signature verification
- api/discord/interactions.js - Vercel serverless function for Discord

**Current Discord Integration:**
- Discord configuration is already optional in config/index.ts (lines 137-158)
- Discord notifier is initialized conditionally in moderation-pipeline.ts (lines 43-47)
- Discord notifications are sent conditionally and errors are caught (lines 150-162, 175-183)
- Discord interaction endpoint is a separate route

### Changes Made

**1. Added Feature Flag for Discord Interactions**
- Added ENABLE_DISCORD_INTERACTIONS environment variable
- Made Discord interaction endpoint conditional on this flag
- Default: false (Discord interactions disabled)

**2. Isolated Discord Interaction Code**
- Discord interaction endpoint only registers if ENABLE_DISCORD_INTERACTIONS=true
- Discord notifications remain optional (already implemented via DISCORD_WEBHOOK_URL)
- Service can deploy and run without Discord interaction support

**3. Updated Documentation**
- README updated to reflect moderation-first status
- Decision log created to document architectural shift
- Discord bot support marked as deferred enhancement

---

## Runtime behavior changes

**Before:**
- Discord interaction verification was a blocker for deployment
- Service considered incomplete without Discord bot support
- Time spent debugging Discord endpoint verification issues

**After:**
- Service deploys successfully without Discord interaction support
- Discord interactions are opt-in via ENABLE_DISCORD_INTERACTIONS flag
- Discord notifications remain optional via DISCORD_WEBHOOK_URL
- Service success criteria: moderation pipeline works, GameDin integration works, private routes work, scheduling works, Redis/HMAC protections work

---

## Validation performed

- TypeScript build: Success (no errors)
- Feature flag implementation: ENABLE_DISCORD_INTERACTIONS=false by default
- Discord interaction endpoint: Returns 404 when feature flag is false
- Discord notifications: Remain optional via DISCORD_WEBHOOK_URL
- Core moderation pipeline: Not blocked by Discord configuration
- GameDin integration: Not blocked by Discord configuration
- HMAC signing: Not blocked by Discord configuration
- Redis coordination: Not blocked by Discord configuration

---

## Immediate results

**Successes:**
- Discord interactions successfully isolated behind feature flag
- Service builds without TypeScript errors
- Discord interaction endpoint returns 404 when disabled
- Core moderation pipeline no longer blocked by Discord configuration
- README updated to reflect moderation-first architecture
- Documentation updated to clearly state Discord is optional

**No failures or errors encountered during implementation.**

---

## Known limitations / follow-ups

- Discord slash commands are not available until ENABLE_DISCORD_INTERACTIONS=true is set
- Discord bot endpoint verification is not required for core functionality
- Discord notifications remain optional via DISCORD_WEBHOOK_URL
- To enable Discord interactions in the future: set ENABLE_DISCORD_INTERACTIONS=true and configure Discord bot credentials

---

## Risks introduced

- None - this change reduces risk by removing Discord as a deployment blocker

---

## Decision record (EMBEDDED)

### Decision 1: Make Discord Interactions Optional
- **Context:** Discord interaction verification was blocking deployment and consuming time
- **Options considered:**
  - Continue debugging Discord endpoint verification
  - Defer Discord interactions entirely
  - Make Discord interactions opt-in via feature flag
- **Why this option was chosen:** Feature flag allows Discord interactions to be added later without blocking current deployment
- **Tradeoffs accepted:** Discord slash commands not available until feature flag enabled

### Decision 2: Keep Discord Notifications as Optional
- **Context:** Discord notifications are outbound and already conditional
- **Options considered:**
  - Remove Discord notifications entirely
  - Keep Discord notifications as optional
- **Why this option was chosen:** Discord notifications are simple, stable, and don't block core functionality
- **Tradeoffs accepted:** None - notifications are already optional

### Decision 3: Update Success Criteria
- **Context:** Previous success criteria included Discord bot readiness
- **Options considered:**
  - Keep Discord bot as success criteria
  - Remove Discord bot from success criteria
- **Why this option was chosen:** Moderation pipeline is core value, Discord is enhancement
- **Tradeoffs accepted:** Discord bot support deferred to later pass

---

## Next recommended step

ShadowFlower is now moderation-first and ready for deployment. The service can be deployed and used without Discord interaction support.

To enable Discord interactions in the future:
1. Set ENABLE_DISCORD_INTERACTIONS=true in environment variables
2. Configure Discord bot credentials (DISCORD_APPLICATION_ID, DISCORD_PUBLIC_KEY, DISCORD_BOT_TOKEN)
3. Set Discord interactions endpoint URL in Discord Developer Portal
4. Test Discord slash commands

Current priority: Deploy and validate moderation pipeline functionality.
