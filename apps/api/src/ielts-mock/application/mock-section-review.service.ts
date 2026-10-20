import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ieltsMockContentSchema, mockSectionReviewSchema, type MockSectionReviewDto } from '@worklingo/contracts';
import { PrismaService } from '../../common/database/prisma.service.js';
import { scoreObjectiveAnswer } from '../domain/ielts-mock-scoring.js';
import { mockAttemptInclude, mockResponses, mockSubmitted } from './mock-attempt-state.js';

@Injectable()
export class MockSectionReviewService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  async review(learnerId: string, attemptId: string, section: string): Promise<MockSectionReviewDto> {
    const attempt = await this.db.ieltsMockAttempt.findFirst({ where: { id: attemptId, learnerId }, include: mockAttemptInclude });
    if (!attempt) throw new NotFoundException('IELTS mock attempt not found.');
    if (attempt.policyVersion !== 'v2' || attempt.mode !== 'PRACTICE' || !mockSubmitted(attempt.submittedSections).includes(section)) throw new ConflictException({ code: 'IELTS_MOCK_FEEDBACK_NOT_RELEASED' });
    const content = ieltsMockContentSchema.parse(attempt.mockTestVersion.content);
    const questions = section === 'LISTENING' ? content.listening.parts.flatMap(part => part.questions) : section === 'READING' ? content.reading.passages.flatMap(passage => passage.questions) : [];
    const responses = mockResponses(attempt.responses);
    return mockSectionReviewSchema.parse({ section, questions: questions.map(question => ({ id: question.id, prompt: question.prompt, response: responses[question.id] ?? '', acceptedAnswers: question.answerPolicy.acceptedAnswers, explanation: question.explanation, correct: scoreObjectiveAnswer(responses[question.id] ?? '', question.answerPolicy) })), transcripts: section === 'LISTENING' ? content.listening.parts.flatMap(part => part.transcript ? [{ part: part.part, text: part.transcript }] : []) : [] });
  }
}
