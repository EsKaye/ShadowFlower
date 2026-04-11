/**
 * Scheduler-triggered moderation job endpoint
 * Supports both Vercel cron and external schedulers (e.g., QStash)
 * Scheduler-agnostic - can be called by any authorized scheduler
 */
import { VercelResponse } from '@vercel/node';
import { AuthenticatedRequest } from '../../../../security/auth';
declare const _default: (req: AuthenticatedRequest, res: VercelResponse) => Promise<void>;
export default _default;
//# sourceMappingURL=schedule.d.ts.map