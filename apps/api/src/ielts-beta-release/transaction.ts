export interface PublishSteps<T> {
  lockAndFingerprint(tx: T): Promise<string>;
  publish(tx: T): Promise<void>;
  readiness(tx: T): Promise<boolean>;
  enableBeta(tx: T): Promise<void>;
}
export async function publishAtomically<T>(transaction: (work: (tx: T) => Promise<void>) => Promise<void>, expected: string, steps: PublishSteps<T>): Promise<void> {
  await transaction(async (tx) => {
    if (await steps.lockAndFingerprint(tx) !== expected) throw new Error('Reviewed release state changed. Run dry run and review again.');
    await steps.publish(tx);
    if (!await steps.readiness(tx)) throw new Error('Release readiness failed; transaction rolled back.');
    await steps.enableBeta(tx);
  });
}
