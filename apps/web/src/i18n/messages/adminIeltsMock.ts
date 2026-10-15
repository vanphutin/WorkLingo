export const adminIeltsMockMessages = {
  en: {
    admin: 'Content Admin', title: 'IELTS Full Mock Workspace', description: 'Author immutable Academic mock versions and complete teacher review for Writing and Speaking.',
    attempt: 'Attempt {id} · version {version, number}', responses: 'Submitted responses', criterion: 'Criterion {index, number}', writingTask1: 'Writing Task 1', writingTask2: 'Writing Task 2', speaking: 'Speaking', strengths: 'Strengths', gaps: 'Gaps', nextAction: 'Required next action', completeReview: 'Complete teacher review',
    selectMock: 'Select mock', moreMocks: 'Load more mocks', status: 'Status {status} · draft revision {revision, number} · published version {version}', none: 'none', source: 'Format 1 JSON content',
    DRAFT: 'Draft', VALIDATED: 'Validated', PUBLISHED: 'Published', ARCHIVED: 'Archived',
    saveDraft: 'Save draft', validate: 'Validate', publish: 'Publish', draftSaved: 'Draft saved.', draftValidated: 'Draft validated.', published: 'Immutable version published.', reviewed: 'Teacher-reviewed report completed.',
    empty: 'No authored mocks found.', reviewQueue: 'Teacher review queue', noReviews: 'No attempts await review.', moreReviews: 'Load more reviews', loading: 'Loading mock workspace...',
    invalidJson: 'Mock content must be valid JSON.', validationIssues: 'Validation issues', invalidField: 'Invalid mock content. Review this field.',
  },
  vi: {
    admin: 'Quản trị nội dung', title: 'Không gian bài thi thử IELTS toàn phần', description: 'Biên soạn các phiên bản cố định của bài thi thử Academic và hoàn tất chấm phần Viết và Nói.',
    attempt: 'Bài làm {id} · phiên bản {version, number}', responses: 'Câu trả lời đã nộp', criterion: 'Tiêu chí {index, number}', writingTask1: 'Viết: bài 1', writingTask2: 'Viết: bài 2', speaking: 'Nói', strengths: 'Điểm mạnh', gaps: 'Điểm cần cải thiện', nextAction: 'Hành động tiếp theo bắt buộc', completeReview: 'Hoàn tất chấm bài',
    selectMock: 'Chọn bài thi thử', moreMocks: 'Tải thêm bài thi thử', status: 'Trạng thái {status} · bản sửa đổi {revision, number} · phiên bản xuất bản {version}', none: 'chưa có', source: 'Nội dung JSON định dạng 1',
    DRAFT: 'Bản nháp', VALIDATED: 'Đã kiểm tra', PUBLISHED: 'Đã xuất bản', ARCHIVED: 'Đã lưu trữ',
    saveDraft: 'Lưu bản nháp', validate: 'Kiểm tra', publish: 'Xuất bản', draftSaved: 'Đã lưu bản nháp.', draftValidated: 'Đã kiểm tra bản nháp.', published: 'Đã xuất bản phiên bản cố định.', reviewed: 'Đã hoàn tất báo cáo chấm bài của giáo viên.',
    empty: 'Chưa có bài thi thử được biên soạn.', reviewQueue: 'Hàng đợi chấm bài', noReviews: 'Không có bài làm chờ chấm.', moreReviews: 'Tải thêm bài chờ chấm', loading: 'Đang tải không gian bài thi thử...',
    invalidJson: 'Nội dung bài thi thử phải là JSON hợp lệ.', validationIssues: 'Lỗi kiểm tra', invalidField: 'Nội dung bài thi thử không hợp lệ. Hãy kiểm tra trường này.',
  },
} as const;
