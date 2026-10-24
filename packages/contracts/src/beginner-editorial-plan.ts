// Editorial metadata copied losslessly from the approved planning documents. No DB identity or publishable content.
export interface BeginnerPlannedLesson {readonly code:string;readonly title:string;readonly status:"PLANNED";readonly grammar:string;readonly pronunciation:string;readonly vocabulary:string;readonly reading:string;readonly listening:string;readonly speaking:string;readonly writing:string;readonly objective:string;readonly prerequisite:string}
export interface BeginnerPlannedUnit {readonly code:string;readonly title:string;readonly canDo:string;readonly hardPrerequisite:string;readonly lessons:readonly BeginnerPlannedLesson[]}
export interface BeginnerPlannedVideo {readonly code:string;readonly purpose:string;readonly type:string;readonly lessonCodes:readonly string[];readonly slot:string;readonly outline:string;readonly exercises:string;readonly languageAndCaption:string;readonly production:"NOT_STARTED";readonly priority:string;readonly reuse:string}
export interface BeginnerEditorialPlan {readonly version:1;readonly stages:readonly {readonly code:string;readonly path:string;readonly units:readonly BeginnerPlannedUnit[]}[];readonly videoSlots:readonly BeginnerPlannedVideo[]}
export const beginnerEditorialPlan:BeginnerEditorialPlan={
  "version": 1,
  "stages": [
    {
      "code": "MG-F0",
      "path": "mat-goc",
      "units": [
        {
          "code": "MG01",
          "title": "Tôi là ai",
          "canDo": "giới thiệu và xác nhận thông tin bản thân",
          "hardPrerequisite": "Entry F0. Đây là mục tiêu năng lực, khác danh mục cấu trúc/âm/từ.",
          "lessons": [
            {
              "code": "MG01-L1",
              "title": "Mẫu câu phục vụ tác vụ",
              "status": "PLANNED",
              "grammar": "I/you + be; chào/giới thiệu",
              "pronunciation": "Nhận biết trong mẫu: Âm và tên chữ; trọng âm tên",
              "vocabulary": "hello, name, I, you, from",
              "reading": "Đọc thẻ tên và hồ sơ giới thiệu; nhận ra nghĩa/mẫu câu",
              "listening": "Nghe lời chào và tên người nói; xác định ý chính",
              "speaking": "chào và giới thiệu tên/xuất xứ theo mẫu nhưng thay thông tin",
              "writing": "viết thẻ giới thiệu ngắn với khung",
              "objective": "O-MG01-L1: giới thiệu và xác nhận thông tin bản thân bằng cấu trúc mục tiêu, có hỗ trợ khung",
              "prerequisite": "H: Entry F0; R: đầu Unit (không hard gate)"
            },
            {
              "code": "MG01-L2",
              "title": "Nghe/nói rõ và giữ nghĩa",
              "status": "PLANNED",
              "grammar": "Câu mẫu L1: I/you + be; chào/giới thiệu; không thêm cấu trúc mới",
              "pronunciation": "Trọng tâm: Âm và tên chữ; trọng âm tên",
              "vocabulary": "hello, name, I, you, from",
              "reading": "Đọc thẻ tên và hồ sơ giới thiệu; đánh dấu âm/trọng âm để hỗ trợ hiểu",
              "listening": "Nghe lời chào và tên người nói; phân biệt âm/nhịp và thông tin",
              "speaking": "chào và giới thiệu tên/xuất xứ: shadow rồi tự nói, giữ đúng nghĩa",
              "writing": "viết thẻ giới thiệu ngắn từ thông tin đã nghe và lựa chọn của mình",
              "objective": "O-MG01-L2: nghe nhận đúng thông tin và nói dễ hiểu khi chào và giới thiệu tên/xuất xứ; không chấm giống giọng bản ngữ",
              "prerequisite": "H: Entry F0; R: MG01-L1 (không hard gate)"
            },
            {
              "code": "MG01-L3",
              "title": "Tích hợp từ vựng/giao tiếp",
              "status": "PLANNED",
              "grammar": "I/you + be; chào/giới thiệu",
              "pronunciation": "Duy trì khi giao tiếp: Âm và tên chữ; trọng âm tên",
              "vocabulary": "hello, name, I, you, from",
              "reading": "Đọc bản mới của thẻ tên và hồ sơ giới thiệu; chọn thông tin phục vụ tác vụ",
              "listening": "Nghe lời chào và tên người nói với dữ kiện thay đổi; xác nhận nghĩa",
              "speaking": "chào và giới thiệu tên/xuất xứ với phản hồi/tình huống mới",
              "writing": "viết thẻ giới thiệu ngắn theo mục đích/người nhận mới",
              "objective": "O-MG01-L3: giới thiệu và xác nhận thông tin bản thân với thông tin mới, giảm hỗ trợ",
              "prerequisite": "H: Entry F0; R: MG01-L1, MG01-L2 (không hard gate)"
            },
            {
              "code": "MG01-L4",
              "title": "Ôn, transfer và unit check",
              "status": "PLANNED",
              "grammar": "Truy hồi/vận dụng: I/you + be; chào/giới thiệu",
              "pronunciation": "Độ rõ khi transfer: Âm và tên chữ; trọng âm tên",
              "vocabulary": "hello, name, I, you, from",
              "reading": "Đọc thẻ tên và hồ sơ giới thiệu ở ngữ cảnh mới; tự xác định thông tin",
              "listening": "Nghe lời chào và tên người nói mới, không xem lời giải trước",
              "speaking": "chào và giới thiệu tên/xuất xứ độc lập; rubric về nghĩa và độ rõ",
              "writing": "viết thẻ giới thiệu ngắn không chép mẫu, tự rà nghĩa",
              "objective": "O-MG01-L4: giới thiệu và xác nhận thông tin bản thân độc lập qua R/L/S/W; chỉ là unit check, không chứng nhận CEFR",
              "prerequisite": "H: Entry F0; R: MG01-L1, MG01-L2, MG01-L3 (không hard gate)"
            }
          ]
        },
        {
          "code": "MG02",
          "title": "Đồ vật quanh tôi",
          "canDo": "xác định và yêu cầu đúng đồ vật/số lượng",
          "hardPrerequisite": "MG01 Unit mastery (evidence bắt buộc L1–L4). Đây là mục tiêu năng lực, khác danh mục cấu trúc/âm/từ.",
          "lessons": [
            {
              "code": "MG02-L1",
              "title": "Mẫu câu phục vụ tác vụ",
              "status": "PLANNED",
              "grammar": "a/an, this/that, số nhiều",
              "pronunciation": "Nhận biết trong mẫu: Phụ âm cuối trong từ thật",
              "vocabulary": "a pen, a book, a bag, this, that",
              "reading": "Đọc nhãn và danh sách vật dụng; nhận ra nghĩa/mẫu câu",
              "listening": "Nghe yêu cầu lấy một hoặc nhiều đồ vật; xác định ý chính",
              "speaking": "hỏi và chỉ đồ vật cần tìm theo mẫu nhưng thay thông tin",
              "writing": "mô tả đồ vật/số lượng trong lời nhắn với khung",
              "objective": "O-MG02-L1: xác định và yêu cầu đúng đồ vật/số lượng bằng cấu trúc mục tiêu, có hỗ trợ khung",
              "prerequisite": "H: MG01 Unit mastery (evidence bắt buộc L1–L4); R: đầu Unit (không hard gate)"
            },
            {
              "code": "MG02-L2",
              "title": "Nghe/nói rõ và giữ nghĩa",
              "status": "PLANNED",
              "grammar": "Câu mẫu L1: a/an, this/that, số nhiều; không thêm cấu trúc mới",
              "pronunciation": "Trọng tâm: Phụ âm cuối trong từ thật",
              "vocabulary": "a pen, a book, a bag, this, that",
              "reading": "Đọc nhãn và danh sách vật dụng; đánh dấu âm/trọng âm để hỗ trợ hiểu",
              "listening": "Nghe yêu cầu lấy một hoặc nhiều đồ vật; phân biệt âm/nhịp và thông tin",
              "speaking": "hỏi và chỉ đồ vật cần tìm: shadow rồi tự nói, giữ đúng nghĩa",
              "writing": "mô tả đồ vật/số lượng trong lời nhắn từ thông tin đã nghe và lựa chọn của mình",
              "objective": "O-MG02-L2: nghe nhận đúng thông tin và nói dễ hiểu khi hỏi và chỉ đồ vật cần tìm; không chấm giống giọng bản ngữ",
              "prerequisite": "H: MG01 Unit mastery (evidence bắt buộc L1–L4); R: MG02-L1 (không hard gate)"
            },
            {
              "code": "MG02-L3",
              "title": "Tích hợp từ vựng/giao tiếp",
              "status": "PLANNED",
              "grammar": "a/an, this/that, số nhiều",
              "pronunciation": "Duy trì khi giao tiếp: Phụ âm cuối trong từ thật",
              "vocabulary": "a pen, a book, a bag, this, that",
              "reading": "Đọc bản mới của nhãn và danh sách vật dụng; chọn thông tin phục vụ tác vụ",
              "listening": "Nghe yêu cầu lấy một hoặc nhiều đồ vật với dữ kiện thay đổi; xác nhận nghĩa",
              "speaking": "hỏi và chỉ đồ vật cần tìm với phản hồi/tình huống mới",
              "writing": "mô tả đồ vật/số lượng trong lời nhắn theo mục đích/người nhận mới",
              "objective": "O-MG02-L3: xác định và yêu cầu đúng đồ vật/số lượng với thông tin mới, giảm hỗ trợ",
              "prerequisite": "H: MG01 Unit mastery (evidence bắt buộc L1–L4); R: MG02-L1, MG02-L2 (không hard gate)"
            },
            {
              "code": "MG02-L4",
              "title": "Ôn, transfer và unit check",
              "status": "PLANNED",
              "grammar": "Truy hồi/vận dụng: a/an, this/that, số nhiều",
              "pronunciation": "Độ rõ khi transfer: Phụ âm cuối trong từ thật",
              "vocabulary": "a pen, a book, a bag, this, that",
              "reading": "Đọc nhãn và danh sách vật dụng ở ngữ cảnh mới; tự xác định thông tin",
              "listening": "Nghe yêu cầu lấy một hoặc nhiều đồ vật mới, không xem lời giải trước",
              "speaking": "hỏi và chỉ đồ vật cần tìm độc lập; rubric về nghĩa và độ rõ",
              "writing": "mô tả đồ vật/số lượng trong lời nhắn không chép mẫu, tự rà nghĩa",
              "objective": "O-MG02-L4: xác định và yêu cầu đúng đồ vật/số lượng độc lập qua R/L/S/W; chỉ là unit check, không chứng nhận CEFR",
              "prerequisite": "H: MG01 Unit mastery (evidence bắt buộc L1–L4); R: MG02-L1, MG02-L2, MG02-L3 (không hard gate)"
            }
          ]
        },
        {
          "code": "MG03",
          "title": "Người thân",
          "canDo": "trao đổi đúng thông tin về người quen",
          "hardPrerequisite": "MG02. Đây là mục tiêu năng lực, khác danh mục cấu trúc/âm/từ.",
          "lessons": [
            {
              "code": "MG03-L1",
              "title": "Mẫu câu phục vụ tác vụ",
              "status": "PLANNED",
              "grammar": "he/she + be; my/your/his/her",
              "pronunciation": "Nhận biết trong mẫu: Tương phản nguyên âm giáo viên chọn",
              "vocabulary": "mother, father, sister, brother, my, her",
              "reading": "Đọc hồ sơ gia đình/người quen; nhận ra nghĩa/mẫu câu",
              "listening": "Nghe mô tả một thành viên gia đình; xác định ý chính",
              "speaking": "giới thiệu một người và hỏi quan hệ theo mẫu nhưng thay thông tin",
              "writing": "viết hồ sơ một người quen với khung",
              "objective": "O-MG03-L1: trao đổi đúng thông tin về người quen bằng cấu trúc mục tiêu, có hỗ trợ khung",
              "prerequisite": "H: MG02; R: đầu Unit (không hard gate)"
            },
            {
              "code": "MG03-L2",
              "title": "Nghe/nói rõ và giữ nghĩa",
              "status": "PLANNED",
              "grammar": "Câu mẫu L1: he/she + be; my/your/his/her; không thêm cấu trúc mới",
              "pronunciation": "Trọng tâm: Tương phản nguyên âm giáo viên chọn",
              "vocabulary": "mother, father, sister, brother, my, her",
              "reading": "Đọc hồ sơ gia đình/người quen; đánh dấu âm/trọng âm để hỗ trợ hiểu",
              "listening": "Nghe mô tả một thành viên gia đình; phân biệt âm/nhịp và thông tin",
              "speaking": "giới thiệu một người và hỏi quan hệ: shadow rồi tự nói, giữ đúng nghĩa",
              "writing": "viết hồ sơ một người quen từ thông tin đã nghe và lựa chọn của mình",
              "objective": "O-MG03-L2: nghe nhận đúng thông tin và nói dễ hiểu khi giới thiệu một người và hỏi quan hệ; không chấm giống giọng bản ngữ",
              "prerequisite": "H: MG02; R: MG03-L1 (không hard gate)"
            },
            {
              "code": "MG03-L3",
              "title": "Tích hợp từ vựng/giao tiếp",
              "status": "PLANNED",
              "grammar": "he/she + be; my/your/his/her",
              "pronunciation": "Duy trì khi giao tiếp: Tương phản nguyên âm giáo viên chọn",
              "vocabulary": "mother, father, sister, brother, my, her",
              "reading": "Đọc bản mới của hồ sơ gia đình/người quen; chọn thông tin phục vụ tác vụ",
              "listening": "Nghe mô tả một thành viên gia đình với dữ kiện thay đổi; xác nhận nghĩa",
              "speaking": "giới thiệu một người và hỏi quan hệ với phản hồi/tình huống mới",
              "writing": "viết hồ sơ một người quen theo mục đích/người nhận mới",
              "objective": "O-MG03-L3: trao đổi đúng thông tin về người quen với thông tin mới, giảm hỗ trợ",
              "prerequisite": "H: MG02; R: MG03-L1, MG03-L2 (không hard gate)"
            },
            {
              "code": "MG03-L4",
              "title": "Ôn, transfer và unit check",
              "status": "PLANNED",
              "grammar": "Truy hồi/vận dụng: he/she + be; my/your/his/her",
              "pronunciation": "Độ rõ khi transfer: Tương phản nguyên âm giáo viên chọn",
              "vocabulary": "mother, father, sister, brother, my, her",
              "reading": "Đọc hồ sơ gia đình/người quen ở ngữ cảnh mới; tự xác định thông tin",
              "listening": "Nghe mô tả một thành viên gia đình mới, không xem lời giải trước",
              "speaking": "giới thiệu một người và hỏi quan hệ độc lập; rubric về nghĩa và độ rõ",
              "writing": "viết hồ sơ một người quen không chép mẫu, tự rà nghĩa",
              "objective": "O-MG03-L4: trao đổi đúng thông tin về người quen độc lập qua R/L/S/W; chỉ là unit check, không chứng nhận CEFR",
              "prerequisite": "H: MG02; R: MG03-L1, MG03-L2, MG03-L3 (không hard gate)"
            }
          ]
        },
        {
          "code": "MG04",
          "title": "Số và liên hệ",
          "canDo": "ghi nhận và xác nhận đúng thông tin liên hệ",
          "hardPrerequisite": "MG03. Đây là mục tiêu năng lực, khác danh mục cấu trúc/âm/từ.",
          "lessons": [
            {
              "code": "MG04-L1",
              "title": "Mẫu câu phục vụ tác vụ",
              "status": "PLANNED",
              "grammar": "be questions; what/where",
              "pronunciation": "Nhận biết trong mẫu: Teen/ty; nhịp đọc số",
              "vocabulary": "one, thirteen, thirty, phone, time",
              "reading": "Đọc biểu mẫu liên hệ và giờ hẹn; nhận ra nghĩa/mẫu câu",
              "listening": "Nghe số điện thoại/giờ cần xác nhận; xác định ý chính",
              "speaking": "hỏi lại và xác nhận số/giờ theo mẫu nhưng thay thông tin",
              "writing": "điền rồi viết xác nhận thông tin liên hệ với khung",
              "objective": "O-MG04-L1: ghi nhận và xác nhận đúng thông tin liên hệ bằng cấu trúc mục tiêu, có hỗ trợ khung",
              "prerequisite": "H: MG03; R: đầu Unit (không hard gate)"
            },
            {
              "code": "MG04-L2",
              "title": "Nghe/nói rõ và giữ nghĩa",
              "status": "PLANNED",
              "grammar": "Câu mẫu L1: be questions; what/where; không thêm cấu trúc mới",
              "pronunciation": "Trọng tâm: Teen/ty; nhịp đọc số",
              "vocabulary": "one, thirteen, thirty, phone, time",
              "reading": "Đọc biểu mẫu liên hệ và giờ hẹn; đánh dấu âm/trọng âm để hỗ trợ hiểu",
              "listening": "Nghe số điện thoại/giờ cần xác nhận; phân biệt âm/nhịp và thông tin",
              "speaking": "hỏi lại và xác nhận số/giờ: shadow rồi tự nói, giữ đúng nghĩa",
              "writing": "điền rồi viết xác nhận thông tin liên hệ từ thông tin đã nghe và lựa chọn của mình",
              "objective": "O-MG04-L2: nghe nhận đúng thông tin và nói dễ hiểu khi hỏi lại và xác nhận số/giờ; không chấm giống giọng bản ngữ",
              "prerequisite": "H: MG03; R: MG04-L1 (không hard gate)"
            },
            {
              "code": "MG04-L3",
              "title": "Tích hợp từ vựng/giao tiếp",
              "status": "PLANNED",
              "grammar": "be questions; what/where",
              "pronunciation": "Duy trì khi giao tiếp: Teen/ty; nhịp đọc số",
              "vocabulary": "one, thirteen, thirty, phone, time",
              "reading": "Đọc bản mới của biểu mẫu liên hệ và giờ hẹn; chọn thông tin phục vụ tác vụ",
              "listening": "Nghe số điện thoại/giờ cần xác nhận với dữ kiện thay đổi; xác nhận nghĩa",
              "speaking": "hỏi lại và xác nhận số/giờ với phản hồi/tình huống mới",
              "writing": "điền rồi viết xác nhận thông tin liên hệ theo mục đích/người nhận mới",
              "objective": "O-MG04-L3: ghi nhận và xác nhận đúng thông tin liên hệ với thông tin mới, giảm hỗ trợ",
              "prerequisite": "H: MG03; R: MG04-L1, MG04-L2 (không hard gate)"
            },
            {
              "code": "MG04-L4",
              "title": "Ôn, transfer và unit check",
              "status": "PLANNED",
              "grammar": "Truy hồi/vận dụng: be questions; what/where",
              "pronunciation": "Độ rõ khi transfer: Teen/ty; nhịp đọc số",
              "vocabulary": "one, thirteen, thirty, phone, time",
              "reading": "Đọc biểu mẫu liên hệ và giờ hẹn ở ngữ cảnh mới; tự xác định thông tin",
              "listening": "Nghe số điện thoại/giờ cần xác nhận mới, không xem lời giải trước",
              "speaking": "hỏi lại và xác nhận số/giờ độc lập; rubric về nghĩa và độ rõ",
              "writing": "điền rồi viết xác nhận thông tin liên hệ không chép mẫu, tự rà nghĩa",
              "objective": "O-MG04-L4: ghi nhận và xác nhận đúng thông tin liên hệ độc lập qua R/L/S/W; chỉ là unit check, không chứng nhận CEFR",
              "prerequisite": "H: MG03; R: MG04-L1, MG04-L2, MG04-L3 (không hard gate)"
            }
          ]
        }
      ]
    },
    {
      "code": "MG-F1",
      "path": "mat-goc",
      "units": [
        {
          "code": "MG05",
          "title": "Ngày của tôi",
          "canDo": "mô tả thói quen quen thuộc có trình tự",
          "hardPrerequisite": "F0 checkpoint. Đây là mục tiêu năng lực, khác danh mục cấu trúc/âm/từ.",
          "lessons": [
            {
              "code": "MG05-L1",
              "title": "Mẫu câu phục vụ tác vụ",
              "status": "PLANNED",
              "grammar": "Present simple I/you; frequency",
              "pronunciation": "Nhận biết trong mẫu: Trọng âm từ, âm yếu quen thuộc",
              "vocabulary": "get up, work, study, morning, usually",
              "reading": "Đọc lịch một ngày; nhận ra nghĩa/mẫu câu",
              "listening": "Nghe mô tả thói quen cá nhân; xác định ý chính",
              "speaking": "kể một ngày và hỏi thói quen theo mẫu nhưng thay thông tin",
              "writing": "viết routine theo lịch thật của mình với khung",
              "objective": "O-MG05-L1: mô tả thói quen quen thuộc có trình tự bằng cấu trúc mục tiêu, có hỗ trợ khung",
              "prerequisite": "H: F0 checkpoint; R: đầu Unit (không hard gate)"
            },
            {
              "code": "MG05-L2",
              "title": "Nghe/nói rõ và giữ nghĩa",
              "status": "PLANNED",
              "grammar": "Câu mẫu L1: Present simple I/you; frequency; không thêm cấu trúc mới",
              "pronunciation": "Trọng tâm: Trọng âm từ, âm yếu quen thuộc",
              "vocabulary": "get up, work, study, morning, usually",
              "reading": "Đọc lịch một ngày; đánh dấu âm/trọng âm để hỗ trợ hiểu",
              "listening": "Nghe mô tả thói quen cá nhân; phân biệt âm/nhịp và thông tin",
              "speaking": "kể một ngày và hỏi thói quen: shadow rồi tự nói, giữ đúng nghĩa",
              "writing": "viết routine theo lịch thật của mình từ thông tin đã nghe và lựa chọn của mình",
              "objective": "O-MG05-L2: nghe nhận đúng thông tin và nói dễ hiểu khi kể một ngày và hỏi thói quen; không chấm giống giọng bản ngữ",
              "prerequisite": "H: F0 checkpoint; R: MG05-L1 (không hard gate)"
            },
            {
              "code": "MG05-L3",
              "title": "Tích hợp từ vựng/giao tiếp",
              "status": "PLANNED",
              "grammar": "Present simple I/you; frequency",
              "pronunciation": "Duy trì khi giao tiếp: Trọng âm từ, âm yếu quen thuộc",
              "vocabulary": "get up, work, study, morning, usually",
              "reading": "Đọc bản mới của lịch một ngày; chọn thông tin phục vụ tác vụ",
              "listening": "Nghe mô tả thói quen cá nhân với dữ kiện thay đổi; xác nhận nghĩa",
              "speaking": "kể một ngày và hỏi thói quen với phản hồi/tình huống mới",
              "writing": "viết routine theo lịch thật của mình theo mục đích/người nhận mới",
              "objective": "O-MG05-L3: mô tả thói quen quen thuộc có trình tự với thông tin mới, giảm hỗ trợ",
              "prerequisite": "H: F0 checkpoint; R: MG05-L1, MG05-L2 (không hard gate)"
            },
            {
              "code": "MG05-L4",
              "title": "Ôn, transfer và unit check",
              "status": "PLANNED",
              "grammar": "Truy hồi/vận dụng: Present simple I/you; frequency",
              "pronunciation": "Độ rõ khi transfer: Trọng âm từ, âm yếu quen thuộc",
              "vocabulary": "get up, work, study, morning, usually",
              "reading": "Đọc lịch một ngày ở ngữ cảnh mới; tự xác định thông tin",
              "listening": "Nghe mô tả thói quen cá nhân mới, không xem lời giải trước",
              "speaking": "kể một ngày và hỏi thói quen độc lập; rubric về nghĩa và độ rõ",
              "writing": "viết routine theo lịch thật của mình không chép mẫu, tự rà nghĩa",
              "objective": "O-MG05-L4: mô tả thói quen quen thuộc có trình tự độc lập qua R/L/S/W; chỉ là unit check, không chứng nhận CEFR",
              "prerequisite": "H: F0 checkpoint; R: MG05-L1, MG05-L2, MG05-L3 (không hard gate)"
            }
          ]
        },
        {
          "code": "MG06",
          "title": "Điều tôi thích",
          "canDo": "trao đổi lựa chọn và sở thích dễ hiểu",
          "hardPrerequisite": "MG05. Đây là mục tiêu năng lực, khác danh mục cấu trúc/âm/từ.",
          "lessons": [
            {
              "code": "MG06-L1",
              "title": "Mẫu câu phục vụ tác vụ",
              "status": "PLANNED",
              "grammar": "do/don't; like + noun",
              "pronunciation": "Nhận biết trong mẫu: Nhịp câu hỏi, phụ âm cuối",
              "vocabulary": "like, want, food, music, sport",
              "reading": "Đọc bảng sở thích và thực đơn ngắn; nhận ra nghĩa/mẫu câu",
              "listening": "Nghe lựa chọn và điều người nói thích/không thích; xác định ý chính",
              "speaking": "hỏi/đáp sở thích và phản hồi theo mẫu nhưng thay thông tin",
              "writing": "viết lời nhắn nêu lựa chọn với khung",
              "objective": "O-MG06-L1: trao đổi lựa chọn và sở thích dễ hiểu bằng cấu trúc mục tiêu, có hỗ trợ khung",
              "prerequisite": "H: MG05; R: đầu Unit (không hard gate)"
            },
            {
              "code": "MG06-L2",
              "title": "Nghe/nói rõ và giữ nghĩa",
              "status": "PLANNED",
              "grammar": "Câu mẫu L1: do/don't; like + noun; không thêm cấu trúc mới",
              "pronunciation": "Trọng tâm: Nhịp câu hỏi, phụ âm cuối",
              "vocabulary": "like, want, food, music, sport",
              "reading": "Đọc bảng sở thích và thực đơn ngắn; đánh dấu âm/trọng âm để hỗ trợ hiểu",
              "listening": "Nghe lựa chọn và điều người nói thích/không thích; phân biệt âm/nhịp và thông tin",
              "speaking": "hỏi/đáp sở thích và phản hồi: shadow rồi tự nói, giữ đúng nghĩa",
              "writing": "viết lời nhắn nêu lựa chọn từ thông tin đã nghe và lựa chọn của mình",
              "objective": "O-MG06-L2: nghe nhận đúng thông tin và nói dễ hiểu khi hỏi/đáp sở thích và phản hồi; không chấm giống giọng bản ngữ",
              "prerequisite": "H: MG05; R: MG06-L1 (không hard gate)"
            },
            {
              "code": "MG06-L3",
              "title": "Tích hợp từ vựng/giao tiếp",
              "status": "PLANNED",
              "grammar": "do/don't; like + noun",
              "pronunciation": "Duy trì khi giao tiếp: Nhịp câu hỏi, phụ âm cuối",
              "vocabulary": "like, want, food, music, sport",
              "reading": "Đọc bản mới của bảng sở thích và thực đơn ngắn; chọn thông tin phục vụ tác vụ",
              "listening": "Nghe lựa chọn và điều người nói thích/không thích với dữ kiện thay đổi; xác nhận nghĩa",
              "speaking": "hỏi/đáp sở thích và phản hồi với phản hồi/tình huống mới",
              "writing": "viết lời nhắn nêu lựa chọn theo mục đích/người nhận mới",
              "objective": "O-MG06-L3: trao đổi lựa chọn và sở thích dễ hiểu với thông tin mới, giảm hỗ trợ",
              "prerequisite": "H: MG05; R: MG06-L1, MG06-L2 (không hard gate)"
            },
            {
              "code": "MG06-L4",
              "title": "Ôn, transfer và unit check",
              "status": "PLANNED",
              "grammar": "Truy hồi/vận dụng: do/don't; like + noun",
              "pronunciation": "Độ rõ khi transfer: Nhịp câu hỏi, phụ âm cuối",
              "vocabulary": "like, want, food, music, sport",
              "reading": "Đọc bảng sở thích và thực đơn ngắn ở ngữ cảnh mới; tự xác định thông tin",
              "listening": "Nghe lựa chọn và điều người nói thích/không thích mới, không xem lời giải trước",
              "speaking": "hỏi/đáp sở thích và phản hồi độc lập; rubric về nghĩa và độ rõ",
              "writing": "viết lời nhắn nêu lựa chọn không chép mẫu, tự rà nghĩa",
              "objective": "O-MG06-L4: trao đổi lựa chọn và sở thích dễ hiểu độc lập qua R/L/S/W; chỉ là unit check, không chứng nhận CEFR",
              "prerequisite": "H: MG05; R: MG06-L1, MG06-L2, MG06-L3 (không hard gate)"
            }
          ]
        },
        {
          "code": "MG07",
          "title": "Nhà và khu vực",
          "canDo": "giúp người khác tìm đúng nơi/đồ vật",
          "hardPrerequisite": "MG06. Đây là mục tiêu năng lực, khác danh mục cấu trúc/âm/từ.",
          "lessons": [
            {
              "code": "MG07-L1",
              "title": "Mẫu câu phục vụ tác vụ",
              "status": "PLANNED",
              "grammar": "there is/are; giới từ vị trí",
              "pronunciation": "Nhận biết trong mẫu: Nghe âm trong chỉ dẫn, chia cụm",
              "vocabulary": "room, home, near, next to, there is",
              "reading": "Đọc sơ đồ phòng/khu vực; nhận ra nghĩa/mẫu câu",
              "listening": "Nghe chỉ dẫn vị trí đơn giản; xác định ý chính",
              "speaking": "chỉ vị trí và mô tả nơi quen thuộc theo mẫu nhưng thay thông tin",
              "writing": "viết chỉ dẫn vị trí ngắn với khung",
              "objective": "O-MG07-L1: giúp người khác tìm đúng nơi/đồ vật bằng cấu trúc mục tiêu, có hỗ trợ khung",
              "prerequisite": "H: MG06; R: đầu Unit (không hard gate)"
            },
            {
              "code": "MG07-L2",
              "title": "Nghe/nói rõ và giữ nghĩa",
              "status": "PLANNED",
              "grammar": "Câu mẫu L1: there is/are; giới từ vị trí; không thêm cấu trúc mới",
              "pronunciation": "Trọng tâm: Nghe âm trong chỉ dẫn, chia cụm",
              "vocabulary": "room, home, near, next to, there is",
              "reading": "Đọc sơ đồ phòng/khu vực; đánh dấu âm/trọng âm để hỗ trợ hiểu",
              "listening": "Nghe chỉ dẫn vị trí đơn giản; phân biệt âm/nhịp và thông tin",
              "speaking": "chỉ vị trí và mô tả nơi quen thuộc: shadow rồi tự nói, giữ đúng nghĩa",
              "writing": "viết chỉ dẫn vị trí ngắn từ thông tin đã nghe và lựa chọn của mình",
              "objective": "O-MG07-L2: nghe nhận đúng thông tin và nói dễ hiểu khi chỉ vị trí và mô tả nơi quen thuộc; không chấm giống giọng bản ngữ",
              "prerequisite": "H: MG06; R: MG07-L1 (không hard gate)"
            },
            {
              "code": "MG07-L3",
              "title": "Tích hợp từ vựng/giao tiếp",
              "status": "PLANNED",
              "grammar": "there is/are; giới từ vị trí",
              "pronunciation": "Duy trì khi giao tiếp: Nghe âm trong chỉ dẫn, chia cụm",
              "vocabulary": "room, home, near, next to, there is",
              "reading": "Đọc bản mới của sơ đồ phòng/khu vực; chọn thông tin phục vụ tác vụ",
              "listening": "Nghe chỉ dẫn vị trí đơn giản với dữ kiện thay đổi; xác nhận nghĩa",
              "speaking": "chỉ vị trí và mô tả nơi quen thuộc với phản hồi/tình huống mới",
              "writing": "viết chỉ dẫn vị trí ngắn theo mục đích/người nhận mới",
              "objective": "O-MG07-L3: giúp người khác tìm đúng nơi/đồ vật với thông tin mới, giảm hỗ trợ",
              "prerequisite": "H: MG06; R: MG07-L1, MG07-L2 (không hard gate)"
            },
            {
              "code": "MG07-L4",
              "title": "Ôn, transfer và unit check",
              "status": "PLANNED",
              "grammar": "Truy hồi/vận dụng: there is/are; giới từ vị trí",
              "pronunciation": "Độ rõ khi transfer: Nghe âm trong chỉ dẫn, chia cụm",
              "vocabulary": "room, home, near, next to, there is",
              "reading": "Đọc sơ đồ phòng/khu vực ở ngữ cảnh mới; tự xác định thông tin",
              "listening": "Nghe chỉ dẫn vị trí đơn giản mới, không xem lời giải trước",
              "speaking": "chỉ vị trí và mô tả nơi quen thuộc độc lập; rubric về nghĩa và độ rõ",
              "writing": "viết chỉ dẫn vị trí ngắn không chép mẫu, tự rà nghĩa",
              "objective": "O-MG07-L4: giúp người khác tìm đúng nơi/đồ vật độc lập qua R/L/S/W; chỉ là unit check, không chứng nhận CEFR",
              "prerequisite": "H: MG06; R: MG07-L1, MG07-L2, MG07-L3 (không hard gate)"
            }
          ]
        },
        {
          "code": "MG08",
          "title": "Tôi làm được gì",
          "canDo": "thực hiện trao đổi đơn giản về khả năng và nhiệm vụ",
          "hardPrerequisite": "MG07 + ôn F1. Đây là mục tiêu năng lực, khác danh mục cấu trúc/âm/từ.",
          "lessons": [
            {
              "code": "MG08-L1",
              "title": "Mẫu câu phục vụ tác vụ",
              "status": "PLANNED",
              "grammar": "can/can't; mệnh lệnh; ôn câu đơn",
              "pronunciation": "Nhận biết trong mẫu: Trọng âm khẳng định/phủ định",
              "vocabulary": "can, cannot, help, open, close",
              "reading": "Đọc chỉ dẫn và mô tả khả năng; nhận ra nghĩa/mẫu câu",
              "listening": "Nghe yêu cầu làm một việc quen thuộc; xác định ý chính",
              "speaking": "nói điều làm được và xác nhận yêu cầu theo mẫu nhưng thay thông tin",
              "writing": "viết chỉ dẫn/khả năng phù hợp ngữ cảnh với khung",
              "objective": "O-MG08-L1: thực hiện trao đổi đơn giản về khả năng và nhiệm vụ bằng cấu trúc mục tiêu, có hỗ trợ khung",
              "prerequisite": "H: MG07 + ôn F1; R: đầu Unit (không hard gate)"
            },
            {
              "code": "MG08-L2",
              "title": "Nghe/nói rõ và giữ nghĩa",
              "status": "PLANNED",
              "grammar": "Câu mẫu L1: can/can't; mệnh lệnh; ôn câu đơn; không thêm cấu trúc mới",
              "pronunciation": "Trọng tâm: Trọng âm khẳng định/phủ định",
              "vocabulary": "can, cannot, help, open, close",
              "reading": "Đọc chỉ dẫn và mô tả khả năng; đánh dấu âm/trọng âm để hỗ trợ hiểu",
              "listening": "Nghe yêu cầu làm một việc quen thuộc; phân biệt âm/nhịp và thông tin",
              "speaking": "nói điều làm được và xác nhận yêu cầu: shadow rồi tự nói, giữ đúng nghĩa",
              "writing": "viết chỉ dẫn/khả năng phù hợp ngữ cảnh từ thông tin đã nghe và lựa chọn của mình",
              "objective": "O-MG08-L2: nghe nhận đúng thông tin và nói dễ hiểu khi nói điều làm được và xác nhận yêu cầu; không chấm giống giọng bản ngữ",
              "prerequisite": "H: MG07 + ôn F1; R: MG08-L1 (không hard gate)"
            },
            {
              "code": "MG08-L3",
              "title": "Tích hợp từ vựng/giao tiếp",
              "status": "PLANNED",
              "grammar": "can/can't; mệnh lệnh; ôn câu đơn",
              "pronunciation": "Duy trì khi giao tiếp: Trọng âm khẳng định/phủ định",
              "vocabulary": "can, cannot, help, open, close",
              "reading": "Đọc bản mới của chỉ dẫn và mô tả khả năng; chọn thông tin phục vụ tác vụ",
              "listening": "Nghe yêu cầu làm một việc quen thuộc với dữ kiện thay đổi; xác nhận nghĩa",
              "speaking": "nói điều làm được và xác nhận yêu cầu với phản hồi/tình huống mới",
              "writing": "viết chỉ dẫn/khả năng phù hợp ngữ cảnh theo mục đích/người nhận mới",
              "objective": "O-MG08-L3: thực hiện trao đổi đơn giản về khả năng và nhiệm vụ với thông tin mới, giảm hỗ trợ",
              "prerequisite": "H: MG07 + ôn F1; R: MG08-L1, MG08-L2 (không hard gate)"
            },
            {
              "code": "MG08-L4",
              "title": "Ôn, transfer và unit check",
              "status": "PLANNED",
              "grammar": "Truy hồi/vận dụng: can/can't; mệnh lệnh; ôn câu đơn",
              "pronunciation": "Độ rõ khi transfer: Trọng âm khẳng định/phủ định",
              "vocabulary": "can, cannot, help, open, close",
              "reading": "Đọc chỉ dẫn và mô tả khả năng ở ngữ cảnh mới; tự xác định thông tin",
              "listening": "Nghe yêu cầu làm một việc quen thuộc mới, không xem lời giải trước",
              "speaking": "nói điều làm được và xác nhận yêu cầu độc lập; rubric về nghĩa và độ rõ",
              "writing": "viết chỉ dẫn/khả năng phù hợp ngữ cảnh không chép mẫu, tự rà nghĩa",
              "objective": "O-MG08-L4: thực hiện trao đổi đơn giản về khả năng và nhiệm vụ độc lập qua R/L/S/W; chỉ là unit check, không chứng nhận CEFR",
              "prerequisite": "H: MG07 + ôn F1; R: MG08-L1, MG08-L2, MG08-L3 (không hard gate)"
            }
          ]
        }
      ]
    },
    {
      "code": "CB-A1",
      "path": "co-ban",
      "units": [
        {
          "code": "CB01",
          "title": "Thói quen/công việc",
          "canDo": "trao đổi lịch và thói quen không nhầm chủ thể",
          "hardPrerequisite": "MG08 checkpoint hoặc entry decision tương đương. Đây là mục tiêu năng lực, khác danh mục cấu trúc/âm/từ.",
          "lessons": [
            {
              "code": "CB01-L1",
              "title": "Mẫu câu phục vụ tác vụ",
              "status": "PLANNED",
              "grammar": "Present simple ngôi 3, do/does, wh",
              "pronunciation": "Nhận biết trong mẫu: Đuôi /s z ɪz/",
              "vocabulary": "works, starts, finishes, often, schedule",
              "reading": "Đọc lịch làm việc của hai người; nhận ra nghĩa/mẫu câu",
              "listening": "Nghe routine và thay đổi giờ làm; xác định ý chính",
              "speaking": "phỏng vấn thói quen rồi xác nhận lịch theo mẫu nhưng thay thông tin",
              "writing": "viết routine cá nhân/người khác với khung",
              "objective": "O-CB01-L1: trao đổi lịch và thói quen không nhầm chủ thể bằng cấu trúc mục tiêu, có hỗ trợ khung",
              "prerequisite": "H: MG08 checkpoint hoặc entry decision tương đương; R: đầu Unit (không hard gate)"
            },
            {
              "code": "CB01-L2",
              "title": "Nghe/nói rõ và giữ nghĩa",
              "status": "PLANNED",
              "grammar": "Câu mẫu L1: Present simple ngôi 3, do/does, wh; không thêm cấu trúc mới",
              "pronunciation": "Trọng tâm: Đuôi /s z ɪz/",
              "vocabulary": "works, starts, finishes, often, schedule",
              "reading": "Đọc lịch làm việc của hai người; đánh dấu âm/trọng âm để hỗ trợ hiểu",
              "listening": "Nghe routine và thay đổi giờ làm; phân biệt âm/nhịp và thông tin",
              "speaking": "phỏng vấn thói quen rồi xác nhận lịch: shadow rồi tự nói, giữ đúng nghĩa",
              "writing": "viết routine cá nhân/người khác từ thông tin đã nghe và lựa chọn của mình",
              "objective": "O-CB01-L2: nghe nhận đúng thông tin và nói dễ hiểu khi phỏng vấn thói quen rồi xác nhận lịch; không chấm giống giọng bản ngữ",
              "prerequisite": "H: MG08 checkpoint hoặc entry decision tương đương; R: CB01-L1 (không hard gate)"
            },
            {
              "code": "CB01-L3",
              "title": "Tích hợp từ vựng/giao tiếp",
              "status": "PLANNED",
              "grammar": "Present simple ngôi 3, do/does, wh",
              "pronunciation": "Duy trì khi giao tiếp: Đuôi /s z ɪz/",
              "vocabulary": "works, starts, finishes, often, schedule",
              "reading": "Đọc bản mới của lịch làm việc của hai người; chọn thông tin phục vụ tác vụ",
              "listening": "Nghe routine và thay đổi giờ làm với dữ kiện thay đổi; xác nhận nghĩa",
              "speaking": "phỏng vấn thói quen rồi xác nhận lịch với phản hồi/tình huống mới",
              "writing": "viết routine cá nhân/người khác theo mục đích/người nhận mới",
              "objective": "O-CB01-L3: trao đổi lịch và thói quen không nhầm chủ thể với thông tin mới, giảm hỗ trợ",
              "prerequisite": "H: MG08 checkpoint hoặc entry decision tương đương; R: CB01-L1, CB01-L2 (không hard gate)"
            },
            {
              "code": "CB01-L4",
              "title": "Ôn, transfer và unit check",
              "status": "PLANNED",
              "grammar": "Truy hồi/vận dụng: Present simple ngôi 3, do/does, wh",
              "pronunciation": "Độ rõ khi transfer: Đuôi /s z ɪz/",
              "vocabulary": "works, starts, finishes, often, schedule",
              "reading": "Đọc lịch làm việc của hai người ở ngữ cảnh mới; tự xác định thông tin",
              "listening": "Nghe routine và thay đổi giờ làm mới, không xem lời giải trước",
              "speaking": "phỏng vấn thói quen rồi xác nhận lịch độc lập; rubric về nghĩa và độ rõ",
              "writing": "viết routine cá nhân/người khác không chép mẫu, tự rà nghĩa",
              "objective": "O-CB01-L4: trao đổi lịch và thói quen không nhầm chủ thể độc lập qua R/L/S/W; chỉ là unit check, không chứng nhận CEFR",
              "prerequisite": "H: MG08 checkpoint hoặc entry decision tương đương; R: CB01-L1, CB01-L2, CB01-L3 (không hard gate)"
            }
          ]
        },
        {
          "code": "CB02",
          "title": "Mua sắm/ăn uống",
          "canDo": "thực hiện giao dịch quen thuộc đúng nhu cầu",
          "hardPrerequisite": "CB01. Đây là mục tiêu năng lực, khác danh mục cấu trúc/âm/từ.",
          "lessons": [
            {
              "code": "CB02-L1",
              "title": "Mẫu câu phục vụ tác vụ",
              "status": "PLANNED",
              "grammar": "Count/uncount, some/any, how much/many",
              "pronunciation": "Nhận biết trong mẫu: Trọng âm giá/số lượng",
              "vocabulary": "some, any, much, many, price, order",
              "reading": "Đọc menu/bảng giá và đơn hàng; nhận ra nghĩa/mẫu câu",
              "listening": "Nghe giá/số lượng trong giao dịch; xác định ý chính",
              "speaking": "đặt mua và xác nhận số lượng theo mẫu nhưng thay thông tin",
              "writing": "viết đơn/lời nhắn mua đồ với khung",
              "objective": "O-CB02-L1: thực hiện giao dịch quen thuộc đúng nhu cầu bằng cấu trúc mục tiêu, có hỗ trợ khung",
              "prerequisite": "H: CB01; R: đầu Unit (không hard gate)"
            },
            {
              "code": "CB02-L2",
              "title": "Nghe/nói rõ và giữ nghĩa",
              "status": "PLANNED",
              "grammar": "Câu mẫu L1: Count/uncount, some/any, how much/many; không thêm cấu trúc mới",
              "pronunciation": "Trọng tâm: Trọng âm giá/số lượng",
              "vocabulary": "some, any, much, many, price, order",
              "reading": "Đọc menu/bảng giá và đơn hàng; đánh dấu âm/trọng âm để hỗ trợ hiểu",
              "listening": "Nghe giá/số lượng trong giao dịch; phân biệt âm/nhịp và thông tin",
              "speaking": "đặt mua và xác nhận số lượng: shadow rồi tự nói, giữ đúng nghĩa",
              "writing": "viết đơn/lời nhắn mua đồ từ thông tin đã nghe và lựa chọn của mình",
              "objective": "O-CB02-L2: nghe nhận đúng thông tin và nói dễ hiểu khi đặt mua và xác nhận số lượng; không chấm giống giọng bản ngữ",
              "prerequisite": "H: CB01; R: CB02-L1 (không hard gate)"
            },
            {
              "code": "CB02-L3",
              "title": "Tích hợp từ vựng/giao tiếp",
              "status": "PLANNED",
              "grammar": "Count/uncount, some/any, how much/many",
              "pronunciation": "Duy trì khi giao tiếp: Trọng âm giá/số lượng",
              "vocabulary": "some, any, much, many, price, order",
              "reading": "Đọc bản mới của menu/bảng giá và đơn hàng; chọn thông tin phục vụ tác vụ",
              "listening": "Nghe giá/số lượng trong giao dịch với dữ kiện thay đổi; xác nhận nghĩa",
              "speaking": "đặt mua và xác nhận số lượng với phản hồi/tình huống mới",
              "writing": "viết đơn/lời nhắn mua đồ theo mục đích/người nhận mới",
              "objective": "O-CB02-L3: thực hiện giao dịch quen thuộc đúng nhu cầu với thông tin mới, giảm hỗ trợ",
              "prerequisite": "H: CB01; R: CB02-L1, CB02-L2 (không hard gate)"
            },
            {
              "code": "CB02-L4",
              "title": "Ôn, transfer và unit check",
              "status": "PLANNED",
              "grammar": "Truy hồi/vận dụng: Count/uncount, some/any, how much/many",
              "pronunciation": "Độ rõ khi transfer: Trọng âm giá/số lượng",
              "vocabulary": "some, any, much, many, price, order",
              "reading": "Đọc menu/bảng giá và đơn hàng ở ngữ cảnh mới; tự xác định thông tin",
              "listening": "Nghe giá/số lượng trong giao dịch mới, không xem lời giải trước",
              "speaking": "đặt mua và xác nhận số lượng độc lập; rubric về nghĩa và độ rõ",
              "writing": "viết đơn/lời nhắn mua đồ không chép mẫu, tự rà nghĩa",
              "objective": "O-CB02-L4: thực hiện giao dịch quen thuộc đúng nhu cầu độc lập qua R/L/S/W; chỉ là unit check, không chứng nhận CEFR",
              "prerequisite": "H: CB01; R: CB02-L1, CB02-L2, CB02-L3 (không hard gate)"
            }
          ]
        },
        {
          "code": "CB03",
          "title": "Điều đang diễn ra",
          "canDo": "phân biệt việc đang xảy ra và thói quen",
          "hardPrerequisite": "CB02. Đây là mục tiêu năng lực, khác danh mục cấu trúc/âm/từ.",
          "lessons": [
            {
              "code": "CB03-L1",
              "title": "Mẫu câu phục vụ tác vụ",
              "status": "PLANNED",
              "grammar": "Present continuous vs routine",
              "pronunciation": "Nhận biết trong mẫu: -ing, nhịp mô tả",
              "vocabulary": "wearing, raining, working, now, usually",
              "reading": "Đọc mô tả ảnh/tình huống và lịch; nhận ra nghĩa/mẫu câu",
              "listening": "Nghe hành động đang diễn ra so với thường lệ; xác định ý chính",
              "speaking": "mô tả hiện tại và đối chiếu routine theo mẫu nhưng thay thông tin",
              "writing": "viết cập nhật tình hình với khung",
              "objective": "O-CB03-L1: phân biệt việc đang xảy ra và thói quen bằng cấu trúc mục tiêu, có hỗ trợ khung",
              "prerequisite": "H: CB02; R: đầu Unit (không hard gate)"
            },
            {
              "code": "CB03-L2",
              "title": "Nghe/nói rõ và giữ nghĩa",
              "status": "PLANNED",
              "grammar": "Câu mẫu L1: Present continuous vs routine; không thêm cấu trúc mới",
              "pronunciation": "Trọng tâm: -ing, nhịp mô tả",
              "vocabulary": "wearing, raining, working, now, usually",
              "reading": "Đọc mô tả ảnh/tình huống và lịch; đánh dấu âm/trọng âm để hỗ trợ hiểu",
              "listening": "Nghe hành động đang diễn ra so với thường lệ; phân biệt âm/nhịp và thông tin",
              "speaking": "mô tả hiện tại và đối chiếu routine: shadow rồi tự nói, giữ đúng nghĩa",
              "writing": "viết cập nhật tình hình từ thông tin đã nghe và lựa chọn của mình",
              "objective": "O-CB03-L2: nghe nhận đúng thông tin và nói dễ hiểu khi mô tả hiện tại và đối chiếu routine; không chấm giống giọng bản ngữ",
              "prerequisite": "H: CB02; R: CB03-L1 (không hard gate)"
            },
            {
              "code": "CB03-L3",
              "title": "Tích hợp từ vựng/giao tiếp",
              "status": "PLANNED",
              "grammar": "Present continuous vs routine",
              "pronunciation": "Duy trì khi giao tiếp: -ing, nhịp mô tả",
              "vocabulary": "wearing, raining, working, now, usually",
              "reading": "Đọc bản mới của mô tả ảnh/tình huống và lịch; chọn thông tin phục vụ tác vụ",
              "listening": "Nghe hành động đang diễn ra so với thường lệ với dữ kiện thay đổi; xác nhận nghĩa",
              "speaking": "mô tả hiện tại và đối chiếu routine với phản hồi/tình huống mới",
              "writing": "viết cập nhật tình hình theo mục đích/người nhận mới",
              "objective": "O-CB03-L3: phân biệt việc đang xảy ra và thói quen với thông tin mới, giảm hỗ trợ",
              "prerequisite": "H: CB02; R: CB03-L1, CB03-L2 (không hard gate)"
            },
            {
              "code": "CB03-L4",
              "title": "Ôn, transfer và unit check",
              "status": "PLANNED",
              "grammar": "Truy hồi/vận dụng: Present continuous vs routine",
              "pronunciation": "Độ rõ khi transfer: -ing, nhịp mô tả",
              "vocabulary": "wearing, raining, working, now, usually",
              "reading": "Đọc mô tả ảnh/tình huống và lịch ở ngữ cảnh mới; tự xác định thông tin",
              "listening": "Nghe hành động đang diễn ra so với thường lệ mới, không xem lời giải trước",
              "speaking": "mô tả hiện tại và đối chiếu routine độc lập; rubric về nghĩa và độ rõ",
              "writing": "viết cập nhật tình hình không chép mẫu, tự rà nghĩa",
              "objective": "O-CB03-L4: phân biệt việc đang xảy ra và thói quen độc lập qua R/L/S/W; chỉ là unit check, không chứng nhận CEFR",
              "prerequisite": "H: CB02; R: CB03-L1, CB03-L2, CB03-L3 (không hard gate)"
            }
          ]
        },
        {
          "code": "CB04",
          "title": "Nhờ giúp/phối hợp",
          "canDo": "phối hợp việc đơn giản và xử lý thiếu thông tin",
          "hardPrerequisite": "CB03. Đây là mục tiêu năng lực, khác danh mục cấu trúc/âm/từ.",
          "lessons": [
            {
              "code": "CB04-L1",
              "title": "Mẫu câu phục vụ tác vụ",
              "status": "PLANNED",
              "grammar": "can requests, and/but; tổng hợp A1",
              "pronunciation": "Nhận biết trong mẫu: Ngữ điệu hỏi/làm rõ",
              "vocabulary": "help, please, together, but, request",
              "reading": "Đọc tin nhắn yêu cầu và phản hồi; nhận ra nghĩa/mẫu câu",
              "listening": "Nghe lời nhờ giúp và thông tin làm rõ; xác định ý chính",
              "speaking": "nhờ giúp/làm rõ và phản hồi lịch sự theo mẫu nhưng thay thông tin",
              "writing": "viết lời nhắn phối hợp việc quen với khung",
              "objective": "O-CB04-L1: phối hợp việc đơn giản và xử lý thiếu thông tin bằng cấu trúc mục tiêu, có hỗ trợ khung",
              "prerequisite": "H: CB03; R: đầu Unit (không hard gate)"
            },
            {
              "code": "CB04-L2",
              "title": "Nghe/nói rõ và giữ nghĩa",
              "status": "PLANNED",
              "grammar": "Câu mẫu L1: can requests, and/but; tổng hợp A1; không thêm cấu trúc mới",
              "pronunciation": "Trọng tâm: Ngữ điệu hỏi/làm rõ",
              "vocabulary": "help, please, together, but, request",
              "reading": "Đọc tin nhắn yêu cầu và phản hồi; đánh dấu âm/trọng âm để hỗ trợ hiểu",
              "listening": "Nghe lời nhờ giúp và thông tin làm rõ; phân biệt âm/nhịp và thông tin",
              "speaking": "nhờ giúp/làm rõ và phản hồi lịch sự: shadow rồi tự nói, giữ đúng nghĩa",
              "writing": "viết lời nhắn phối hợp việc quen từ thông tin đã nghe và lựa chọn của mình",
              "objective": "O-CB04-L2: nghe nhận đúng thông tin và nói dễ hiểu khi nhờ giúp/làm rõ và phản hồi lịch sự; không chấm giống giọng bản ngữ",
              "prerequisite": "H: CB03; R: CB04-L1 (không hard gate)"
            },
            {
              "code": "CB04-L3",
              "title": "Tích hợp từ vựng/giao tiếp",
              "status": "PLANNED",
              "grammar": "can requests, and/but; tổng hợp A1",
              "pronunciation": "Duy trì khi giao tiếp: Ngữ điệu hỏi/làm rõ",
              "vocabulary": "help, please, together, but, request",
              "reading": "Đọc bản mới của tin nhắn yêu cầu và phản hồi; chọn thông tin phục vụ tác vụ",
              "listening": "Nghe lời nhờ giúp và thông tin làm rõ với dữ kiện thay đổi; xác nhận nghĩa",
              "speaking": "nhờ giúp/làm rõ và phản hồi lịch sự với phản hồi/tình huống mới",
              "writing": "viết lời nhắn phối hợp việc quen theo mục đích/người nhận mới",
              "objective": "O-CB04-L3: phối hợp việc đơn giản và xử lý thiếu thông tin với thông tin mới, giảm hỗ trợ",
              "prerequisite": "H: CB03; R: CB04-L1, CB04-L2 (không hard gate)"
            },
            {
              "code": "CB04-L4",
              "title": "Ôn, transfer và unit check",
              "status": "PLANNED",
              "grammar": "Truy hồi/vận dụng: can requests, and/but; tổng hợp A1",
              "pronunciation": "Độ rõ khi transfer: Ngữ điệu hỏi/làm rõ",
              "vocabulary": "help, please, together, but, request",
              "reading": "Đọc tin nhắn yêu cầu và phản hồi ở ngữ cảnh mới; tự xác định thông tin",
              "listening": "Nghe lời nhờ giúp và thông tin làm rõ mới, không xem lời giải trước",
              "speaking": "nhờ giúp/làm rõ và phản hồi lịch sự độc lập; rubric về nghĩa và độ rõ",
              "writing": "viết lời nhắn phối hợp việc quen không chép mẫu, tự rà nghĩa",
              "objective": "O-CB04-L4: phối hợp việc đơn giản và xử lý thiếu thông tin độc lập qua R/L/S/W; chỉ là unit check, không chứng nhận CEFR",
              "prerequisite": "H: CB03; R: CB04-L1, CB04-L2, CB04-L3 (không hard gate)"
            }
          ]
        }
      ]
    },
    {
      "code": "CB-A2a",
      "path": "co-ban",
      "units": [
        {
          "code": "CB05",
          "title": "Chuyện đã xảy ra",
          "canDo": "kể một sự việc quá khứ đủ thông tin chính",
          "hardPrerequisite": "A1 checkpoint. Đây là mục tiêu năng lực, khác danh mục cấu trúc/âm/từ.",
          "lessons": [
            {
              "code": "CB05-L1",
              "title": "Mẫu câu phục vụ tác vụ",
              "status": "PLANNED",
              "grammar": "was/were; past simple thường gặp",
              "pronunciation": "Nhận biết trong mẫu: -ed và từ bất quy tắc được chọn",
              "vocabulary": "yesterday, went, visited, stayed, then",
              "reading": "Đọc tường thuật sự việc ngắn; nhận ra nghĩa/mẫu câu",
              "listening": "Nghe chuỗi sự kiện trong ngày đã qua; xác định ý chính",
              "speaking": "kể lại việc đã xảy ra theo trình tự theo mẫu nhưng thay thông tin",
              "writing": "viết đoạn kể việc ngắn với khung",
              "objective": "O-CB05-L1: kể một sự việc quá khứ đủ thông tin chính bằng cấu trúc mục tiêu, có hỗ trợ khung",
              "prerequisite": "H: A1 checkpoint; R: đầu Unit (không hard gate)"
            },
            {
              "code": "CB05-L2",
              "title": "Nghe/nói rõ và giữ nghĩa",
              "status": "PLANNED",
              "grammar": "Câu mẫu L1: was/were; past simple thường gặp; không thêm cấu trúc mới",
              "pronunciation": "Trọng tâm: -ed và từ bất quy tắc được chọn",
              "vocabulary": "yesterday, went, visited, stayed, then",
              "reading": "Đọc tường thuật sự việc ngắn; đánh dấu âm/trọng âm để hỗ trợ hiểu",
              "listening": "Nghe chuỗi sự kiện trong ngày đã qua; phân biệt âm/nhịp và thông tin",
              "speaking": "kể lại việc đã xảy ra theo trình tự: shadow rồi tự nói, giữ đúng nghĩa",
              "writing": "viết đoạn kể việc ngắn từ thông tin đã nghe và lựa chọn của mình",
              "objective": "O-CB05-L2: nghe nhận đúng thông tin và nói dễ hiểu khi kể lại việc đã xảy ra theo trình tự; không chấm giống giọng bản ngữ",
              "prerequisite": "H: A1 checkpoint; R: CB05-L1 (không hard gate)"
            },
            {
              "code": "CB05-L3",
              "title": "Tích hợp từ vựng/giao tiếp",
              "status": "PLANNED",
              "grammar": "was/were; past simple thường gặp",
              "pronunciation": "Duy trì khi giao tiếp: -ed và từ bất quy tắc được chọn",
              "vocabulary": "yesterday, went, visited, stayed, then",
              "reading": "Đọc bản mới của tường thuật sự việc ngắn; chọn thông tin phục vụ tác vụ",
              "listening": "Nghe chuỗi sự kiện trong ngày đã qua với dữ kiện thay đổi; xác nhận nghĩa",
              "speaking": "kể lại việc đã xảy ra theo trình tự với phản hồi/tình huống mới",
              "writing": "viết đoạn kể việc ngắn theo mục đích/người nhận mới",
              "objective": "O-CB05-L3: kể một sự việc quá khứ đủ thông tin chính với thông tin mới, giảm hỗ trợ",
              "prerequisite": "H: A1 checkpoint; R: CB05-L1, CB05-L2 (không hard gate)"
            },
            {
              "code": "CB05-L4",
              "title": "Ôn, transfer và unit check",
              "status": "PLANNED",
              "grammar": "Truy hồi/vận dụng: was/were; past simple thường gặp",
              "pronunciation": "Độ rõ khi transfer: -ed và từ bất quy tắc được chọn",
              "vocabulary": "yesterday, went, visited, stayed, then",
              "reading": "Đọc tường thuật sự việc ngắn ở ngữ cảnh mới; tự xác định thông tin",
              "listening": "Nghe chuỗi sự kiện trong ngày đã qua mới, không xem lời giải trước",
              "speaking": "kể lại việc đã xảy ra theo trình tự độc lập; rubric về nghĩa và độ rõ",
              "writing": "viết đoạn kể việc ngắn không chép mẫu, tự rà nghĩa",
              "objective": "O-CB05-L4: kể một sự việc quá khứ đủ thông tin chính độc lập qua R/L/S/W; chỉ là unit check, không chứng nhận CEFR",
              "prerequisite": "H: A1 checkpoint; R: CB05-L1, CB05-L2, CB05-L3 (không hard gate)"
            }
          ]
        },
        {
          "code": "CB06",
          "title": "Đi lại",
          "canDo": "tìm và trao đổi thông tin đi lại cần thiết",
          "hardPrerequisite": "CB05. Đây là mục tiêu năng lực, khác danh mục cấu trúc/âm/từ.",
          "lessons": [
            {
              "code": "CB06-L1",
              "title": "Mẫu câu phục vụ tác vụ",
              "status": "PLANNED",
              "grammar": "did questions; chỉ đường/giới từ",
              "pronunciation": "Nhận biết trong mẫu: Trọng âm thông tin, xác nhận",
              "vocabulary": "station, ticket, turn, arrive, where",
              "reading": "Đọc sơ đồ/thông báo đi lại; nhận ra nghĩa/mẫu câu",
              "listening": "Nghe chỉ đường và thông tin chuyến đi; xác định ý chính",
              "speaking": "hỏi đường/giờ và kiểm tra hiểu đúng theo mẫu nhưng thay thông tin",
              "writing": "viết chỉ dẫn/tin nhắn đi lại với khung",
              "objective": "O-CB06-L1: tìm và trao đổi thông tin đi lại cần thiết bằng cấu trúc mục tiêu, có hỗ trợ khung",
              "prerequisite": "H: CB05; R: đầu Unit (không hard gate)"
            },
            {
              "code": "CB06-L2",
              "title": "Nghe/nói rõ và giữ nghĩa",
              "status": "PLANNED",
              "grammar": "Câu mẫu L1: did questions; chỉ đường/giới từ; không thêm cấu trúc mới",
              "pronunciation": "Trọng tâm: Trọng âm thông tin, xác nhận",
              "vocabulary": "station, ticket, turn, arrive, where",
              "reading": "Đọc sơ đồ/thông báo đi lại; đánh dấu âm/trọng âm để hỗ trợ hiểu",
              "listening": "Nghe chỉ đường và thông tin chuyến đi; phân biệt âm/nhịp và thông tin",
              "speaking": "hỏi đường/giờ và kiểm tra hiểu đúng: shadow rồi tự nói, giữ đúng nghĩa",
              "writing": "viết chỉ dẫn/tin nhắn đi lại từ thông tin đã nghe và lựa chọn của mình",
              "objective": "O-CB06-L2: nghe nhận đúng thông tin và nói dễ hiểu khi hỏi đường/giờ và kiểm tra hiểu đúng; không chấm giống giọng bản ngữ",
              "prerequisite": "H: CB05; R: CB06-L1 (không hard gate)"
            },
            {
              "code": "CB06-L3",
              "title": "Tích hợp từ vựng/giao tiếp",
              "status": "PLANNED",
              "grammar": "did questions; chỉ đường/giới từ",
              "pronunciation": "Duy trì khi giao tiếp: Trọng âm thông tin, xác nhận",
              "vocabulary": "station, ticket, turn, arrive, where",
              "reading": "Đọc bản mới của sơ đồ/thông báo đi lại; chọn thông tin phục vụ tác vụ",
              "listening": "Nghe chỉ đường và thông tin chuyến đi với dữ kiện thay đổi; xác nhận nghĩa",
              "speaking": "hỏi đường/giờ và kiểm tra hiểu đúng với phản hồi/tình huống mới",
              "writing": "viết chỉ dẫn/tin nhắn đi lại theo mục đích/người nhận mới",
              "objective": "O-CB06-L3: tìm và trao đổi thông tin đi lại cần thiết với thông tin mới, giảm hỗ trợ",
              "prerequisite": "H: CB05; R: CB06-L1, CB06-L2 (không hard gate)"
            },
            {
              "code": "CB06-L4",
              "title": "Ôn, transfer và unit check",
              "status": "PLANNED",
              "grammar": "Truy hồi/vận dụng: did questions; chỉ đường/giới từ",
              "pronunciation": "Độ rõ khi transfer: Trọng âm thông tin, xác nhận",
              "vocabulary": "station, ticket, turn, arrive, where",
              "reading": "Đọc sơ đồ/thông báo đi lại ở ngữ cảnh mới; tự xác định thông tin",
              "listening": "Nghe chỉ đường và thông tin chuyến đi mới, không xem lời giải trước",
              "speaking": "hỏi đường/giờ và kiểm tra hiểu đúng độc lập; rubric về nghĩa và độ rõ",
              "writing": "viết chỉ dẫn/tin nhắn đi lại không chép mẫu, tự rà nghĩa",
              "objective": "O-CB06-L4: tìm và trao đổi thông tin đi lại cần thiết độc lập qua R/L/S/W; chỉ là unit check, không chứng nhận CEFR",
              "prerequisite": "H: CB05; R: CB06-L1, CB06-L2, CB06-L3 (không hard gate)"
            }
          ]
        },
        {
          "code": "CB07",
          "title": "Kế hoạch",
          "canDo": "thống nhất một kế hoạch quen thuộc",
          "hardPrerequisite": "CB06. Đây là mục tiêu năng lực, khác danh mục cấu trúc/âm/từ.",
          "lessons": [
            {
              "code": "CB07-L1",
              "title": "Mẫu câu phục vụ tác vụ",
              "status": "PLANNED",
              "grammar": "going to; will quen thuộc",
              "pronunciation": "Nhận biết trong mẫu: Nhịp và độ rõ cụm kế hoạch",
              "vocabulary": "plan, going to, tomorrow, meet, will",
              "reading": "Đọc lịch hẹn và kế hoạch; nhận ra nghĩa/mẫu câu",
              "listening": "Nghe dự định và thay đổi kế hoạch; xác định ý chính",
              "speaking": "đề xuất và thống nhất kế hoạch theo mẫu nhưng thay thông tin",
              "writing": "viết lời hẹn/xác nhận thay đổi với khung",
              "objective": "O-CB07-L1: thống nhất một kế hoạch quen thuộc bằng cấu trúc mục tiêu, có hỗ trợ khung",
              "prerequisite": "H: CB06; R: đầu Unit (không hard gate)"
            },
            {
              "code": "CB07-L2",
              "title": "Nghe/nói rõ và giữ nghĩa",
              "status": "PLANNED",
              "grammar": "Câu mẫu L1: going to; will quen thuộc; không thêm cấu trúc mới",
              "pronunciation": "Trọng tâm: Nhịp và độ rõ cụm kế hoạch",
              "vocabulary": "plan, going to, tomorrow, meet, will",
              "reading": "Đọc lịch hẹn và kế hoạch; đánh dấu âm/trọng âm để hỗ trợ hiểu",
              "listening": "Nghe dự định và thay đổi kế hoạch; phân biệt âm/nhịp và thông tin",
              "speaking": "đề xuất và thống nhất kế hoạch: shadow rồi tự nói, giữ đúng nghĩa",
              "writing": "viết lời hẹn/xác nhận thay đổi từ thông tin đã nghe và lựa chọn của mình",
              "objective": "O-CB07-L2: nghe nhận đúng thông tin và nói dễ hiểu khi đề xuất và thống nhất kế hoạch; không chấm giống giọng bản ngữ",
              "prerequisite": "H: CB06; R: CB07-L1 (không hard gate)"
            },
            {
              "code": "CB07-L3",
              "title": "Tích hợp từ vựng/giao tiếp",
              "status": "PLANNED",
              "grammar": "going to; will quen thuộc",
              "pronunciation": "Duy trì khi giao tiếp: Nhịp và độ rõ cụm kế hoạch",
              "vocabulary": "plan, going to, tomorrow, meet, will",
              "reading": "Đọc bản mới của lịch hẹn và kế hoạch; chọn thông tin phục vụ tác vụ",
              "listening": "Nghe dự định và thay đổi kế hoạch với dữ kiện thay đổi; xác nhận nghĩa",
              "speaking": "đề xuất và thống nhất kế hoạch với phản hồi/tình huống mới",
              "writing": "viết lời hẹn/xác nhận thay đổi theo mục đích/người nhận mới",
              "objective": "O-CB07-L3: thống nhất một kế hoạch quen thuộc với thông tin mới, giảm hỗ trợ",
              "prerequisite": "H: CB06; R: CB07-L1, CB07-L2 (không hard gate)"
            },
            {
              "code": "CB07-L4",
              "title": "Ôn, transfer và unit check",
              "status": "PLANNED",
              "grammar": "Truy hồi/vận dụng: going to; will quen thuộc",
              "pronunciation": "Độ rõ khi transfer: Nhịp và độ rõ cụm kế hoạch",
              "vocabulary": "plan, going to, tomorrow, meet, will",
              "reading": "Đọc lịch hẹn và kế hoạch ở ngữ cảnh mới; tự xác định thông tin",
              "listening": "Nghe dự định và thay đổi kế hoạch mới, không xem lời giải trước",
              "speaking": "đề xuất và thống nhất kế hoạch độc lập; rubric về nghĩa và độ rõ",
              "writing": "viết lời hẹn/xác nhận thay đổi không chép mẫu, tự rà nghĩa",
              "objective": "O-CB07-L4: thống nhất một kế hoạch quen thuộc độc lập qua R/L/S/W; chỉ là unit check, không chứng nhận CEFR",
              "prerequisite": "H: CB06; R: CB07-L1, CB07-L2, CB07-L3 (không hard gate)"
            }
          ]
        },
        {
          "code": "CB08",
          "title": "So sánh/lựa chọn",
          "canDo": "chọn và giải thích phương án theo nhu cầu",
          "hardPrerequisite": "CB07. Đây là mục tiêu năng lực, khác danh mục cấu trúc/âm/từ.",
          "lessons": [
            {
              "code": "CB08-L1",
              "title": "Mẫu câu phục vụ tác vụ",
              "status": "PLANNED",
              "grammar": "Comparative/superlative, because",
              "pronunciation": "Nhận biết trong mẫu: Trọng âm đối chiếu",
              "vocabulary": "cheaper, better, more, less, because",
              "reading": "Đọc bảng so sánh dịch vụ/đồ vật; nhận ra nghĩa/mẫu câu",
              "listening": "Nghe lý do chọn giữa các phương án; xác định ý chính",
              "speaking": "so sánh và giải thích lựa chọn theo mẫu nhưng thay thông tin",
              "writing": "viết đề xuất có lý do với khung",
              "objective": "O-CB08-L1: chọn và giải thích phương án theo nhu cầu bằng cấu trúc mục tiêu, có hỗ trợ khung",
              "prerequisite": "H: CB07; R: đầu Unit (không hard gate)"
            },
            {
              "code": "CB08-L2",
              "title": "Nghe/nói rõ và giữ nghĩa",
              "status": "PLANNED",
              "grammar": "Câu mẫu L1: Comparative/superlative, because; không thêm cấu trúc mới",
              "pronunciation": "Trọng tâm: Trọng âm đối chiếu",
              "vocabulary": "cheaper, better, more, less, because",
              "reading": "Đọc bảng so sánh dịch vụ/đồ vật; đánh dấu âm/trọng âm để hỗ trợ hiểu",
              "listening": "Nghe lý do chọn giữa các phương án; phân biệt âm/nhịp và thông tin",
              "speaking": "so sánh và giải thích lựa chọn: shadow rồi tự nói, giữ đúng nghĩa",
              "writing": "viết đề xuất có lý do từ thông tin đã nghe và lựa chọn của mình",
              "objective": "O-CB08-L2: nghe nhận đúng thông tin và nói dễ hiểu khi so sánh và giải thích lựa chọn; không chấm giống giọng bản ngữ",
              "prerequisite": "H: CB07; R: CB08-L1 (không hard gate)"
            },
            {
              "code": "CB08-L3",
              "title": "Tích hợp từ vựng/giao tiếp",
              "status": "PLANNED",
              "grammar": "Comparative/superlative, because",
              "pronunciation": "Duy trì khi giao tiếp: Trọng âm đối chiếu",
              "vocabulary": "cheaper, better, more, less, because",
              "reading": "Đọc bản mới của bảng so sánh dịch vụ/đồ vật; chọn thông tin phục vụ tác vụ",
              "listening": "Nghe lý do chọn giữa các phương án với dữ kiện thay đổi; xác nhận nghĩa",
              "speaking": "so sánh và giải thích lựa chọn với phản hồi/tình huống mới",
              "writing": "viết đề xuất có lý do theo mục đích/người nhận mới",
              "objective": "O-CB08-L3: chọn và giải thích phương án theo nhu cầu với thông tin mới, giảm hỗ trợ",
              "prerequisite": "H: CB07; R: CB08-L1, CB08-L2 (không hard gate)"
            },
            {
              "code": "CB08-L4",
              "title": "Ôn, transfer và unit check",
              "status": "PLANNED",
              "grammar": "Truy hồi/vận dụng: Comparative/superlative, because",
              "pronunciation": "Độ rõ khi transfer: Trọng âm đối chiếu",
              "vocabulary": "cheaper, better, more, less, because",
              "reading": "Đọc bảng so sánh dịch vụ/đồ vật ở ngữ cảnh mới; tự xác định thông tin",
              "listening": "Nghe lý do chọn giữa các phương án mới, không xem lời giải trước",
              "speaking": "so sánh và giải thích lựa chọn độc lập; rubric về nghĩa và độ rõ",
              "writing": "viết đề xuất có lý do không chép mẫu, tự rà nghĩa",
              "objective": "O-CB08-L4: chọn và giải thích phương án theo nhu cầu độc lập qua R/L/S/W; chỉ là unit check, không chứng nhận CEFR",
              "prerequisite": "H: CB07; R: CB08-L1, CB08-L2, CB08-L3 (không hard gate)"
            }
          ]
        }
      ]
    },
    {
      "code": "CB-A2b",
      "path": "co-ban",
      "units": [
        {
          "code": "CB09",
          "title": "Sức khỏe/lời khuyên",
          "canDo": "trao đổi vấn đề sinh hoạt bằng ngôn ngữ thông thường",
          "hardPrerequisite": "A2a checkpoint. Đây là mục tiêu năng lực, khác danh mục cấu trúc/âm/từ.",
          "lessons": [
            {
              "code": "CB09-L1",
              "title": "Mẫu câu phục vụ tác vụ",
              "status": "PLANNED",
              "grammar": "should, imperative, lý do",
              "pronunciation": "Nhận biết trong mẫu: Chia cụm, nhấn ý chính",
              "vocabulary": "should, rest, problem, advice, feel",
              "reading": "Đọc hướng dẫn sinh hoạt/lời khuyên thông thường; nhận ra nghĩa/mẫu câu",
              "listening": "Nghe vấn đề và lời khuyên thường gặp; xác định ý chính",
              "speaking": "nêu vấn đề và lời khuyên sinh hoạt phù hợp theo mẫu nhưng thay thông tin",
              "writing": "viết lời nhắn hỗ trợ ngắn với khung",
              "objective": "O-CB09-L1: trao đổi vấn đề sinh hoạt bằng ngôn ngữ thông thường bằng cấu trúc mục tiêu, có hỗ trợ khung",
              "prerequisite": "H: A2a checkpoint; R: đầu Unit (không hard gate)"
            },
            {
              "code": "CB09-L2",
              "title": "Nghe/nói rõ và giữ nghĩa",
              "status": "PLANNED",
              "grammar": "Câu mẫu L1: should, imperative, lý do; không thêm cấu trúc mới",
              "pronunciation": "Trọng tâm: Chia cụm, nhấn ý chính",
              "vocabulary": "should, rest, problem, advice, feel",
              "reading": "Đọc hướng dẫn sinh hoạt/lời khuyên thông thường; đánh dấu âm/trọng âm để hỗ trợ hiểu",
              "listening": "Nghe vấn đề và lời khuyên thường gặp; phân biệt âm/nhịp và thông tin",
              "speaking": "nêu vấn đề và lời khuyên sinh hoạt phù hợp: shadow rồi tự nói, giữ đúng nghĩa",
              "writing": "viết lời nhắn hỗ trợ ngắn từ thông tin đã nghe và lựa chọn của mình",
              "objective": "O-CB09-L2: nghe nhận đúng thông tin và nói dễ hiểu khi nêu vấn đề và lời khuyên sinh hoạt phù hợp; không chấm giống giọng bản ngữ",
              "prerequisite": "H: A2a checkpoint; R: CB09-L1 (không hard gate)"
            },
            {
              "code": "CB09-L3",
              "title": "Tích hợp từ vựng/giao tiếp",
              "status": "PLANNED",
              "grammar": "should, imperative, lý do",
              "pronunciation": "Duy trì khi giao tiếp: Chia cụm, nhấn ý chính",
              "vocabulary": "should, rest, problem, advice, feel",
              "reading": "Đọc bản mới của hướng dẫn sinh hoạt/lời khuyên thông thường; chọn thông tin phục vụ tác vụ",
              "listening": "Nghe vấn đề và lời khuyên thường gặp với dữ kiện thay đổi; xác nhận nghĩa",
              "speaking": "nêu vấn đề và lời khuyên sinh hoạt phù hợp với phản hồi/tình huống mới",
              "writing": "viết lời nhắn hỗ trợ ngắn theo mục đích/người nhận mới",
              "objective": "O-CB09-L3: trao đổi vấn đề sinh hoạt bằng ngôn ngữ thông thường với thông tin mới, giảm hỗ trợ",
              "prerequisite": "H: A2a checkpoint; R: CB09-L1, CB09-L2 (không hard gate)"
            },
            {
              "code": "CB09-L4",
              "title": "Ôn, transfer và unit check",
              "status": "PLANNED",
              "grammar": "Truy hồi/vận dụng: should, imperative, lý do",
              "pronunciation": "Độ rõ khi transfer: Chia cụm, nhấn ý chính",
              "vocabulary": "should, rest, problem, advice, feel",
              "reading": "Đọc hướng dẫn sinh hoạt/lời khuyên thông thường ở ngữ cảnh mới; tự xác định thông tin",
              "listening": "Nghe vấn đề và lời khuyên thường gặp mới, không xem lời giải trước",
              "speaking": "nêu vấn đề và lời khuyên sinh hoạt phù hợp độc lập; rubric về nghĩa và độ rõ",
              "writing": "viết lời nhắn hỗ trợ ngắn không chép mẫu, tự rà nghĩa",
              "objective": "O-CB09-L4: trao đổi vấn đề sinh hoạt bằng ngôn ngữ thông thường độc lập qua R/L/S/W; chỉ là unit check, không chứng nhận CEFR",
              "prerequisite": "H: A2a checkpoint; R: CB09-L1, CB09-L2, CB09-L3 (không hard gate)"
            }
          ]
        },
        {
          "code": "CB10",
          "title": "Trải nghiệm",
          "canDo": "kể trải nghiệm ngắn mạch lạc và giữ nghĩa",
          "hardPrerequisite": "CB09. Đây là mục tiêu năng lực, khác danh mục cấu trúc/âm/từ.",
          "lessons": [
            {
              "code": "CB10-L1",
              "title": "Mẫu câu phục vụ tác vụ",
              "status": "PLANNED",
              "grammar": "Past simple, từ nối trình tự",
              "pronunciation": "Nhận biết trong mẫu: Trọng âm kể chuyện",
              "vocabulary": "experience, first, after, before, finally",
              "reading": "Đọc câu chuyện trải nghiệm quen thuộc; nhận ra nghĩa/mẫu câu",
              "listening": "Nghe trình tự và chi tiết một trải nghiệm; xác định ý chính",
              "speaking": "kể trải nghiệm và trả lời câu hỏi làm rõ theo mẫu nhưng thay thông tin",
              "writing": "viết trải nghiệm có trình tự với khung",
              "objective": "O-CB10-L1: kể trải nghiệm ngắn mạch lạc và giữ nghĩa bằng cấu trúc mục tiêu, có hỗ trợ khung",
              "prerequisite": "H: CB09; R: đầu Unit (không hard gate)"
            },
            {
              "code": "CB10-L2",
              "title": "Nghe/nói rõ và giữ nghĩa",
              "status": "PLANNED",
              "grammar": "Câu mẫu L1: Past simple, từ nối trình tự; không thêm cấu trúc mới",
              "pronunciation": "Trọng tâm: Trọng âm kể chuyện",
              "vocabulary": "experience, first, after, before, finally",
              "reading": "Đọc câu chuyện trải nghiệm quen thuộc; đánh dấu âm/trọng âm để hỗ trợ hiểu",
              "listening": "Nghe trình tự và chi tiết một trải nghiệm; phân biệt âm/nhịp và thông tin",
              "speaking": "kể trải nghiệm và trả lời câu hỏi làm rõ: shadow rồi tự nói, giữ đúng nghĩa",
              "writing": "viết trải nghiệm có trình tự từ thông tin đã nghe và lựa chọn của mình",
              "objective": "O-CB10-L2: nghe nhận đúng thông tin và nói dễ hiểu khi kể trải nghiệm và trả lời câu hỏi làm rõ; không chấm giống giọng bản ngữ",
              "prerequisite": "H: CB09; R: CB10-L1 (không hard gate)"
            },
            {
              "code": "CB10-L3",
              "title": "Tích hợp từ vựng/giao tiếp",
              "status": "PLANNED",
              "grammar": "Past simple, từ nối trình tự",
              "pronunciation": "Duy trì khi giao tiếp: Trọng âm kể chuyện",
              "vocabulary": "experience, first, after, before, finally",
              "reading": "Đọc bản mới của câu chuyện trải nghiệm quen thuộc; chọn thông tin phục vụ tác vụ",
              "listening": "Nghe trình tự và chi tiết một trải nghiệm với dữ kiện thay đổi; xác nhận nghĩa",
              "speaking": "kể trải nghiệm và trả lời câu hỏi làm rõ với phản hồi/tình huống mới",
              "writing": "viết trải nghiệm có trình tự theo mục đích/người nhận mới",
              "objective": "O-CB10-L3: kể trải nghiệm ngắn mạch lạc và giữ nghĩa với thông tin mới, giảm hỗ trợ",
              "prerequisite": "H: CB09; R: CB10-L1, CB10-L2 (không hard gate)"
            },
            {
              "code": "CB10-L4",
              "title": "Ôn, transfer và unit check",
              "status": "PLANNED",
              "grammar": "Truy hồi/vận dụng: Past simple, từ nối trình tự",
              "pronunciation": "Độ rõ khi transfer: Trọng âm kể chuyện",
              "vocabulary": "experience, first, after, before, finally",
              "reading": "Đọc câu chuyện trải nghiệm quen thuộc ở ngữ cảnh mới; tự xác định thông tin",
              "listening": "Nghe trình tự và chi tiết một trải nghiệm mới, không xem lời giải trước",
              "speaking": "kể trải nghiệm và trả lời câu hỏi làm rõ độc lập; rubric về nghĩa và độ rõ",
              "writing": "viết trải nghiệm có trình tự không chép mẫu, tự rà nghĩa",
              "objective": "O-CB10-L4: kể trải nghiệm ngắn mạch lạc và giữ nghĩa độc lập qua R/L/S/W; chỉ là unit check, không chứng nhận CEFR",
              "prerequisite": "H: CB09; R: CB10-L1, CB10-L2, CB10-L3 (không hard gate)"
            }
          ]
        },
        {
          "code": "CB11",
          "title": "Xử lý việc thường lệ",
          "canDo": "xử lý hiểu nhầm bằng hỏi lại/xác nhận",
          "hardPrerequisite": "CB10. Đây là mục tiêu năng lực, khác danh mục cấu trúc/âm/từ.",
          "lessons": [
            {
              "code": "CB11-L1",
              "title": "Mẫu câu phục vụ tác vụ",
              "status": "PLANNED",
              "grammar": "Requests, clarification, first/then/because",
              "pronunciation": "Nhận biết trong mẫu: Hỏi lại, giọng lịch sự",
              "vocabulary": "repeat, explain, problem, solution, confirm",
              "reading": "Đọc email/tin nhắn xử lý việc thường lệ; nhận ra nghĩa/mẫu câu",
              "listening": "Nghe sự cố và thông tin cần hỏi lại; xác định ý chính",
              "speaking": "xin làm rõ và thống nhất bước tiếp theo theo mẫu nhưng thay thông tin",
              "writing": "viết phản hồi xử lý việc đơn giản với khung",
              "objective": "O-CB11-L1: xử lý hiểu nhầm bằng hỏi lại/xác nhận bằng cấu trúc mục tiêu, có hỗ trợ khung",
              "prerequisite": "H: CB10; R: đầu Unit (không hard gate)"
            },
            {
              "code": "CB11-L2",
              "title": "Nghe/nói rõ và giữ nghĩa",
              "status": "PLANNED",
              "grammar": "Câu mẫu L1: Requests, clarification, first/then/because; không thêm cấu trúc mới",
              "pronunciation": "Trọng tâm: Hỏi lại, giọng lịch sự",
              "vocabulary": "repeat, explain, problem, solution, confirm",
              "reading": "Đọc email/tin nhắn xử lý việc thường lệ; đánh dấu âm/trọng âm để hỗ trợ hiểu",
              "listening": "Nghe sự cố và thông tin cần hỏi lại; phân biệt âm/nhịp và thông tin",
              "speaking": "xin làm rõ và thống nhất bước tiếp theo: shadow rồi tự nói, giữ đúng nghĩa",
              "writing": "viết phản hồi xử lý việc đơn giản từ thông tin đã nghe và lựa chọn của mình",
              "objective": "O-CB11-L2: nghe nhận đúng thông tin và nói dễ hiểu khi xin làm rõ và thống nhất bước tiếp theo; không chấm giống giọng bản ngữ",
              "prerequisite": "H: CB10; R: CB11-L1 (không hard gate)"
            },
            {
              "code": "CB11-L3",
              "title": "Tích hợp từ vựng/giao tiếp",
              "status": "PLANNED",
              "grammar": "Requests, clarification, first/then/because",
              "pronunciation": "Duy trì khi giao tiếp: Hỏi lại, giọng lịch sự",
              "vocabulary": "repeat, explain, problem, solution, confirm",
              "reading": "Đọc bản mới của email/tin nhắn xử lý việc thường lệ; chọn thông tin phục vụ tác vụ",
              "listening": "Nghe sự cố và thông tin cần hỏi lại với dữ kiện thay đổi; xác nhận nghĩa",
              "speaking": "xin làm rõ và thống nhất bước tiếp theo với phản hồi/tình huống mới",
              "writing": "viết phản hồi xử lý việc đơn giản theo mục đích/người nhận mới",
              "objective": "O-CB11-L3: xử lý hiểu nhầm bằng hỏi lại/xác nhận với thông tin mới, giảm hỗ trợ",
              "prerequisite": "H: CB10; R: CB11-L1, CB11-L2 (không hard gate)"
            },
            {
              "code": "CB11-L4",
              "title": "Ôn, transfer và unit check",
              "status": "PLANNED",
              "grammar": "Truy hồi/vận dụng: Requests, clarification, first/then/because",
              "pronunciation": "Độ rõ khi transfer: Hỏi lại, giọng lịch sự",
              "vocabulary": "repeat, explain, problem, solution, confirm",
              "reading": "Đọc email/tin nhắn xử lý việc thường lệ ở ngữ cảnh mới; tự xác định thông tin",
              "listening": "Nghe sự cố và thông tin cần hỏi lại mới, không xem lời giải trước",
              "speaking": "xin làm rõ và thống nhất bước tiếp theo độc lập; rubric về nghĩa và độ rõ",
              "writing": "viết phản hồi xử lý việc đơn giản không chép mẫu, tự rà nghĩa",
              "objective": "O-CB11-L4: xử lý hiểu nhầm bằng hỏi lại/xác nhận độc lập qua R/L/S/W; chỉ là unit check, không chứng nhận CEFR",
              "prerequisite": "H: CB10; R: CB11-L1, CB11-L2, CB11-L3 (không hard gate)"
            }
          ]
        },
        {
          "code": "CB12",
          "title": "Dự án/chuyển tiếp",
          "canDo": "hoàn thành một nhiệm vụ tích hợp bằng kiến thức đã học",
          "hardPrerequisite": "CB11 + checkpoint bắt buộc. Đây là mục tiêu năng lực, khác danh mục cấu trúc/âm/từ.",
          "lessons": [
            {
              "code": "CB12-L1",
              "title": "Mẫu câu phục vụ tác vụ",
              "status": "PLANNED",
              "grammar": "Tổng hợp cấu trúc đã học",
              "pronunciation": "Nhận biết trong mẫu: Độ rõ, tự sửa, ngữ điệu",
              "vocabulary": "project, task, reason, result, next",
              "reading": "Đọc brief và email tổng hợp trong capstone; nhận ra nghĩa/mẫu câu",
              "listening": "Nghe yêu cầu và cập nhật ở tình huống mới; xác định ý chính",
              "speaking": "trình bày phương án và trả lời phản hồi theo mẫu nhưng thay thông tin",
              "writing": "viết thông điệp tổng hợp có mục đích với khung",
              "objective": "O-CB12-L1: hoàn thành một nhiệm vụ tích hợp bằng kiến thức đã học bằng cấu trúc mục tiêu, có hỗ trợ khung",
              "prerequisite": "H: CB11 + checkpoint bắt buộc; R: đầu Unit (không hard gate)"
            },
            {
              "code": "CB12-L2",
              "title": "Nghe/nói rõ và giữ nghĩa",
              "status": "PLANNED",
              "grammar": "Câu mẫu L1: Tổng hợp cấu trúc đã học; không thêm cấu trúc mới",
              "pronunciation": "Trọng tâm: Độ rõ, tự sửa, ngữ điệu",
              "vocabulary": "project, task, reason, result, next",
              "reading": "Đọc brief và email tổng hợp trong capstone; đánh dấu âm/trọng âm để hỗ trợ hiểu",
              "listening": "Nghe yêu cầu và cập nhật ở tình huống mới; phân biệt âm/nhịp và thông tin",
              "speaking": "trình bày phương án và trả lời phản hồi: shadow rồi tự nói, giữ đúng nghĩa",
              "writing": "viết thông điệp tổng hợp có mục đích từ thông tin đã nghe và lựa chọn của mình",
              "objective": "O-CB12-L2: nghe nhận đúng thông tin và nói dễ hiểu khi trình bày phương án và trả lời phản hồi; không chấm giống giọng bản ngữ",
              "prerequisite": "H: CB11 + checkpoint bắt buộc; R: CB12-L1 (không hard gate)"
            },
            {
              "code": "CB12-L3",
              "title": "Tích hợp từ vựng/giao tiếp",
              "status": "PLANNED",
              "grammar": "Tổng hợp cấu trúc đã học",
              "pronunciation": "Duy trì khi giao tiếp: Độ rõ, tự sửa, ngữ điệu",
              "vocabulary": "project, task, reason, result, next",
              "reading": "Đọc bản mới của brief và email tổng hợp trong capstone; chọn thông tin phục vụ tác vụ",
              "listening": "Nghe yêu cầu và cập nhật ở tình huống mới với dữ kiện thay đổi; xác nhận nghĩa",
              "speaking": "trình bày phương án và trả lời phản hồi với phản hồi/tình huống mới",
              "writing": "viết thông điệp tổng hợp có mục đích theo mục đích/người nhận mới",
              "objective": "O-CB12-L3: hoàn thành một nhiệm vụ tích hợp bằng kiến thức đã học với thông tin mới, giảm hỗ trợ",
              "prerequisite": "H: CB11 + checkpoint bắt buộc; R: CB12-L1, CB12-L2 (không hard gate)"
            },
            {
              "code": "CB12-L4",
              "title": "Ôn, transfer và unit check",
              "status": "PLANNED",
              "grammar": "Truy hồi/vận dụng: Tổng hợp cấu trúc đã học",
              "pronunciation": "Độ rõ khi transfer: Độ rõ, tự sửa, ngữ điệu",
              "vocabulary": "project, task, reason, result, next",
              "reading": "Đọc brief và email tổng hợp trong capstone ở ngữ cảnh mới; tự xác định thông tin",
              "listening": "Nghe yêu cầu và cập nhật ở tình huống mới mới, không xem lời giải trước",
              "speaking": "trình bày phương án và trả lời phản hồi độc lập; rubric về nghĩa và độ rõ",
              "writing": "viết thông điệp tổng hợp có mục đích không chép mẫu, tự rà nghĩa",
              "objective": "O-CB12-L4: hoàn thành một nhiệm vụ tích hợp bằng kiến thức đã học độc lập qua R/L/S/W; chỉ là unit check, không chứng nhận CEFR",
              "prerequisite": "H: CB11 + checkpoint bắt buộc; R: CB12-L1, CB12-L2, CB12-L3 (không hard gate)"
            }
          ]
        }
      ]
    }
  ],
  "videoSlots": [
    {
      "code": "VP-MG01-G",
      "purpose": "I/you + be; chào/giới thiệu; Giải thích cách dùng để giới thiệu và xác nhận thông tin bản thân",
      "type": "GRAMMAR_EXPLAINER",
      "lessonCodes": [
        "MG01-L1",
        "MG01-L3"
      ],
      "slot": "MG01-L1, MG01-L3; L1/theory; L3/optional review",
      "outline": "Tình huống Tôi là ai → nghĩa/cách dùng I/you + be; chào/giới thiệu → mẫu/đối chiếu sai thường gặp → áp vào dữ kiện mới",
      "exercises": "Nhận nghĩa/mẫu trong thẻ tên và hồ sơ giới thiệu → viết thẻ giới thiệu ngắn; liên kết E-MG01-L1-R/W",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "PILOT_CANDIDATE",
      "reuse": "L1 và L3 cùng Unit, chỉ khi binding được duyệt; không dùng như video chữa đáp án checkpoint"
    },
    {
      "code": "VP-P-ALPHABET",
      "purpose": "Âm và tên chữ trong tên người; nhận biết âm/tên chữ và nói tên rõ",
      "type": "PRONUNCIATION_DEMO",
      "lessonCodes": [
        "MG01-L2"
      ],
      "slot": "MG01-L2; L2/pronunciation support",
      "outline": "Nghe mẫu trong từ thật → quan sát khẩu hình/nhịp → đối chiếu giáo viên chọn → chậm/tự nhiên → tự nói câu khác",
      "exercises": "Nghe phân biệt → shadow → tự nói; exercise phải là Activity của Lesson được liên kết, không chấm qua video",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "PILOT_CANDIDATE",
      "reuse": "Dùng cùng nội dung ở nhiều Lesson phù hợp; không nhân thành nhiều resource/production khi chỉ thêm binding"
    },
    {
      "code": "VP-MG01-X",
      "purpose": "mở lời và tự giới thiệu; Làm rõ chiến lược để chào và giới thiệu tên/xuất xứ",
      "type": "SPEAKING_DEMO",
      "lessonCodes": [
        "MG01-L3"
      ],
      "slot": "MG01-L3; L3/worked example",
      "outline": "Nêu mục đích → xem một mẫu khác task kiểm tra → giáo viên giải thích lựa chọn/nghĩa → chỉ lỗi thường gặp → chuyển sang bài mới",
      "exercises": "chào và giới thiệu tên/xuất xứ với dữ kiện mới; map activity/evidence L3 sau authoring, không lấy đáp án video làm attempt",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "PILOT_CANDIDATE",
      "reuse": "Tài liệu bổ trợ cho kỹ năng/chủ đề tương đương khi mục tiêu và quyền phù hợp; thêm binding, không tự thêm completion"
    },
    {
      "code": "VP-MG02-G",
      "purpose": "a/an, this/that, số nhiều; Giải thích cách dùng để xác định và yêu cầu đúng đồ vật/số lượng",
      "type": "GRAMMAR_EXPLAINER",
      "lessonCodes": [
        "MG02-L1",
        "MG02-L3"
      ],
      "slot": "MG02-L1, MG02-L3; L1/theory; L3/optional review",
      "outline": "Tình huống Đồ vật quanh tôi → nghĩa/cách dùng a/an, this/that, số nhiều → mẫu/đối chiếu sai thường gặp → áp vào dữ kiện mới",
      "exercises": "Nhận nghĩa/mẫu trong nhãn và danh sách vật dụng → mô tả đồ vật/số lượng trong lời nhắn; liên kết E-MG02-L1-R/W",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "PILOT_CANDIDATE",
      "reuse": "L1 và L3 cùng Unit, chỉ khi binding được duyệt; không dùng như video chữa đáp án checkpoint"
    },
    {
      "code": "VP-P-ENDINGS-S",
      "purpose": "Các đuôi /s z ɪz/ trong từ quen; nghe và nói rõ đuôi mà không làm đổi số lượng/chủ thể",
      "type": "PRONUNCIATION_DEMO",
      "lessonCodes": [
        "MG02-L2",
        "CB01-L2"
      ],
      "slot": "MG02-L2, CB01-L2; L2/pronunciation support",
      "outline": "Nghe mẫu trong từ thật → quan sát khẩu hình/nhịp → đối chiếu giáo viên chọn → chậm/tự nhiên → tự nói câu khác",
      "exercises": "Nghe phân biệt → shadow → tự nói; exercise phải là Activity của Lesson được liên kết, không chấm qua video",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "PILOT_CANDIDATE",
      "reuse": "Dùng cùng nội dung ở nhiều Lesson phù hợp; không nhân thành nhiều resource/production khi chỉ thêm binding"
    },
    {
      "code": "VP-MG02-X",
      "purpose": "học từ qua vật dụng và ngữ cảnh; Làm rõ chiến lược để dùng a pen, a book, a bag, this, that trong tình huống Đồ vật quanh tôi",
      "type": "VOCABULARY_CONTEXT",
      "lessonCodes": [
        "MG02-L3"
      ],
      "slot": "MG02-L3; L3/worked example",
      "outline": "Nêu mục đích → xem một mẫu khác task kiểm tra → giáo viên giải thích lựa chọn/nghĩa → chỉ lỗi thường gặp → chuyển sang bài mới",
      "exercises": "dùng a pen, a book, a bag, this, that trong tình huống Đồ vật quanh tôi với dữ kiện mới; map activity/evidence L3 sau authoring, không lấy đáp án video làm attempt",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "PILOT_CANDIDATE",
      "reuse": "Tài liệu bổ trợ cho kỹ năng/chủ đề tương đương khi mục tiêu và quyền phù hợp; thêm binding, không tự thêm completion"
    },
    {
      "code": "VP-MG03-G",
      "purpose": "he/she + be; my/your/his/her; Giải thích cách dùng để trao đổi đúng thông tin về người quen",
      "type": "GRAMMAR_EXPLAINER",
      "lessonCodes": [
        "MG03-L1",
        "MG03-L3"
      ],
      "slot": "MG03-L1, MG03-L3; L1/theory; L3/optional review",
      "outline": "Tình huống Người thân → nghĩa/cách dùng he/she + be; my/your/his/her → mẫu/đối chiếu sai thường gặp → áp vào dữ kiện mới",
      "exercises": "Nhận nghĩa/mẫu trong hồ sơ gia đình/người quen → viết hồ sơ một người quen; liên kết E-MG03-L1-R/W",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "L1 và L3 cùng Unit, chỉ khi binding được duyệt; không dùng như video chữa đáp án checkpoint"
    },
    {
      "code": "VP-P-VOWEL-PAIRS",
      "purpose": "Tương phản nguyên âm trong từ quen; phân biệt âm mục tiêu theo bộ từ giáo viên duyệt",
      "type": "PRONUNCIATION_DEMO",
      "lessonCodes": [
        "MG03-L2"
      ],
      "slot": "MG03-L2; L2/pronunciation support",
      "outline": "Nghe mẫu trong từ thật → quan sát khẩu hình/nhịp → đối chiếu giáo viên chọn → chậm/tự nhiên → tự nói câu khác",
      "exercises": "Nghe phân biệt → shadow → tự nói; exercise phải là Activity của Lesson được liên kết, không chấm qua video",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Dùng cùng nội dung ở nhiều Lesson phù hợp; không nhân thành nhiều resource/production khi chỉ thêm binding"
    },
    {
      "code": "VP-MG03-X",
      "purpose": "tìm ai là ai trong hồ sơ ngắn; Làm rõ chiến lược để đọc hồ sơ gia đình/người quen",
      "type": "READING_WALKTHROUGH",
      "lessonCodes": [
        "MG03-L3"
      ],
      "slot": "MG03-L3; L3/worked example",
      "outline": "Nêu mục đích → xem một mẫu khác task kiểm tra → giáo viên giải thích lựa chọn/nghĩa → chỉ lỗi thường gặp → chuyển sang bài mới",
      "exercises": "đọc hồ sơ gia đình/người quen với dữ kiện mới; map activity/evidence L3 sau authoring, không lấy đáp án video làm attempt",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Tài liệu bổ trợ cho kỹ năng/chủ đề tương đương khi mục tiêu và quyền phù hợp; thêm binding, không tự thêm completion"
    },
    {
      "code": "VP-MG04-G",
      "purpose": "be questions; what/where; Giải thích cách dùng để ghi nhận và xác nhận đúng thông tin liên hệ",
      "type": "GRAMMAR_EXPLAINER",
      "lessonCodes": [
        "MG04-L1",
        "MG04-L3"
      ],
      "slot": "MG04-L1, MG04-L3; L1/theory; L3/optional review",
      "outline": "Tình huống Số và liên hệ → nghĩa/cách dùng be questions; what/where → mẫu/đối chiếu sai thường gặp → áp vào dữ kiện mới",
      "exercises": "Nhận nghĩa/mẫu trong biểu mẫu liên hệ và giờ hẹn → điền rồi viết xác nhận thông tin liên hệ; liên kết E-MG04-L1-R/W",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "L1 và L3 cùng Unit, chỉ khi binding được duyệt; không dùng như video chữa đáp án checkpoint"
    },
    {
      "code": "VP-P-NUMBER-STRESS",
      "purpose": "Trọng âm và nhịp số/giờ; phân biệt và xác nhận số/giờ đúng",
      "type": "PRONUNCIATION_DEMO",
      "lessonCodes": [
        "MG04-L2",
        "CB02-L2"
      ],
      "slot": "MG04-L2, CB02-L2; L2/pronunciation support",
      "outline": "Nghe mẫu trong từ thật → quan sát khẩu hình/nhịp → đối chiếu giáo viên chọn → chậm/tự nhiên → tự nói câu khác",
      "exercises": "Nghe phân biệt → shadow → tự nói; exercise phải là Activity của Lesson được liên kết, không chấm qua video",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Dùng cùng nội dung ở nhiều Lesson phù hợp; không nhân thành nhiều resource/production khi chỉ thêm binding"
    },
    {
      "code": "VP-MG04-X",
      "purpose": "nghe rồi kiểm tra số và giờ; Làm rõ chiến lược để nghe số điện thoại/giờ cần xác nhận",
      "type": "LISTENING_STRATEGY",
      "lessonCodes": [
        "MG04-L3"
      ],
      "slot": "MG04-L3; L3/worked example",
      "outline": "Nêu mục đích → xem một mẫu khác task kiểm tra → giáo viên giải thích lựa chọn/nghĩa → chỉ lỗi thường gặp → chuyển sang bài mới",
      "exercises": "nghe số điện thoại/giờ cần xác nhận với dữ kiện mới; map activity/evidence L3 sau authoring, không lấy đáp án video làm attempt",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Tài liệu bổ trợ cho kỹ năng/chủ đề tương đương khi mục tiêu và quyền phù hợp; thêm binding, không tự thêm completion"
    },
    {
      "code": "VP-MG05-G",
      "purpose": "Present simple I/you; frequency; Giải thích cách dùng để mô tả thói quen quen thuộc có trình tự",
      "type": "GRAMMAR_EXPLAINER",
      "lessonCodes": [
        "MG05-L1",
        "MG05-L3"
      ],
      "slot": "MG05-L1, MG05-L3; L1/theory; L3/optional review",
      "outline": "Tình huống Ngày của tôi → nghĩa/cách dùng Present simple I/you; frequency → mẫu/đối chiếu sai thường gặp → áp vào dữ kiện mới",
      "exercises": "Nhận nghĩa/mẫu trong lịch một ngày → viết routine theo lịch thật của mình; liên kết E-MG05-L1-R/W",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "L1 và L3 cùng Unit, chỉ khi binding được duyệt; không dùng như video chữa đáp án checkpoint"
    },
    {
      "code": "VP-P-WORD-STRESS",
      "purpose": "Trọng âm từ và âm yếu quen thuộc; chia nhịp câu quen thuộc dễ hiểu",
      "type": "PRONUNCIATION_DEMO",
      "lessonCodes": [
        "MG05-L2"
      ],
      "slot": "MG05-L2; L2/pronunciation support",
      "outline": "Nghe mẫu trong từ thật → quan sát khẩu hình/nhịp → đối chiếu giáo viên chọn → chậm/tự nhiên → tự nói câu khác",
      "exercises": "Nghe phân biệt → shadow → tự nói; exercise phải là Activity của Lesson được liên kết, không chấm qua video",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Dùng cùng nội dung ở nhiều Lesson phù hợp; không nhân thành nhiều resource/production khi chỉ thêm binding"
    },
    {
      "code": "VP-MG05-X",
      "purpose": "từ lịch sang lời mô tả routine; Làm rõ chiến lược để viết routine theo lịch thật của mình",
      "type": "WRITING_WORKED_EXAMPLE",
      "lessonCodes": [
        "MG05-L3"
      ],
      "slot": "MG05-L3; L3/worked example",
      "outline": "Nêu mục đích → xem một mẫu khác task kiểm tra → giáo viên giải thích lựa chọn/nghĩa → chỉ lỗi thường gặp → chuyển sang bài mới",
      "exercises": "viết routine theo lịch thật của mình với dữ kiện mới; map activity/evidence L3 sau authoring, không lấy đáp án video làm attempt",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Tài liệu bổ trợ cho kỹ năng/chủ đề tương đương khi mục tiêu và quyền phù hợp; thêm binding, không tự thêm completion"
    },
    {
      "code": "VP-MG06-G",
      "purpose": "do/don't; like + noun; Giải thích cách dùng để trao đổi lựa chọn và sở thích dễ hiểu",
      "type": "GRAMMAR_EXPLAINER",
      "lessonCodes": [
        "MG06-L1",
        "MG06-L3"
      ],
      "slot": "MG06-L1, MG06-L3; L1/theory; L3/optional review",
      "outline": "Tình huống Điều tôi thích → nghĩa/cách dùng do/don't; like + noun → mẫu/đối chiếu sai thường gặp → áp vào dữ kiện mới",
      "exercises": "Nhận nghĩa/mẫu trong bảng sở thích và thực đơn ngắn → viết lời nhắn nêu lựa chọn; liên kết E-MG06-L1-R/W",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "L1 và L3 cùng Unit, chỉ khi binding được duyệt; không dùng như video chữa đáp án checkpoint"
    },
    {
      "code": "VP-P-QUESTION-TONE",
      "purpose": "Ngữ điệu hỏi và xác nhận; hỏi và kiểm tra hiểu đúng thông tin",
      "type": "PRONUNCIATION_DEMO",
      "lessonCodes": [
        "MG06-L2",
        "CB06-L2"
      ],
      "slot": "MG06-L2, CB06-L2; L2/pronunciation support",
      "outline": "Nghe mẫu trong từ thật → quan sát khẩu hình/nhịp → đối chiếu giáo viên chọn → chậm/tự nhiên → tự nói câu khác",
      "exercises": "Nghe phân biệt → shadow → tự nói; exercise phải là Activity của Lesson được liên kết, không chấm qua video",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Dùng cùng nội dung ở nhiều Lesson phù hợp; không nhân thành nhiều resource/production khi chỉ thêm binding"
    },
    {
      "code": "VP-MG06-X",
      "purpose": "hỏi sở thích và nối lượt hội thoại; Làm rõ chiến lược để hỏi/đáp sở thích và phản hồi",
      "type": "SPEAKING_DEMO",
      "lessonCodes": [
        "MG06-L3"
      ],
      "slot": "MG06-L3; L3/worked example",
      "outline": "Nêu mục đích → xem một mẫu khác task kiểm tra → giáo viên giải thích lựa chọn/nghĩa → chỉ lỗi thường gặp → chuyển sang bài mới",
      "exercises": "hỏi/đáp sở thích và phản hồi với dữ kiện mới; map activity/evidence L3 sau authoring, không lấy đáp án video làm attempt",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Tài liệu bổ trợ cho kỹ năng/chủ đề tương đương khi mục tiêu và quyền phù hợp; thêm binding, không tự thêm completion"
    },
    {
      "code": "VP-MG07-G",
      "purpose": "there is/are; giới từ vị trí; Giải thích cách dùng để giúp người khác tìm đúng nơi/đồ vật",
      "type": "GRAMMAR_EXPLAINER",
      "lessonCodes": [
        "MG07-L1",
        "MG07-L3"
      ],
      "slot": "MG07-L1, MG07-L3; L1/theory; L3/optional review",
      "outline": "Tình huống Nhà và khu vực → nghĩa/cách dùng there is/are; giới từ vị trí → mẫu/đối chiếu sai thường gặp → áp vào dữ kiện mới",
      "exercises": "Nhận nghĩa/mẫu trong sơ đồ phòng/khu vực → viết chỉ dẫn vị trí ngắn; liên kết E-MG07-L1-R/W",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "L1 và L3 cùng Unit, chỉ khi binding được duyệt; không dùng như video chữa đáp án checkpoint"
    },
    {
      "code": "VP-P-CHUNKING",
      "purpose": "Chia cụm thông tin khi nghe/nói; giữ nghĩa khi xử lý câu theo cụm",
      "type": "PRONUNCIATION_DEMO",
      "lessonCodes": [
        "MG07-L2",
        "CB07-L2",
        "CB09-L2"
      ],
      "slot": "MG07-L2, CB07-L2, CB09-L2; L2/pronunciation support",
      "outline": "Nghe mẫu trong từ thật → quan sát khẩu hình/nhịp → đối chiếu giáo viên chọn → chậm/tự nhiên → tự nói câu khác",
      "exercises": "Nghe phân biệt → shadow → tự nói; exercise phải là Activity của Lesson được liên kết, không chấm qua video",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Dùng cùng nội dung ở nhiều Lesson phù hợp; không nhân thành nhiều resource/production khi chỉ thêm binding"
    },
    {
      "code": "VP-MG07-X",
      "purpose": "nghe chỉ dẫn theo cụm thông tin; Làm rõ chiến lược để nghe chỉ dẫn vị trí đơn giản",
      "type": "LISTENING_STRATEGY",
      "lessonCodes": [
        "MG07-L3"
      ],
      "slot": "MG07-L3; L3/worked example",
      "outline": "Nêu mục đích → xem một mẫu khác task kiểm tra → giáo viên giải thích lựa chọn/nghĩa → chỉ lỗi thường gặp → chuyển sang bài mới",
      "exercises": "nghe chỉ dẫn vị trí đơn giản với dữ kiện mới; map activity/evidence L3 sau authoring, không lấy đáp án video làm attempt",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Tài liệu bổ trợ cho kỹ năng/chủ đề tương đương khi mục tiêu và quyền phù hợp; thêm binding, không tự thêm completion"
    },
    {
      "code": "VP-MG08-G",
      "purpose": "can/can't; mệnh lệnh; ôn câu đơn; Giải thích cách dùng để thực hiện trao đổi đơn giản về khả năng và nhiệm vụ",
      "type": "GRAMMAR_EXPLAINER",
      "lessonCodes": [
        "MG08-L1",
        "MG08-L3"
      ],
      "slot": "MG08-L1, MG08-L3; L1/theory; L3/optional review",
      "outline": "Tình huống Tôi làm được gì → nghĩa/cách dùng can/can't; mệnh lệnh; ôn câu đơn → mẫu/đối chiếu sai thường gặp → áp vào dữ kiện mới",
      "exercises": "Nhận nghĩa/mẫu trong chỉ dẫn và mô tả khả năng → viết chỉ dẫn/khả năng phù hợp ngữ cảnh; liên kết E-MG08-L1-R/W",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "L1 và L3 cùng Unit, chỉ khi binding được duyệt; không dùng như video chữa đáp án checkpoint"
    },
    {
      "code": "VP-P-CAN-CONTRAST",
      "purpose": "Can/cannot và trọng âm mang nghĩa; thể hiện rõ ý khẳng định/phủ định",
      "type": "PRONUNCIATION_DEMO",
      "lessonCodes": [
        "MG08-L2"
      ],
      "slot": "MG08-L2; L2/pronunciation support",
      "outline": "Nghe mẫu trong từ thật → quan sát khẩu hình/nhịp → đối chiếu giáo viên chọn → chậm/tự nhiên → tự nói câu khác",
      "exercises": "Nghe phân biệt → shadow → tự nói; exercise phải là Activity của Lesson được liên kết, không chấm qua video",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Dùng cùng nội dung ở nhiều Lesson phù hợp; không nhân thành nhiều resource/production khi chỉ thêm binding"
    },
    {
      "code": "VP-MG08-X",
      "purpose": "viết chỉ dẫn rõ và an toàn trong tình huống quen; Làm rõ chiến lược để viết chỉ dẫn/khả năng phù hợp ngữ cảnh",
      "type": "WRITING_WORKED_EXAMPLE",
      "lessonCodes": [
        "MG08-L3"
      ],
      "slot": "MG08-L3; L3/worked example",
      "outline": "Nêu mục đích → xem một mẫu khác task kiểm tra → giáo viên giải thích lựa chọn/nghĩa → chỉ lỗi thường gặp → chuyển sang bài mới",
      "exercises": "viết chỉ dẫn/khả năng phù hợp ngữ cảnh với dữ kiện mới; map activity/evidence L3 sau authoring, không lấy đáp án video làm attempt",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Tài liệu bổ trợ cho kỹ năng/chủ đề tương đương khi mục tiêu và quyền phù hợp; thêm binding, không tự thêm completion"
    },
    {
      "code": "VP-CB01-G",
      "purpose": "Present simple ngôi 3, do/does, wh; Giải thích cách dùng để trao đổi lịch và thói quen không nhầm chủ thể",
      "type": "GRAMMAR_EXPLAINER",
      "lessonCodes": [
        "CB01-L1",
        "CB01-L3"
      ],
      "slot": "CB01-L1, CB01-L3; L1/theory; L3/optional review",
      "outline": "Tình huống Thói quen/công việc → nghĩa/cách dùng Present simple ngôi 3, do/does, wh → mẫu/đối chiếu sai thường gặp → áp vào dữ kiện mới",
      "exercises": "Nhận nghĩa/mẫu trong lịch làm việc của hai người → viết routine cá nhân/người khác; liên kết E-CB01-L1-R/W",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "L1 và L3 cùng Unit, chỉ khi binding được duyệt; không dùng như video chữa đáp án checkpoint"
    },
    {
      "code": "VP-CB01-X",
      "purpose": "nghe do/does và đối chiếu lịch; Làm rõ chiến lược để nghe routine và thay đổi giờ làm",
      "type": "LISTENING_STRATEGY",
      "lessonCodes": [
        "CB01-L3"
      ],
      "slot": "CB01-L3; L3/worked example",
      "outline": "Nêu mục đích → xem một mẫu khác task kiểm tra → giáo viên giải thích lựa chọn/nghĩa → chỉ lỗi thường gặp → chuyển sang bài mới",
      "exercises": "nghe routine và thay đổi giờ làm với dữ kiện mới; map activity/evidence L3 sau authoring, không lấy đáp án video làm attempt",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Tài liệu bổ trợ cho kỹ năng/chủ đề tương đương khi mục tiêu và quyền phù hợp; thêm binding, không tự thêm completion"
    },
    {
      "code": "VP-CB02-G",
      "purpose": "Count/uncount, some/any, how much/many; Giải thích cách dùng để thực hiện giao dịch quen thuộc đúng nhu cầu",
      "type": "GRAMMAR_EXPLAINER",
      "lessonCodes": [
        "CB02-L1",
        "CB02-L3"
      ],
      "slot": "CB02-L1, CB02-L3; L1/theory; L3/optional review",
      "outline": "Tình huống Mua sắm/ăn uống → nghĩa/cách dùng Count/uncount, some/any, how much/many → mẫu/đối chiếu sai thường gặp → áp vào dữ kiện mới",
      "exercises": "Nhận nghĩa/mẫu trong menu/bảng giá và đơn hàng → viết đơn/lời nhắn mua đồ; liên kết E-CB02-L1-R/W",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "L1 và L3 cùng Unit, chỉ khi binding được duyệt; không dùng như video chữa đáp án checkpoint"
    },
    {
      "code": "VP-CB02-X",
      "purpose": "yêu cầu và xác nhận giao dịch; Làm rõ chiến lược để đặt mua và xác nhận số lượng",
      "type": "SPEAKING_DEMO",
      "lessonCodes": [
        "CB02-L3"
      ],
      "slot": "CB02-L3; L3/worked example",
      "outline": "Nêu mục đích → xem một mẫu khác task kiểm tra → giáo viên giải thích lựa chọn/nghĩa → chỉ lỗi thường gặp → chuyển sang bài mới",
      "exercises": "đặt mua và xác nhận số lượng với dữ kiện mới; map activity/evidence L3 sau authoring, không lấy đáp án video làm attempt",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Tài liệu bổ trợ cho kỹ năng/chủ đề tương đương khi mục tiêu và quyền phù hợp; thêm binding, không tự thêm completion"
    },
    {
      "code": "VP-CB03-G",
      "purpose": "Present continuous vs routine; Giải thích cách dùng để phân biệt việc đang xảy ra và thói quen",
      "type": "GRAMMAR_EXPLAINER",
      "lessonCodes": [
        "CB03-L1",
        "CB03-L3"
      ],
      "slot": "CB03-L1, CB03-L3; L1/theory; L3/optional review",
      "outline": "Tình huống Điều đang diễn ra → nghĩa/cách dùng Present continuous vs routine → mẫu/đối chiếu sai thường gặp → áp vào dữ kiện mới",
      "exercises": "Nhận nghĩa/mẫu trong mô tả ảnh/tình huống và lịch → viết cập nhật tình hình; liên kết E-CB03-L1-R/W",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "L1 và L3 cùng Unit, chỉ khi binding được duyệt; không dùng như video chữa đáp án checkpoint"
    },
    {
      "code": "VP-P-ING",
      "purpose": "Đuôi -ing trong mô tả hành động; nghe/nói rõ từ mô tả việc đang diễn ra",
      "type": "PRONUNCIATION_DEMO",
      "lessonCodes": [
        "CB03-L2"
      ],
      "slot": "CB03-L2; L2/pronunciation support",
      "outline": "Nghe mẫu trong từ thật → quan sát khẩu hình/nhịp → đối chiếu giáo viên chọn → chậm/tự nhiên → tự nói câu khác",
      "exercises": "Nghe phân biệt → shadow → tự nói; exercise phải là Activity của Lesson được liên kết, không chấm qua video",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Dùng cùng nội dung ở nhiều Lesson phù hợp; không nhân thành nhiều resource/production khi chỉ thêm binding"
    },
    {
      "code": "VP-CB03-X",
      "purpose": "đọc dấu hiệu ngữ cảnh trước khi chọn thì; Làm rõ chiến lược để đọc mô tả ảnh/tình huống và lịch",
      "type": "READING_WALKTHROUGH",
      "lessonCodes": [
        "CB03-L3"
      ],
      "slot": "CB03-L3; L3/worked example",
      "outline": "Nêu mục đích → xem một mẫu khác task kiểm tra → giáo viên giải thích lựa chọn/nghĩa → chỉ lỗi thường gặp → chuyển sang bài mới",
      "exercises": "đọc mô tả ảnh/tình huống và lịch với dữ kiện mới; map activity/evidence L3 sau authoring, không lấy đáp án video làm attempt",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Tài liệu bổ trợ cho kỹ năng/chủ đề tương đương khi mục tiêu và quyền phù hợp; thêm binding, không tự thêm completion"
    },
    {
      "code": "VP-CB04-G",
      "purpose": "can requests, and/but; tổng hợp A1; Giải thích cách dùng để phối hợp việc đơn giản và xử lý thiếu thông tin",
      "type": "GRAMMAR_EXPLAINER",
      "lessonCodes": [
        "CB04-L1",
        "CB04-L3"
      ],
      "slot": "CB04-L1, CB04-L3; L1/theory; L3/optional review",
      "outline": "Tình huống Nhờ giúp/phối hợp → nghĩa/cách dùng can requests, and/but; tổng hợp A1 → mẫu/đối chiếu sai thường gặp → áp vào dữ kiện mới",
      "exercises": "Nhận nghĩa/mẫu trong tin nhắn yêu cầu và phản hồi → viết lời nhắn phối hợp việc quen; liên kết E-CB04-L1-R/W",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "L1 và L3 cùng Unit, chỉ khi binding được duyệt; không dùng như video chữa đáp án checkpoint"
    },
    {
      "code": "VP-P-REQUEST-TONE",
      "purpose": "Ngữ điệu yêu cầu lịch sự; nhờ giúp và phản hồi dễ hiểu",
      "type": "PRONUNCIATION_DEMO",
      "lessonCodes": [
        "CB04-L2"
      ],
      "slot": "CB04-L2; L2/pronunciation support",
      "outline": "Nghe mẫu trong từ thật → quan sát khẩu hình/nhịp → đối chiếu giáo viên chọn → chậm/tự nhiên → tự nói câu khác",
      "exercises": "Nghe phân biệt → shadow → tự nói; exercise phải là Activity của Lesson được liên kết, không chấm qua video",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Dùng cùng nội dung ở nhiều Lesson phù hợp; không nhân thành nhiều resource/production khi chỉ thêm binding"
    },
    {
      "code": "VP-CB04-X",
      "purpose": "viết yêu cầu ngắn có người nhận/mục đích; Làm rõ chiến lược để viết lời nhắn phối hợp việc quen",
      "type": "WRITING_WORKED_EXAMPLE",
      "lessonCodes": [
        "CB04-L3"
      ],
      "slot": "CB04-L3; L3/worked example",
      "outline": "Nêu mục đích → xem một mẫu khác task kiểm tra → giáo viên giải thích lựa chọn/nghĩa → chỉ lỗi thường gặp → chuyển sang bài mới",
      "exercises": "viết lời nhắn phối hợp việc quen với dữ kiện mới; map activity/evidence L3 sau authoring, không lấy đáp án video làm attempt",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Tài liệu bổ trợ cho kỹ năng/chủ đề tương đương khi mục tiêu và quyền phù hợp; thêm binding, không tự thêm completion"
    },
    {
      "code": "VP-CB05-G",
      "purpose": "was/were; past simple thường gặp; Giải thích cách dùng để kể một sự việc quá khứ đủ thông tin chính",
      "type": "GRAMMAR_EXPLAINER",
      "lessonCodes": [
        "CB05-L1",
        "CB05-L3"
      ],
      "slot": "CB05-L1, CB05-L3; L1/theory; L3/optional review",
      "outline": "Tình huống Chuyện đã xảy ra → nghĩa/cách dùng was/were; past simple thường gặp → mẫu/đối chiếu sai thường gặp → áp vào dữ kiện mới",
      "exercises": "Nhận nghĩa/mẫu trong tường thuật sự việc ngắn → viết đoạn kể việc ngắn; liên kết E-CB05-L1-R/W",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "L1 và L3 cùng Unit, chỉ khi binding được duyệt; không dùng như video chữa đáp án checkpoint"
    },
    {
      "code": "VP-P-ED",
      "purpose": "Đuôi -ed của từ đã học; nghe/nói rõ thông tin sự việc quá khứ",
      "type": "PRONUNCIATION_DEMO",
      "lessonCodes": [
        "CB05-L2"
      ],
      "slot": "CB05-L2; L2/pronunciation support",
      "outline": "Nghe mẫu trong từ thật → quan sát khẩu hình/nhịp → đối chiếu giáo viên chọn → chậm/tự nhiên → tự nói câu khác",
      "exercises": "Nghe phân biệt → shadow → tự nói; exercise phải là Activity của Lesson được liên kết, không chấm qua video",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Dùng cùng nội dung ở nhiều Lesson phù hợp; không nhân thành nhiều resource/production khi chỉ thêm binding"
    },
    {
      "code": "VP-CB05-X",
      "purpose": "kể chuyện ngắn mà không chỉ đọc mẫu; Làm rõ chiến lược để kể lại việc đã xảy ra theo trình tự",
      "type": "SPEAKING_DEMO",
      "lessonCodes": [
        "CB05-L3"
      ],
      "slot": "CB05-L3; L3/worked example",
      "outline": "Nêu mục đích → xem một mẫu khác task kiểm tra → giáo viên giải thích lựa chọn/nghĩa → chỉ lỗi thường gặp → chuyển sang bài mới",
      "exercises": "kể lại việc đã xảy ra theo trình tự với dữ kiện mới; map activity/evidence L3 sau authoring, không lấy đáp án video làm attempt",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Tài liệu bổ trợ cho kỹ năng/chủ đề tương đương khi mục tiêu và quyền phù hợp; thêm binding, không tự thêm completion"
    },
    {
      "code": "VP-CB06-G",
      "purpose": "did questions; chỉ đường/giới từ; Giải thích cách dùng để tìm và trao đổi thông tin đi lại cần thiết",
      "type": "GRAMMAR_EXPLAINER",
      "lessonCodes": [
        "CB06-L1",
        "CB06-L3"
      ],
      "slot": "CB06-L1, CB06-L3; L1/theory; L3/optional review",
      "outline": "Tình huống Đi lại → nghĩa/cách dùng did questions; chỉ đường/giới từ → mẫu/đối chiếu sai thường gặp → áp vào dữ kiện mới",
      "exercises": "Nhận nghĩa/mẫu trong sơ đồ/thông báo đi lại → viết chỉ dẫn/tin nhắn đi lại; liên kết E-CB06-L1-R/W",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "L1 và L3 cùng Unit, chỉ khi binding được duyệt; không dùng như video chữa đáp án checkpoint"
    },
    {
      "code": "VP-CB06-X",
      "purpose": "nghe chỉ đường và hỏi xác nhận; Làm rõ chiến lược để nghe chỉ đường và thông tin chuyến đi",
      "type": "LISTENING_STRATEGY",
      "lessonCodes": [
        "CB06-L3"
      ],
      "slot": "CB06-L3; L3/worked example",
      "outline": "Nêu mục đích → xem một mẫu khác task kiểm tra → giáo viên giải thích lựa chọn/nghĩa → chỉ lỗi thường gặp → chuyển sang bài mới",
      "exercises": "nghe chỉ đường và thông tin chuyến đi với dữ kiện mới; map activity/evidence L3 sau authoring, không lấy đáp án video làm attempt",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Tài liệu bổ trợ cho kỹ năng/chủ đề tương đương khi mục tiêu và quyền phù hợp; thêm binding, không tự thêm completion"
    },
    {
      "code": "VP-CB07-G",
      "purpose": "going to; will quen thuộc; Giải thích cách dùng để thống nhất một kế hoạch quen thuộc",
      "type": "GRAMMAR_EXPLAINER",
      "lessonCodes": [
        "CB07-L1",
        "CB07-L3"
      ],
      "slot": "CB07-L1, CB07-L3; L1/theory; L3/optional review",
      "outline": "Tình huống Kế hoạch → nghĩa/cách dùng going to; will quen thuộc → mẫu/đối chiếu sai thường gặp → áp vào dữ kiện mới",
      "exercises": "Nhận nghĩa/mẫu trong lịch hẹn và kế hoạch → viết lời hẹn/xác nhận thay đổi; liên kết E-CB07-L1-R/W",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "L1 và L3 cùng Unit, chỉ khi binding được duyệt; không dùng như video chữa đáp án checkpoint"
    },
    {
      "code": "VP-CB07-X",
      "purpose": "biến kế hoạch thành tin nhắn có thời gian/địa điểm; Làm rõ chiến lược để viết lời hẹn/xác nhận thay đổi",
      "type": "WRITING_WORKED_EXAMPLE",
      "lessonCodes": [
        "CB07-L3"
      ],
      "slot": "CB07-L3; L3/worked example",
      "outline": "Nêu mục đích → xem một mẫu khác task kiểm tra → giáo viên giải thích lựa chọn/nghĩa → chỉ lỗi thường gặp → chuyển sang bài mới",
      "exercises": "viết lời hẹn/xác nhận thay đổi với dữ kiện mới; map activity/evidence L3 sau authoring, không lấy đáp án video làm attempt",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Tài liệu bổ trợ cho kỹ năng/chủ đề tương đương khi mục tiêu và quyền phù hợp; thêm binding, không tự thêm completion"
    },
    {
      "code": "VP-CB08-G",
      "purpose": "Comparative/superlative, because; Giải thích cách dùng để chọn và giải thích phương án theo nhu cầu",
      "type": "GRAMMAR_EXPLAINER",
      "lessonCodes": [
        "CB08-L1",
        "CB08-L3"
      ],
      "slot": "CB08-L1, CB08-L3; L1/theory; L3/optional review",
      "outline": "Tình huống So sánh/lựa chọn → nghĩa/cách dùng Comparative/superlative, because → mẫu/đối chiếu sai thường gặp → áp vào dữ kiện mới",
      "exercises": "Nhận nghĩa/mẫu trong bảng so sánh dịch vụ/đồ vật → viết đề xuất có lý do; liên kết E-CB08-L1-R/W",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "L1 và L3 cùng Unit, chỉ khi binding được duyệt; không dùng như video chữa đáp án checkpoint"
    },
    {
      "code": "VP-P-CONTRAST",
      "purpose": "Trọng âm đối chiếu; nhấn rõ tiêu chí/lý do lựa chọn",
      "type": "PRONUNCIATION_DEMO",
      "lessonCodes": [
        "CB08-L2"
      ],
      "slot": "CB08-L2; L2/pronunciation support",
      "outline": "Nghe mẫu trong từ thật → quan sát khẩu hình/nhịp → đối chiếu giáo viên chọn → chậm/tự nhiên → tự nói câu khác",
      "exercises": "Nghe phân biệt → shadow → tự nói; exercise phải là Activity của Lesson được liên kết, không chấm qua video",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Dùng cùng nội dung ở nhiều Lesson phù hợp; không nhân thành nhiều resource/production khi chỉ thêm binding"
    },
    {
      "code": "VP-CB08-X",
      "purpose": "đọc tiêu chí và dẫn chứng khi so sánh; Làm rõ chiến lược để đọc bảng so sánh dịch vụ/đồ vật",
      "type": "READING_WALKTHROUGH",
      "lessonCodes": [
        "CB08-L3"
      ],
      "slot": "CB08-L3; L3/worked example",
      "outline": "Nêu mục đích → xem một mẫu khác task kiểm tra → giáo viên giải thích lựa chọn/nghĩa → chỉ lỗi thường gặp → chuyển sang bài mới",
      "exercises": "đọc bảng so sánh dịch vụ/đồ vật với dữ kiện mới; map activity/evidence L3 sau authoring, không lấy đáp án video làm attempt",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Tài liệu bổ trợ cho kỹ năng/chủ đề tương đương khi mục tiêu và quyền phù hợp; thêm binding, không tự thêm completion"
    },
    {
      "code": "VP-CB09-G",
      "purpose": "should, imperative, lý do; Giải thích cách dùng để trao đổi vấn đề sinh hoạt bằng ngôn ngữ thông thường",
      "type": "GRAMMAR_EXPLAINER",
      "lessonCodes": [
        "CB09-L1",
        "CB09-L3"
      ],
      "slot": "CB09-L1, CB09-L3; L1/theory; L3/optional review",
      "outline": "Tình huống Sức khỏe/lời khuyên → nghĩa/cách dùng should, imperative, lý do → mẫu/đối chiếu sai thường gặp → áp vào dữ kiện mới",
      "exercises": "Nhận nghĩa/mẫu trong hướng dẫn sinh hoạt/lời khuyên thông thường → viết lời nhắn hỗ trợ ngắn; liên kết E-CB09-L1-R/W",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "L1 và L3 cùng Unit, chỉ khi binding được duyệt; không dùng như video chữa đáp án checkpoint"
    },
    {
      "code": "VP-CB09-X",
      "purpose": "hiểu từ chỉ vấn đề và lời khuyên trong tình huống; Làm rõ chiến lược để dùng should, rest, problem, advice, feel trong tình huống Sức khỏe/lời khuyên",
      "type": "VOCABULARY_CONTEXT",
      "lessonCodes": [
        "CB09-L3"
      ],
      "slot": "CB09-L3; L3/worked example",
      "outline": "Nêu mục đích → xem một mẫu khác task kiểm tra → giáo viên giải thích lựa chọn/nghĩa → chỉ lỗi thường gặp → chuyển sang bài mới",
      "exercises": "dùng should, rest, problem, advice, feel trong tình huống Sức khỏe/lời khuyên với dữ kiện mới; map activity/evidence L3 sau authoring, không lấy đáp án video làm attempt",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Tài liệu bổ trợ cho kỹ năng/chủ đề tương đương khi mục tiêu và quyền phù hợp; thêm binding, không tự thêm completion"
    },
    {
      "code": "VP-CB10-G",
      "purpose": "Past simple, từ nối trình tự; Giải thích cách dùng để kể trải nghiệm ngắn mạch lạc và giữ nghĩa",
      "type": "GRAMMAR_EXPLAINER",
      "lessonCodes": [
        "CB10-L1",
        "CB10-L3"
      ],
      "slot": "CB10-L1, CB10-L3; L1/theory; L3/optional review",
      "outline": "Tình huống Trải nghiệm → nghĩa/cách dùng Past simple, từ nối trình tự → mẫu/đối chiếu sai thường gặp → áp vào dữ kiện mới",
      "exercises": "Nhận nghĩa/mẫu trong câu chuyện trải nghiệm quen thuộc → viết trải nghiệm có trình tự; liên kết E-CB10-L1-R/W",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "L1 và L3 cùng Unit, chỉ khi binding được duyệt; không dùng như video chữa đáp án checkpoint"
    },
    {
      "code": "VP-P-NARRATIVE",
      "purpose": "Nhịp kể chuyện và trình tự; kể việc có mạch rõ",
      "type": "PRONUNCIATION_DEMO",
      "lessonCodes": [
        "CB10-L2"
      ],
      "slot": "CB10-L2; L2/pronunciation support",
      "outline": "Nghe mẫu trong từ thật → quan sát khẩu hình/nhịp → đối chiếu giáo viên chọn → chậm/tự nhiên → tự nói câu khác",
      "exercises": "Nghe phân biệt → shadow → tự nói; exercise phải là Activity của Lesson được liên kết, không chấm qua video",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Dùng cùng nội dung ở nhiều Lesson phù hợp; không nhân thành nhiều resource/production khi chỉ thêm binding"
    },
    {
      "code": "VP-CB10-X",
      "purpose": "kể chuyện và tự sửa khi thiếu rõ ràng; Làm rõ chiến lược để kể trải nghiệm và trả lời câu hỏi làm rõ",
      "type": "SPEAKING_DEMO",
      "lessonCodes": [
        "CB10-L3"
      ],
      "slot": "CB10-L3; L3/worked example",
      "outline": "Nêu mục đích → xem một mẫu khác task kiểm tra → giáo viên giải thích lựa chọn/nghĩa → chỉ lỗi thường gặp → chuyển sang bài mới",
      "exercises": "kể trải nghiệm và trả lời câu hỏi làm rõ với dữ kiện mới; map activity/evidence L3 sau authoring, không lấy đáp án video làm attempt",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Tài liệu bổ trợ cho kỹ năng/chủ đề tương đương khi mục tiêu và quyền phù hợp; thêm binding, không tự thêm completion"
    },
    {
      "code": "VP-CB11-G",
      "purpose": "Requests, clarification, first/then/because; Giải thích cách dùng để xử lý hiểu nhầm bằng hỏi lại/xác nhận",
      "type": "GRAMMAR_EXPLAINER",
      "lessonCodes": [
        "CB11-L1",
        "CB11-L3"
      ],
      "slot": "CB11-L1, CB11-L3; L1/theory; L3/optional review",
      "outline": "Tình huống Xử lý việc thường lệ → nghĩa/cách dùng Requests, clarification, first/then/because → mẫu/đối chiếu sai thường gặp → áp vào dữ kiện mới",
      "exercises": "Nhận nghĩa/mẫu trong email/tin nhắn xử lý việc thường lệ → viết phản hồi xử lý việc đơn giản; liên kết E-CB11-L1-R/W",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "L1 và L3 cùng Unit, chỉ khi binding được duyệt; không dùng như video chữa đáp án checkpoint"
    },
    {
      "code": "VP-P-CLARIFICATION",
      "purpose": "Hỏi lại và làm rõ; nói rõ chỗ chưa hiểu và xác nhận lại",
      "type": "PRONUNCIATION_DEMO",
      "lessonCodes": [
        "CB11-L2"
      ],
      "slot": "CB11-L2; L2/pronunciation support",
      "outline": "Nghe mẫu trong từ thật → quan sát khẩu hình/nhịp → đối chiếu giáo viên chọn → chậm/tự nhiên → tự nói câu khác",
      "exercises": "Nghe phân biệt → shadow → tự nói; exercise phải là Activity của Lesson được liên kết, không chấm qua video",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Dùng cùng nội dung ở nhiều Lesson phù hợp; không nhân thành nhiều resource/production khi chỉ thêm binding"
    },
    {
      "code": "VP-CB11-X",
      "purpose": "nhận ra điểm chưa hiểu và yêu cầu làm rõ; Làm rõ chiến lược để nghe sự cố và thông tin cần hỏi lại",
      "type": "LISTENING_STRATEGY",
      "lessonCodes": [
        "CB11-L3"
      ],
      "slot": "CB11-L3; L3/worked example",
      "outline": "Nêu mục đích → xem một mẫu khác task kiểm tra → giáo viên giải thích lựa chọn/nghĩa → chỉ lỗi thường gặp → chuyển sang bài mới",
      "exercises": "nghe sự cố và thông tin cần hỏi lại với dữ kiện mới; map activity/evidence L3 sau authoring, không lấy đáp án video làm attempt",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Tài liệu bổ trợ cho kỹ năng/chủ đề tương đương khi mục tiêu và quyền phù hợp; thêm binding, không tự thêm completion"
    },
    {
      "code": "VP-CB12-G",
      "purpose": "Tổng hợp cấu trúc đã học; Giải thích cách dùng để hoàn thành một nhiệm vụ tích hợp bằng kiến thức đã học",
      "type": "GRAMMAR_EXPLAINER",
      "lessonCodes": [
        "CB12-L1",
        "CB12-L3"
      ],
      "slot": "CB12-L1, CB12-L3; L1/theory; L3/optional review",
      "outline": "Tình huống Dự án/chuyển tiếp → nghĩa/cách dùng Tổng hợp cấu trúc đã học → mẫu/đối chiếu sai thường gặp → áp vào dữ kiện mới",
      "exercises": "Nhận nghĩa/mẫu trong brief và email tổng hợp trong capstone → viết thông điệp tổng hợp có mục đích; liên kết E-CB12-L1-R/W",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "L1 và L3 cùng Unit, chỉ khi binding được duyệt; không dùng như video chữa đáp án checkpoint"
    },
    {
      "code": "VP-P-SELF-REPAIR",
      "purpose": "Độ rõ và tự sửa trong trình bày; tự sửa để giữ nghĩa khi làm capstone",
      "type": "PRONUNCIATION_DEMO",
      "lessonCodes": [
        "CB12-L2"
      ],
      "slot": "CB12-L2; L2/pronunciation support",
      "outline": "Nghe mẫu trong từ thật → quan sát khẩu hình/nhịp → đối chiếu giáo viên chọn → chậm/tự nhiên → tự nói câu khác",
      "exercises": "Nghe phân biệt → shadow → tự nói; exercise phải là Activity của Lesson được liên kết, không chấm qua video",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Dùng cùng nội dung ở nhiều Lesson phù hợp; không nhân thành nhiều resource/production khi chỉ thêm binding"
    },
    {
      "code": "VP-CB12-X",
      "purpose": "lập ý và rà thông điệp capstone; Làm rõ chiến lược để viết thông điệp tổng hợp có mục đích",
      "type": "WRITING_WORKED_EXAMPLE",
      "lessonCodes": [
        "CB12-L3"
      ],
      "slot": "CB12-L3; L3/worked example",
      "outline": "Nêu mục đích → xem một mẫu khác task kiểm tra → giáo viên giải thích lựa chọn/nghĩa → chỉ lỗi thường gặp → chuyển sang bài mới",
      "exercises": "viết thông điệp tổng hợp có mục đích với dữ kiện mới; map activity/evidence L3 sau authoring, không lấy đáp án video làm attempt",
      "languageAndCaption": "VI hướng dẫn + EN mẫu; Captions/transcript planned; bản dịch EN optional",
      "production": "NOT_STARTED",
      "priority": "LATER_CANDIDATE",
      "reuse": "Tài liệu bổ trợ cho kỹ năng/chủ đề tương đương khi mục tiêu và quyền phù hợp; thêm binding, không tự thêm completion"
    }
  ]
};
