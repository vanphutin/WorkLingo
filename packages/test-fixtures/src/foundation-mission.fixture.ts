// Synthetic, provider-free content. Stable slugs identify seed records across reruns.
export const foundationMissionFixture = {
  path: { slug: 'english-for-work', name: 'English for Work' },
  level: { code: 'FOUNDATION_1', name: 'Foundation 1', cefrReference: 'Pre-A1' },
  slug: 'introduce-yourself-to-a-new-colleague',
  title: 'Introduce yourself to a new colleague',
  objective: 'Introduce your name and team, understand a colleague, and ask for help politely.',
  lesson: {
    slug: 'first-day-introductions',
    title: 'Your first day at work',
    version: 1,
    contentBlocks: [
      {
        slug: 'welcome-email', type: 'email',
        text: 'Hello An. Welcome to our team! My name is Mai. I work in support. We help customers. Your desk is next to mine. Please come to my desk at nine. We can meet the team together. If you need help, please ask me. See you soon! Mai',
      },
      {
        slug: 'desk-conversation', type: 'dialogue',
        text: 'Mai: Hello! My name is Mai. I work in support. What is your name?\nAn: My name is An. I work in sales.\nMai: Nice to meet you, An. Do you need help?\nAn: Yes, please. Where is the meeting room?\nMai: It is next to my desk. Let us go together.',
        audio: { kind: 'textPlaceholder', notice: 'Audio is not available in this local increment. Use the script for now.' },
      },
    ],
    wordBanks: [{
      slug: 'workplace-introductions', name: 'Workplace introductions',
      languageBlocks: [
        {
          slug: 'my-name-is', canonicalForm: 'My name is ...', meaning: 'Tên tôi là ...',
          pronunciation: '/maɪ neɪm ɪz/', collocations: ['first name', 'full name'],
          grammarPattern: 'My name + is + name',
          examples: ['My name is An.', 'Hello, my name is Linh.'],
          commonErrors: ['My name An. → My name is An.'], cefrLevel: 'Pre-A1',
          transferContexts: ['introducing yourself on a call', 'writing a first email'],
        },
        {
          slug: 'i-work-in', canonicalForm: 'I work in ...', meaning: 'Tôi làm ở bộ phận ...',
          pronunciation: '/aɪ wɜːk ɪn/', collocations: ['work in sales', 'work in support'],
          grammarPattern: 'I + work + in + department',
          examples: ['I work in sales.', 'I work in support.'],
          commonErrors: ['I am work in sales. → I work in sales.'], cefrLevel: 'Pre-A1',
          transferContexts: ['meeting a customer', 'introducing your role in a meeting'],
        },
        {
          slug: 'nice-to-meet-you', canonicalForm: 'Nice to meet you.', meaning: 'Rất vui được gặp bạn.',
          pronunciation: '/naɪs tə miːt juː/', collocations: ['meet a colleague', 'meet the team'],
          grammarPattern: '(It is) nice + to + verb',
          examples: ['Nice to meet you, An.', 'It is nice to meet the team.'],
          commonErrors: ['Nice meet you. → Nice to meet you.'], cefrLevel: 'Pre-A1',
          transferContexts: ['welcoming a visitor', 'meeting a new teammate online'],
        },
        {
          slug: 'do-you-need-help', canonicalForm: 'Do you need help?', meaning: 'Bạn có cần giúp đỡ không?',
          pronunciation: '/duː juː niːd help/', collocations: ['need help', 'ask for help'],
          grammarPattern: 'Do + you + base verb + object?',
          examples: ['Do you need help?', 'If you need help, please ask me.'],
          commonErrors: ['Are you need help? → Do you need help?'], cefrLevel: 'Pre-A1',
          transferContexts: ['helping a customer', 'supporting a teammate with a task'],
        },
      ],
    }],
    activities: [
      {
        slug: 'recall-introduction', activityType: 'writing', learningBlock: 'activate',
        skills: ['writing'], contentReferences: ['welcome-email'], languageBlockReferences: ['my-name-is'],
        payload: { prompt: 'Bạn sắp gặp đồng nghiệp mới. Viết một câu giới thiệu tên bằng tiếng Anh, rồi đọc lại câu đó.', sampleAnswer: 'My name is An.', requiredPhrases: ['my name is'], minWords: 4 },
      },
      {
        slug: 'understand-welcome', activityType: 'reading', learningBlock: 'readDecode',
        skills: ['reading'], contentReferences: ['welcome-email'], languageBlockReferences: ['do-you-need-help'],
        payload: {
          prompt: 'Đọc email. Dựa vào toàn bộ nội dung, trả lời các câu hỏi.',
          questions: [
            { slug: 'main-purpose', prompt: 'Why does Mai write this email?', options: ['To welcome An and help An meet the team.', 'To ask An to help a customer.', 'To move her desk.'], answerIndex: 0, explanation: 'Mai welcomes An, describes her desk, and offers to meet the team together.', evidence: 'Welcome to our team! ... We can meet the team together.' },
            { slug: 'next-action', prompt: 'What should An do at nine?', options: ['Wait for a customer.', 'Go to Mai’s desk to meet the team with her.', 'Move to the meeting room alone.'], answerIndex: 1, explanation: 'The time, place, and purpose come from two connected sentences.', evidence: 'Please come to my desk at nine. We can meet the team together.' },
            { slug: 'support-inference', prompt: 'An does not know a colleague’s name. What is the most useful next step?', options: ['Go home.', 'Ask Mai for help.', 'Wait until next week.'], answerIndex: 1, explanation: 'Mai offers help, so An can ask her about a new problem too.', evidence: 'If you need help, please ask me.' },
          ],
        },
      },
      {
        slug: 'understand-colleague', activityType: 'listening', learningBlock: 'listenReason',
        skills: ['listening'], contentReferences: ['desk-conversation'], languageBlockReferences: ['i-work-in', 'do-you-need-help'],
        payload: {
          prompt: 'Khi có audio, nghe hội thoại trước khi xem script. Trong phiên bản local này, dùng script thay thế.',
          questions: [
            { slug: 'different-teams', prompt: 'Which statement correctly describes Mai and An?', options: ['They both work in sales.', 'Mai works in sales and An works in support.', 'Mai works in support and An works in sales.'], answerIndex: 2, explanation: 'Each speaker introduces a different department.', evidence: 'Mai: I work in support. ... An: I work in sales.' },
            { slug: 'why-together', prompt: 'Why do Mai and An go together?', options: ['An needs help finding the meeting room.', 'Mai needs help with a customer.', 'An asks Mai to join sales.'], answerIndex: 0, explanation: 'An asks where the room is, and Mai responds by offering to go together.', evidence: 'Where is the meeting room? ... Let us go together.' },
          ],
        },
      },
      {
        slug: 'shadow-introduction', activityType: 'speaking', learningBlock: 'respond',
        skills: ['speaking'], contentReferences: ['desk-conversation'], languageBlockReferences: ['my-name-is', 'i-work-in', 'nice-to-meet-you'],
        payload: { prompt: 'Đọc theo câu mẫu. Sau đó thay tên và bộ phận bằng thông tin của bạn. Phiên bản này lưu câu trả lời dạng text; ghi âm sẽ đến ở increment sau.', mode: 'shadowing', sampleAnswer: 'My name is An. I work in sales. Nice to meet you.', requiredPhrases: ['my name is', 'i work in', 'nice to meet you'], minWords: 12 },
      },
      {
        slug: 'write-first-message', activityType: 'writing', learningBlock: 'respond',
        skills: ['writing'], contentReferences: ['welcome-email', 'desk-conversation'], languageBlockReferences: ['my-name-is', 'i-work-in', 'do-you-need-help'],
        payload: { prompt: 'Bạn gặp Linh qua chat trong một dự án mới. Viết lời chào, giới thiệu tên và bộ phận, rồi hỏi Linh có cần giúp đỡ không. Đây là ngữ cảnh mới so với email và hội thoại.', sampleAnswer: 'Hello Linh. My name is An. I work in sales. Do you need help?', requiredPhrases: ['my name is', 'i work in', 'do you need help'], minWords: 14 },
      },
    ],
  },
} as const;
