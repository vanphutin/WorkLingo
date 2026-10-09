import {
  LanguageEvaluationPort,
  type LanguageEvaluationInput,
} from '../domain/language-evaluation.port.js';
import type { LanguageEvaluation } from '../domain/language-evaluation.schema.js';
import { ProviderError } from '../domain/provider-errors.js';

const PROMPT_INJECTION = /ignore (?:the |all )?(?:previous )?(?:rubric|instructions?)/i;

export class FakeLanguageEvaluationAdapter extends LanguageEvaluationPort {
  private readonly rateLimitFailures: number;
  private readonly rateLimitFailuresByResponse = new Map<string, number>();

  constructor(options: { readonly rateLimitFailures?: number } = {}) {
    super();
    this.rateLimitFailures = options.rateLimitFailures ?? 0;
  }

  async evaluate(input: LanguageEvaluationInput): Promise<LanguageEvaluation> {
    const usesRateLimitFixture = this.rateLimitFailures > 0 &&
      input.learnerResponse.includes('[e2e-rate-limit');
    const remainingFailures = usesRateLimitFixture
      ? (this.rateLimitFailuresByResponse.get(input.learnerResponse) ?? this.rateLimitFailures)
      : 0;
    if (remainingFailures > 0) {
      this.rateLimitFailuresByResponse.set(input.learnerResponse, remainingFailures - 1);
      throw new ProviderError('Deterministic E2E provider rate limit.', {
        code: 'PROVIDER_RATE_LIMITED',
        retryable: true,
      });
    }
    const response = input.learnerResponse.trim();
    const normalizedResponse = response.toLocaleLowerCase('en-US');
    const hasRequiredPhrases = input.requiredPhrases.every((phrase) => (
      normalizedResponse.includes(phrase.toLocaleLowerCase('en-US'))
    ));
    const completed = response.length >= 20 && !PROMPT_INJECTION.test(response);

    if (!completed) {
      return {
        scores: {
          taskCompletion: 0.2,
          meaningAndLogic: 0.2,
          targetLanguage: 0.2,
          clarity: 0.3,
        },
        feedback: {
          summary: 'Câu trả lời chưa hoàn thành đúng yêu cầu của nhiệm vụ.',
          strengths: response.length > 0 ? ['Bạn đã bắt đầu đưa ra câu trả lời.'] : [],
          improvements: ['Trả lời trực tiếp yêu cầu và dùng đầy đủ cụm từ mục tiêu.'],
          correctedExample: input.referenceText ?? null,
        },
      };
    }

    return {
      scores: {
        taskCompletion: 0.8,
        meaningAndLogic: 0.8,
        targetLanguage: hasRequiredPhrases ? 0.85 : 0.2,
        clarity: 0.8,
      },
      feedback: {
        summary: hasRequiredPhrases
          ? 'Bạn đã hoàn thành nhiệm vụ và truyền đạt ý rõ ràng.'
          : 'Bạn đã trả lời đúng nhiệm vụ nhưng còn thiếu cụm từ mục tiêu.',
        strengths: ['Nội dung bám sát bối cảnh giao tiếp công việc.'],
        improvements: hasRequiredPhrases
          ? ['Tiếp tục luyện để câu trả lời tự nhiên hơn.']
          : ['Bổ sung đầy đủ cụm từ mục tiêu vào câu trả lời.'],
        correctedExample: input.referenceText ?? response,
      },
    };
  }
}
