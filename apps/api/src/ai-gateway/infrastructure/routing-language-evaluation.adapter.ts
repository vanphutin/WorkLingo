import type { AiProviderId, AiRoutingPreference } from '@worklingo/contracts';
import { LanguageEvaluationPort, type LanguageEvaluationInput, type AssessmentCapabilities } from '../domain/language-evaluation.port.js';
import type { LanguageEvaluation } from '../domain/language-evaluation.schema.js';
import { ProviderError } from '../domain/provider-errors.js';
import type {AssessmentProviderInput} from '../../teacher-ai/domain/assessment-orchestrator.js';
import {AssessmentOperations} from './assessment-provider-wire.js';

export interface EvaluationRegistration { readonly adapter: LanguageEvaluationPort; readonly model: string }
export class RoutingLanguageEvaluationAdapter extends LanguageEvaluationPort {
  private readonly assessmentOperations=new AssessmentOperations();
  getAssessmentCapabilities():AssessmentCapabilities {
    return {identitySource:'CONFIGURATION',name:'routing',configuredModel:null,semanticSkills:['reading','listening','speaking','writing'],structuredOutput:'PROVIDER_DEPENDENT',acousticDimensions:[],fallbackPolicy:'NONE',rolePolicy:'PRIMARY_PREFERRED_VERIFIER_ALTERNATE_FEEDBACK_PREFERRED',configuredProviders:Object.values(this.providers).flatMap(provider=>provider.adapter.getAssessmentCapabilities?.()??[])};
  }
  getAssessmentHealth(){return this.assessmentOperations.snapshot();}
  async assess(input:AssessmentProviderInput,signal?:AbortSignal){
    return this.assessmentOperations.observe(async()=>{
    const preference=await this.settings.resolve(input.context.learnerId);
    const selected=input.role==='verifier'?(preference.preferredProvider==='openai'?'discovery':'openai'):preference.preferredProvider;
    const adapter=this.providers[selected]?.adapter;
    if(!adapter?.assess)throw new ProviderError('The explicitly selected assessment role provider is unavailable.',{code:'PROVIDER_UPSTREAM',retryable:false});
    return adapter.assess(input,signal);
    });
  }
  constructor(
    private readonly providers: Partial<Record<AiProviderId, EvaluationRegistration>>,
    private readonly settings: { resolve(userId?: string): Promise<AiRoutingPreference> },
  ) { super(); }

  async evaluate(input: LanguageEvaluationInput): Promise<LanguageEvaluation> { return (await this.evaluateWithProvenance(input)).evaluation; }

  async evaluateWithProvenance(input: LanguageEvaluationInput) {
    const preference = await this.settings.resolve(input.routing?.userId);
    const primary = input.routing?.requiredProvider ?? preference.preferredProvider;
    const secondary: AiProviderId = primary === 'discovery' ? 'openai' : 'discovery';
    try { return await this.call(primary, input); } catch (error) {
      if (input.routing?.requiredProvider || !preference.fallbackEnabled || !this.providers[secondary] || !(error instanceof ProviderError) || error.code === 'PROVIDER_REFUSED' || error.code === 'INVALID_AUDIO' || error.code === 'RECORDING_EXPIRED') throw error;
      return this.call(secondary, input);
    }
  }

  private async call(provider: AiProviderId, input: LanguageEvaluationInput) {
    const registration = this.providers[provider];
    if (!registration) throw new ProviderError('The required AI provider is not configured.', { code: 'PROVIDER_UPSTREAM', retryable: false });
    const evaluation = await registration.adapter.evaluate(input);
    return { evaluation, provenance: { providerName: provider === 'openai' ? 'openai-compatible' : 'discovery', providerModel: registration.model, providerConfigVersion: 'discovery-routing-v1' } };
  }
}
