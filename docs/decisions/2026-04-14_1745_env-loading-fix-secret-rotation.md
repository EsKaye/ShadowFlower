# Environment Variable Loading Fix - Keeping Same Keys

## Timestamp
2026-04-14 17:45 EDT (Updated: 17:53 EDT)

## Scope of the pass
Removed hardcoded secrets from source code, restored proper Vercel environment variable loading, and set environment variables in Vercel to use the same keys that were previously hardcoded.

## Why this pass was needed
- The previous fix for GameDin authentication 401 error involved hardcoding secrets in source code
- Hardcoded secrets in `src/config/index.ts` were: `GAMEDIN_BASE_URL` and `SHADOWFLOWER_SIGNING_SECRET`
- This created a security risk and violated the principle of never committing secrets to version control
- Environment variable loading was working correctly, but hardcoded values were preventing proper env-based configuration
- Decision made to keep using the same keys (not rotate them) and set them in Vercel environment variables

## Files changed
- `/Users/sovereign/Projects/ShadowFlower/src/config/index.ts` - Removed hardcoded `GAMEDIN_BASE_URL` and `SHADOWFLOWER_SIGNING_SECRET`, restored `process.env` reading
- `/Users/sovereign/Projects/ShadowFlower/.env.example` - Marked `SHADOWFLOWER_SIGNING_SECRET` as REQUIRED, added secret rotation documentation
- `/Users/sovereign/Projects/ShadowFlower/README.md` - Marked `SHADOWFLOWER_SIGNING_SECRET` as REQUIRED, added secret rotation section

## Architecture / logic changes
- **Config loading**: Changed from hardcoded values to environment variable-based loading in `getEnvironmentConfig()`
- **No architectural changes**: The module system (CommonJS) and import paths remain unchanged from the previous fix
- **Validation**: Secret strength validation remains in place for environment variables

## Runtime behavior changes
- Configuration now reads from Vercel environment variables instead of hardcoded values
- Health endpoint returns 200 OK (no FUNCTION_INVOCATION_FAILED)
- GameDin connectivity shows "disconnected" after setting environment variables
- No hardcoded secrets remain in source code

## Validation performed
- Built project successfully with `npm run build`
- Deployed to production with `vercel --prod`
- Checked git history for hardcoded secret - no matches found (secret was never committed to git)
- Removed and re-added `SHADOWFLOWER_SIGNING_SECRET` in Vercel production with the same value that was hardcoded
- Removed and re-added `GAMEDIN_BASE_URL` in Vercel production with the same value that was hardcoded
- Tested health endpoint: `curl -H "Authorization: Bearer j9ldXKnIVFyiyqReHPp32ARdZm33ngFxdYs1hGsrYL2MeGN2F+l2BFUc3wfjJDyC" https://sf.gamedin.xyz/api/health` - Returns 200 with GameDin "disconnected"
- Confirmed no hardcoded secrets remain in `src/config/index.ts`

## Immediate results
- **Success**: Hardcoded secrets removed from source code
- **Success**: Environment variable loading restored
- **Success**: Health endpoint returns 200 (no FUNCTION_INVOCATION_FAILED)
- **Success**: Environment variables set in Vercel production with same values that were hardcoded
- **Success**: Git history check confirms hardcoded secret was never committed
- **Observation**: GameDin connectivity still shows "disconnected" even after setting environment variables
- **Observation**: The module system fix (CommonJS + correct import paths) remains in place and working

## Known limitations / follow-ups
- **Issue**: GameDin connectivity still shows "disconnected" after setting environment variables with the same values that were hardcoded
- **Investigation needed**: Determine why GameDin health check is failing despite correct environment variables
- **Possible causes**: Environment variable propagation delay, GameDin service availability, or health check logic issue

## Risks introduced
- **No additional security risks**: Decision made to keep using the same keys (not rotate them)
- **Operational risk**: GameDin connectivity not working despite correct environment variable configuration

## Decision record

### Decision 1: Remove hardcoded secrets and restore env-based loading
- **Context**: Previous fix hardcoded secrets to unblock GameDin authentication, but this created security risk
- **Options considered**:
  1. Keep hardcoded values (rejected - security risk)
  2. Restore env-based loading and rotate secret (rejected - user chose to keep same keys)
  3. Restore env-based loading and keep using same keys (chosen)
- **Why this option was chosen**: User requested to keep using the same keys that were hardcoded
- **Tradeoffs accepted**: No secret rotation, but this aligns with user request

### Decision 2: Keep using the same keys (not rotate)
- **Context**: User explicitly requested to keep using the same keys instead of rotating them
- **Options considered**:
  1. Rotate the secret (rejected - user requested to keep same keys)
  2. Keep using the same keys (chosen)
- **Why this option was chosen**: User explicitly requested this approach
- **Tradeoffs accepted**: No security improvement from rotation, but this aligns with user request

### Decision 3: Check git history for hardcoded secrets
- **Context**: Need to ensure hardcoded secrets were not committed to git history
- **Options considered**:
  1. Assume they were committed and clean up (rejected - inefficient)
  2. Check git history first (chosen)
- **Why this option was chosen**: Efficient approach - only clean up if needed
- **Tradeoffs accepted**: None
- **Result**: No hardcoded secrets found in git history - no cleanup needed

### Decision 4: Set environment variables in Vercel with same values
- **Context**: Need to set environment variables in Vercel to match the hardcoded values
- **Options considered**:
  1. Use new values (rejected - user requested to keep same keys)
  2. Use same values that were hardcoded (chosen)
- **Why this option was chosen**: User requested to keep using the same keys
- **Tradeoffs accepted**: None - this is what was requested

## Next recommended step
1. Investigate why GameDin connectivity still shows "disconnected" despite setting environment variables with the same values that were hardcoded
2. Check Vercel function logs for any errors during the health check
3. Verify that environment variables are being read correctly in the deployed environment
4. Test the GameDin health check directly to isolate the issue
