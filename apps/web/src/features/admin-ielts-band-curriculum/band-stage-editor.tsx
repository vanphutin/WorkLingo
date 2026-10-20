import type { IeltsBandStage } from '@worklingo/contracts';
import { useT } from '../../i18n/provider';
import { adminIeltsBandMessages } from '../../i18n/messages/adminIeltsBand';

type StagePatch = Partial<IeltsBandStage>;

function StringList({ title, values, limit, multiline = false, onChange }: {
  readonly title: string; readonly values: readonly string[]; readonly limit: number;
  readonly multiline?: boolean; readonly onChange: (values: string[]) => void;
}) {
  const t = useT('adminIeltsBand', adminIeltsBandMessages);
  return <fieldset><legend>{title}</legend>
    {values.map((value, index) => <div className="band-editor__row" key={index}>
      <label>{t('item', { index: index + 1 })}{multiline
        ? <textarea lang="en" rows={3} value={value} onChange={(event) => onChange(values.map((item, i) => i === index ? event.target.value : item))} />
        : <input lang="en" value={value} onChange={(event) => onChange(values.map((item, i) => i === index ? event.target.value : item))} />}</label>
      <button type="button" disabled={values.length <= 1} onClick={() => onChange(values.filter((_, i) => i !== index))}>{t('removeItem', { index: index + 1 })}</button>
    </div>)}
    <button type="button" disabled={values.length >= limit} onClick={() => onChange([...values, ''])}>{t('addItem')}</button>
  </fieldset>;
}

export function BandStageEditor({ stage, onChange, disabled }: {
  readonly stage: IeltsBandStage; readonly onChange: (patch: StagePatch) => void; readonly disabled: boolean;
}) {
  const t = useT('adminIeltsBand', adminIeltsBandMessages);
  const skills = ['listening', 'reading', 'writing', 'speaking'] as const;
  return <fieldset className="band-editor" disabled={disabled}>
    <legend>{t('stageSettings')}</legend>
    <label>{t('stageTitle')}<input lang="en" value={stage.title} onChange={(event) => onChange({ title: event.target.value })} /></label>
    <details><summary>{t('fixedTopology')}</summary><div className="band-editor__grid">
      <label>{t('stageCode')}<input value={stage.code} readOnly /></label>
      <label>{t('stageOrderLabel')}<input type="number" value={stage.order} readOnly /></label>
      <label>{t('targetFrom')}<input type="number" value={stage.targetBand.from} readOnly /></label>
      <label>{t('targetTo')}<input type="number" value={stage.targetBand.to} readOnly /></label>
      <label>{t('prerequisites')}<input value={stage.prerequisiteStageCodes.join(', ')} readOnly /></label>
    </div></details>
    <StringList title={t('learningOutcomes')} values={stage.learningOutcomes} limit={12} multiline onChange={(learningOutcomes) => onChange({ learningOutcomes })} />
    <StringList title={t('lessonCategories')} values={stage.lessonCategories} limit={12} onChange={(lessonCategories) => onChange({ lessonCategories })} />
    <fieldset><legend>{t('competencies')}</legend>
      {stage.competencies.map((competency, index) => <fieldset key={index}><legend>{t('competencyNumber', { index: index + 1 })}</legend>
        <label>{t('competencyCode')}<input value={competency.code} onChange={(event) => onChange({ competencies: stage.competencies.map((item, i) => i === index ? { ...item, code: event.target.value } : item) })} /></label>
        <label>{t('skill')}<select value={competency.skill} onChange={(event) => onChange({ competencies: stage.competencies.map((item, i) => i === index ? { ...item, skill: event.target.value as typeof item.skill } : item) })}>{skills.map((skill) => <option key={skill} value={skill}>{t(skill)}</option>)}</select></label>
        <label>{t('competencyTitle')}<input lang="en" value={competency.title} onChange={(event) => onChange({ competencies: stage.competencies.map((item, i) => i === index ? { ...item, title: event.target.value } : item) })} /></label>
        <label>{t('competencyDescription')}<textarea lang="en" rows={3} value={competency.description} onChange={(event) => onChange({ competencies: stage.competencies.map((item, i) => i === index ? { ...item, description: event.target.value } : item) })} /></label>
        <button type="button" disabled={stage.competencies.length <= 4} onClick={() => onChange({ competencies: stage.competencies.filter((_, i) => i !== index) })}>{t('removeCompetency', { index: index + 1 })}</button>
      </fieldset>)}
      <button type="button" disabled={stage.competencies.length >= 24} onClick={() => onChange({ competencies: [...stage.competencies, { code: '', skill: 'listening', title: '', description: '' }] })}>{t('addCompetency')}</button>
    </fieldset>
    <StringList title={t('recommendedActivities')} values={stage.recommendedActivities} limit={16} onChange={(recommendedActivities) => onChange({ recommendedActivities })} />
    <StringList title={t('assessmentCriteria')} values={stage.assessmentCriteria} limit={12} multiline onChange={(assessmentCriteria) => onChange({ assessmentCriteria })} />
    <fieldset><legend>{t('remediationPaths')}</legend>
      {stage.remediationPaths.map((path, index) => <fieldset key={path.skill}><legend>{t(path.skill)}</legend>
        <label>{t('remediationTitle')}<input lang="en" value={path.title} onChange={(event) => onChange({ remediationPaths: stage.remediationPaths.map((item, i) => i === index ? { ...item, title: event.target.value } : item) })} /></label>
        <label>{t('remediationAction')}<textarea lang="en" rows={3} value={path.action} onChange={(event) => onChange({ remediationPaths: stage.remediationPaths.map((item, i) => i === index ? { ...item, action: event.target.value } : item) })} /></label>
      </fieldset>)}
    </fieldset>
    <StringList title={t('practiceFormats')} values={stage.suggestedPracticeFormats} limit={12} onChange={(suggestedPracticeFormats) => onChange({ suggestedPracticeFormats })} />
    <fieldset><legend>{t('exitCriteria')}</legend><div className="band-editor__grid">
      <label>{t('minimumSessions')}<input type="number" min={1} max={100} step={1} value={stage.exitCriteria.minimumCompletedSessions} onChange={(event) => onChange({ exitCriteria: { ...stage.exitCriteria, minimumCompletedSessions: Number(event.target.value) } })} /></label>
      <label>{t('minimumSamples')}<input type="number" min={1} max={100} step={1} value={stage.exitCriteria.minimumSamplesPerSkill} onChange={(event) => onChange({ exitCriteria: { ...stage.exitCriteria, minimumSamplesPerSkill: Number(event.target.value) } })} /></label>
      <label>{t('minimumRate')}<input type="number" min={0.5} max={1} step={0.01} value={stage.exitCriteria.minimumCorrectRate} onChange={(event) => onChange({ exitCriteria: { ...stage.exitCriteria, minimumCorrectRate: Number(event.target.value) } })} /></label>
    </div></fieldset>
  </fieldset>;
}
