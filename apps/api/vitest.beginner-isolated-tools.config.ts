import unit from './vitest.beginner.config';
export default {
  ...unit,
  test: {
    ...unit.test,
    include: [
      'src/beginner/domain/beginner-environment-preflight.spec.ts',
      'test/beginner-isolated/environment.spec.ts',
    ],
  },
};
