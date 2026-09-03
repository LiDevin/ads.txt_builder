export const RETENTION_DAYS = 30;

export function eligibleForPermanentDeletionAt(archivedAt: string): string {
  const eligibleDate = new Date(archivedAt);
  eligibleDate.setUTCDate(eligibleDate.getUTCDate() + RETENTION_DAYS);
  return eligibleDate.toISOString();
}

export function isEligibleForPermanentDeletion(archivedAt: string, now: Date = new Date()): boolean {
  return now.getTime() >= new Date(eligibleForPermanentDeletionAt(archivedAt)).getTime();
}
