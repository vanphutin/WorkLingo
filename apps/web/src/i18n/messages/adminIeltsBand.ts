export const adminIeltsBandMessages = {
  en: {
    admin: 'IELTS curriculum administration', title: 'Band Curriculum', description: 'Author seven contiguous stages and publish immutable versions for learner journeys.',
    loading: 'Loading Band Curriculum...', stages: 'Band curriculum stages', source: 'Stage definition JSON', revision: '{status} · draft revision {revision, number}',
    DRAFT: 'Draft', VALIDATED: 'Validated', PUBLISHED: 'Published', ARCHIVED: 'Archived',
    saveDraft: 'Save draft', saveValidate: 'Save & validate', publishVersion: 'Publish version', draftSaved: 'Draft saved.', ready: 'Draft saved and ready to publish.', published: 'Published immutable version {version, number}.',
    notLoaded: 'Curriculum is not loaded.', invalidJson: 'Stage definition must be valid JSON.', validationIssues: 'Validation issues', invalidField: 'Invalid stage definition. Review this field.',
    increasingRange: 'Target band range must increase', uniqueCompetencies: 'Competency codes must be unique within a stage', uniqueStages: 'Stage codes must be unique', stageOrder: 'Stage order must be contiguous', prerequisite: 'Each stage must depend only on the immediately preceding stage', contiguousRange: 'Target ranges must be contiguous', missingCompetency: 'Missing {skill} competency', missingRemediation: 'Missing {skill} remediation',
    listening: 'listening', reading: 'reading', writing: 'writing', speaking: 'speaking',
  },
  vi: {
    admin: 'Quản trị chương trình IELTS', title: 'Chương trình theo band', description: 'Biên soạn bảy giai đoạn liên tiếp và xuất bản các phiên bản cố định cho lộ trình học viên.',
    loading: 'Đang tải chương trình theo band...', stages: 'Các giai đoạn chương trình theo band', source: 'JSON định nghĩa giai đoạn', revision: '{status} · bản sửa đổi {revision, number}',
    DRAFT: 'Bản nháp', VALIDATED: 'Đã kiểm tra', PUBLISHED: 'Đã xuất bản', ARCHIVED: 'Đã lưu trữ',
    saveDraft: 'Lưu bản nháp', saveValidate: 'Lưu và kiểm tra', publishVersion: 'Xuất bản phiên bản', draftSaved: 'Đã lưu bản nháp.', ready: 'Đã lưu bản nháp và sẵn sàng xuất bản.', published: 'Đã xuất bản phiên bản cố định {version, number}.',
    notLoaded: 'Chưa tải chương trình.', invalidJson: 'Định nghĩa giai đoạn phải là JSON hợp lệ.', validationIssues: 'Lỗi kiểm tra', invalidField: 'Định nghĩa giai đoạn không hợp lệ. Hãy kiểm tra trường này.',
    increasingRange: 'Khoảng band mục tiêu phải tăng dần', uniqueCompetencies: 'Mã năng lực phải duy nhất trong mỗi giai đoạn', uniqueStages: 'Mã giai đoạn phải duy nhất', stageOrder: 'Thứ tự giai đoạn phải liên tiếp', prerequisite: 'Mỗi giai đoạn chỉ được yêu cầu giai đoạn ngay trước đó', contiguousRange: 'Các khoảng mục tiêu phải liên tiếp', missingCompetency: 'Thiếu năng lực {skill}', missingRemediation: 'Thiếu lộ trình khắc phục cho kỹ năng {skill}',
    listening: 'Nghe', reading: 'Đọc', writing: 'Viết', speaking: 'Nói',
  },
} as const;
