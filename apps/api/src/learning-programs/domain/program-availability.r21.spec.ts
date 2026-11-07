import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '@prisma/client';
import { deriveProgramAccess } from './program-availability.js';
import { lockProgram } from '../application/program-command.js';

describe('published Beginner access', () => {
  it('requires release proof as well as completion policy and pins', () => {
    const input = {slug:'beginner',availabilityStatus:'BETA' as const,progressionPolicy:'ACTIVITY_COMPLETION',curriculumRevisionIds:['revision']};
    expect(deriveProgramAccess({...input,hasPublishedRelease:true})).toEqual({destination:'/dashboard',isSelectable:true});
    for (const override of [{hasPublishedRelease:false},{curriculumRevisionIds:[]},{progressionPolicy:'MASTERY'},{availabilityStatus:'COMING_SOON' as const}]) expect(deriveProgramAccess({...input,hasPublishedRelease:true,...override}).isSelectable).toBe(false);
    expect(deriveProgramAccess({...input,slug:'toeic',hasPublishedRelease:true}).isSelectable).toBe(false);
  });
  it('permits official Beginner completion lifecycle while protecting reserved legacy programs', async () => {
    const row = {slug:'beginner',progressionPolicy:'ACTIVITY_COMPLETION',revision:1};
    const tx = {$queryRaw:vi.fn(),learningProgram:{findUnique:vi.fn(async()=>row)}} as unknown as Prisma.TransactionClient;
    await expect(lockProgram(tx,'program',1)).resolves.toMatchObject({slug:'beginner'});
    for (const slug of ['toeic','ielts','intermediate']) {row.slug=slug;await expect(lockProgram(tx,'program')).rejects.toThrow('PROGRAM_RESERVED');}
    row.slug='beginner';row.progressionPolicy='MASTERY';await expect(lockProgram(tx,'program')).rejects.toThrow('PROGRAM_RESERVED');
  });
});
