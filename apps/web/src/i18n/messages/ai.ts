export const aiMessages = {
  en: {
    routingDisabled: 'AI selection is managed by server configuration during rollback.',
    title: 'AI settings', systemTitle: 'System AI settings', description: 'Choose how your speaking and writing responses are evaluated.', systemDescription: 'Set the default provider and fallback policy for accounts using system defaults.',
    loading: 'Loading AI settings…', loadError: 'AI settings could not be loaded.', retry: 'Retry', preferred: 'Preferred AI provider', automatic: 'Use system default', discovery: 'Discovery', openai: 'OpenAI',
    fallback: 'Allow fallback to the other provider', fallbackWarning: 'Fallback may use paid OpenAI requests. It runs only when the selected provider fails, with at most one switch per evaluation attempt.',
    policyDisabled: 'Fallback is disabled by system policy.', available: 'Configured', unavailable: 'Not configured', effective: 'Current default: {provider}', tokenCap: 'Maximum output per request: {tokens} tokens.',
    openaiOnly: 'Tasks requiring OpenAI capabilities always use OpenAI. Speech recognition, pronunciation and generated audio keep their separate speech provider.',
    simulation: 'Simulation mode is active. No live AI provider is called.', calibration: 'Provider configuration does not confirm grading quality. Human calibration is required before relying on scores.',
    save: 'Save AI settings', saving: 'Saving…', saved: 'AI settings saved.', readOnly: 'Only system administrators can change global AI settings.', aiDescription: 'Choose evaluation provider and fallback preferences.',
  },
  vi: {
    routingDisabled: 'Trong chế độ rollback, nhà cung cấp AI do cấu hình server quản lý.',
    title: 'Cài đặt AI', systemTitle: 'Cài đặt AI hệ thống', description: 'Chọn cách đánh giá bài nói và bài viết của bạn.', systemDescription: 'Chọn nhà cung cấp mặc định và chính sách dự phòng cho các tài khoản dùng cài đặt hệ thống.',
    loading: 'Đang tải cài đặt AI…', loadError: 'Không thể tải cài đặt AI.', retry: 'Thử lại', preferred: 'Nhà cung cấp AI ưu tiên', automatic: 'Dùng mặc định hệ thống', discovery: 'Discovery', openai: 'OpenAI',
    fallback: 'Cho phép dùng nhà cung cấp dự phòng', fallbackWarning: 'Dự phòng có thể phát sinh phí OpenAI. Chỉ chuyển khi nhà cung cấp đã chọn gặp lỗi, tối đa một lần mỗi lượt đánh giá.',
    policyDisabled: 'Chính sách hệ thống đang tắt dự phòng.', available: 'Đã cấu hình', unavailable: 'Chưa cấu hình', effective: 'Mặc định hiện tại: {provider}', tokenCap: 'Đầu ra tối đa mỗi yêu cầu: {tokens} token.',
    openaiOnly: 'Tác vụ cần khả năng riêng của OpenAI luôn dùng OpenAI. Nhận diện giọng nói, điểm phát âm và tạo âm thanh vẫn dùng nhà cung cấp giọng nói riêng.',
    simulation: 'Đang dùng chế độ mô phỏng. Không gọi nhà cung cấp AI thật.', calibration: 'Cấu hình nhà cung cấp chưa xác nhận chất lượng chấm bài. Cần hiệu chuẩn bởi người trước khi tin cậy điểm số.',
    save: 'Lưu cài đặt AI', saving: 'Đang lưu…', saved: 'Đã lưu cài đặt AI.', readOnly: 'Chỉ quản trị viên hệ thống có thể thay đổi cài đặt AI chung.', aiDescription: 'Chọn nhà cung cấp đánh giá và cách dùng dự phòng.',
  },
} as const;
