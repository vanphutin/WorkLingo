import { useState } from 'react';
import type { EvaluationDto } from '@worklingo/contracts';
import { EvaluationFeedback } from '../../src/features/learning-session/evaluation-feedback';
import { GlassSurface } from '../../src/components/glass-surface';
import { ThemeControl } from '../../src/components/theme-control';
import { TransparencyControl, TransparencySync } from '../../src/components/transparency-control';
import { LocaleProvider } from '../../src/i18n/provider';

const failed: EvaluationDto = {
  attemptId: '00000000-0000-4000-8000-000000000001', status: 'evaluation_failed',
  transcript: null, score: null, scores: null, feedback: null, retryable: true,
  recording: { id: '00000000-0000-4000-8000-000000000002', retentionUntil: '2026-10-25T08:00:00.000Z', deletedAt: null },
  completedAt: null,
};
const evaluated: EvaluationDto = { ...failed, status: 'evaluated', score: .82, scores: {
  taskCompletion: .9, meaningAndLogic: .8, targetLanguage: .75, clarity: .85, pronunciationOrFluency: null,
}, feedback: {
  summary: 'Thông điệp rõ ràng và đúng mục tiêu giao tiếp trong công việc',
  strengths: ['Nêu đúng hành động cần làm'], improvements: ['Thêm thời hạn cụ thể'],
  correctedExample: 'Could you send the report by 3 p.m.?',
} };

// Only test state and service outcomes are simulated. Render real feedback/preferences
// and native markup using production classes; no showcase route or product abstraction.
export function CoreFixture() {
  const [evaluation, setEvaluation] = useState<EvaluationDto | null>(failed);
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <LocaleProvider initialLocale="vi"><TransparencySync /><main>
    <h1>Điều khiển và phản hồi WorkLingo</h1>
    <GlassSurface className="fixture-tools"><ThemeControl /><TransparencyControl /><span data-swatch aria-hidden="true" /></GlassSurface>
    <section className="fixture-card" aria-label="Biểu mẫu">
      <form onSubmit={(event) => { event.preventDefault(); setError('Vui lòng kiểm tra thông tin đã nhập.'); }}>
        <div className="field-group"><label htmlFor="core-search">Tìm kiếm nội dung học tập bằng từ khóa dài</label><input id="core-search" type="search" placeholder="Nhập từ khóa" /></div>
        <div className="field-group"><label htmlFor="core-password">Mật khẩu</label><input id="core-password" type="password" autoComplete="current-password" /></div>
        <div className="writing-input-group"><label htmlFor="core-draft">Bản nháp câu trả lời</label><textarea className="writing-textarea" id="core-draft" defaultValue="Câu trả lời chưa hoàn thành" /></div>
        <div className="field-group"><label htmlFor="core-invalid">Thông tin cần kiểm tra</label><input id="core-invalid" aria-invalid="true" aria-describedby="core-error" /><p className="feedback-error" id="core-error">Vui lòng nhập câu trả lời đầy đủ.</p></div>
        <div className="field-group"><label htmlFor="core-readonly">Chỉ đọc</label><input id="core-readonly" value="Đã lưu" readOnly /></div>
        <div className="field-group"><label htmlFor="core-disabled">Không khả dụng</label><input id="core-disabled" value="Đang xử lý" disabled readOnly /></div>
        <div className="field-group"><label htmlFor="core-select">Lựa chọn nguồn âm thanh</label><select className="field-select" id="core-select"><option>Nguồn âm thanh mặc định</option><option>Nguồn thay thế</option></select></div>
        <label className="recording-consent"><input type="checkbox" />Tôi đồng ý ghi âm để nhận phản hồi cho bài luyện nói này</label>
        <fieldset><legend>Lựa chọn câu trả lời</legend><label className="option-label"><input type="radio" name="answer" value="a" defaultChecked />Câu trả lời được chọn</label><label className="option-label"><input type="radio" name="answer" value="b" />Câu trả lời thứ hai</label></fieldset>
        <div className="fixture-actions"><button className="primary-button" type="submit">Lưu và tiếp tục với câu trả lời hiện tại</button><button className="secondary-button" type="reset">Xóa nội dung biểu mẫu</button><button className="primary-button" type="button" disabled>Đang lưu câu trả lời</button></div>
      </form>
    </section>
    <div className="fixture-actions" aria-label="Điều khiển fixture">
      <button type="button" className="secondary-button" onClick={() => { setEvaluation({ ...failed, status: 'processing' }); window.addEventListener('fixture-evaluation-complete', () => setEvaluation(evaluated), { once: true }); }}>Hoàn tất đánh giá</button>
      <button type="button" className="secondary-button" onClick={() => { setEvaluation(failed); setRetrying(false); }}>Hiện lỗi đánh giá</button>
      <button type="button" className="secondary-button" onClick={() => setEvaluation(null)}>Ẩn phản hồi</button>
    </div>
    <output aria-label="Số lần thử lại">{retryCount}</output>
    <EvaluationFeedback evaluation={evaluation} error={error} isRetrying={retrying} onRetry={() => { setRetryCount((n) => n + 1); setRetrying(true); }}
      onDeleteRecording={() => setDeleted(true)} recordingDeleted={deleted} />
    <button type="button" className="primary-action-button">Tiếp tục bài học</button>
    <div className="fixture-actions" aria-label="Trạng thái hover">
      {['continue-button', 'retry-button', 'recording-stop-button', 'toggle-panel-button'].map((className) => <div key={className}><button type="button" className={className}>{className}</button><button type="button" className={className} disabled>{className} disabled</button></div>)}
    </div>
    <div className="fixture-statuses"><p className="submit-error-banner" role="alert">Không thể lưu. Vui lòng thử lại.</p><p className="session-paused-banner" role="status">Bài học đã tạm dừng</p><span className="status-badge status-improving">Tiến bộ</span><span className="status-badge status-needs_attention">Cần luyện tập</span><span className="status-badge status-steady">Ổn định</span><span className="status-badge status-insufficient_evidence">Chưa đủ dữ liệu</span></div>
    <div className="admin-shell fixture-table"><table><caption>Dữ liệu học tập</caption><thead><tr><th>Kỹ năng</th><th>Trạng thái</th></tr></thead><tbody><tr><td>Nói</td><td>Đã lưu</td></tr></tbody></table></div>
  </main></LocaleProvider>;
}
