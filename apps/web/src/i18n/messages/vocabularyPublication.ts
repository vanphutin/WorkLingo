export const vocabularyPublicationMessages = {
  en: {
    title: 'Review vocabulary meanings', help: 'Choose a meaning for each matching expression. Reusing shares the meaning and review progress; each lesson keeps its own topic context.',
    loading: 'Checking existing vocabulary…', retry: 'Check vocabulary again', topic: 'Publishing under topic: {name}', ungrouped: 'No topic assigned',
    progress: '{done, number} of {total, number} vocabulary entries resolved', incoming: 'Meaning in this lesson: {meaning}',
    duplicate: 'This expression already exists. Choose deliberately; nothing is merged automatically.',
    fresh: 'Not found in the catalog. A new meaning will be created.', reuse: 'Use existing meaning: {meaning}', create: 'Create a new meaning: {meaning}',
    origin: 'Original word bank: {name}', contexts: 'Currently used in:', noContexts: 'No currently published lesson uses this meaning.',
    more: '{count, number} more published uses', source: 'JSON identifier: {slug}',
  },
  vi: {
    title: 'Duyệt nghĩa từ vựng', help: 'Chọn nghĩa cho từng từ đã có. Dùng lại sẽ dùng chung nghĩa và tiến độ ôn tập; mỗi bài vẫn lưu ngữ cảnh topic riêng.',
    loading: 'Đang kiểm tra từ vựng đã có…', retry: 'Kiểm tra lại từ vựng', topic: 'Xuất bản trong chủ đề: {name}', ungrouped: 'Chưa phân chủ đề',
    progress: 'Đã chọn {done, number} trên {total, number} mục từ vựng', incoming: 'Nghĩa trong bài này: {meaning}',
    duplicate: 'Từ này đã có trong hệ thống. Cần chọn nghĩa, hệ thống không tự gộp.',
    fresh: 'Chưa có trong danh mục. Hệ thống sẽ tạo nghĩa mới.', reuse: 'Dùng lại nghĩa có sẵn: {meaning}', create: 'Tạo nghĩa mới: {meaning}',
    origin: 'Bộ từ gốc: {name}', contexts: 'Đang được dùng trong:', noContexts: 'Chưa có bài đang xuất bản sử dụng nghĩa này.',
    more: 'Còn {count, number} lượt dùng trong các bài đã xuất bản', source: 'Mã trong JSON: {slug}',
  },
} as const;
