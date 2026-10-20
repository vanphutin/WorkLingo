export interface IeltsV3Identity {
  role: string;
  status: string;
  onboardingStatus: string;
  programStatus: string;
}

export function canEnterIeltsV3(identity: IeltsV3Identity): boolean {
  return identity.role === 'LEARNER' && identity.status === 'ACTIVE' &&
    identity.onboardingStatus === 'COMPLETE' &&
    (identity.programStatus === 'BETA' || identity.programStatus === 'AVAILABLE');
}
