export const adminIeltsIntegratedMessages = {
  en: {
    curriculum: 'IELTS curriculum', title: 'Integrated Practice profiles', description: 'Configure immutable time allocation profiles. Duration and difficulty remain independent learner choices.',
    profiles: 'Duration profiles', minutes: '{count, number} min', allocation: '{count, number}-minute allocation', total: 'Total:', totalMinutes: '{total, number} / {duration, number} minutes',
    DRAFT: 'Draft', VALIDATED: 'Validated', PUBLISHED: 'Published', ARCHIVED: 'Archived', revision: '{status} · draft revision {revision, number}',
    listening: 'listening', reading: 'reading', writing: 'writing', speaking: 'speaking',
    saveDraft: 'Save draft', saveValidate: 'Save & validate', publishVersion: 'Publish version', draftSaved: 'Draft saved.', ready: 'Draft saved and ready to publish.', published: 'Published immutable version {version, number}.', loading: 'Loading profiles...', empty: 'No duration profiles found.',
    validationIssues: 'Validation issues', invalidField: 'Invalid profile. Review this field.', allocationSkills: 'Allocations must contain each skill exactly once', allocationTotal: 'Allocation minutes must equal session duration',
  },
  vi: {
    curriculum: 'Chương trình IELTS', title: 'Cấu hình luyện tập tổng hợp', description: 'Cấu hình phân bổ thời gian với phiên bản cố định. Thời lượng và độ khó vẫn là lựa chọn độc lập của học viên.',
    profiles: 'Cấu hình thời lượng', minutes: '{count, number} phút', allocation: 'Phân bổ {count, number} phút', total: 'Tổng:', totalMinutes: '{total, number} / {duration, number} phút',
    DRAFT: 'Bản nháp', VALIDATED: 'Đã kiểm tra', PUBLISHED: 'Đã xuất bản', ARCHIVED: 'Đã lưu trữ', revision: '{status} · bản sửa đổi {revision, number}',
    listening: 'Nghe', reading: 'Đọc', writing: 'Viết', speaking: 'Nói',
    saveDraft: 'Lưu bản nháp', saveValidate: 'Lưu và kiểm tra', publishVersion: 'Xuất bản phiên bản', draftSaved: 'Đã lưu bản nháp.', ready: 'Đã lưu bản nháp và sẵn sàng xuất bản.', published: 'Đã xuất bản phiên bản cố định {version, number}.', loading: 'Đang tải cấu hình...', empty: 'Chưa có cấu hình thời lượng.',
    validationIssues: 'Lỗi kiểm tra', invalidField: 'Cấu hình không hợp lệ. Hãy kiểm tra trường này.', allocationSkills: 'Mỗi kỹ năng phải được phân bổ đúng một lần', allocationTotal: 'Tổng số phút phân bổ phải bằng thời lượng buổi học',
  },
} as const;
