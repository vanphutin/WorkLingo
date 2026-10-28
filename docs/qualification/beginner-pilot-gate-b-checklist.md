# Gate B — checklist và biểu mẫu giáo viên

**PREAPPROVAL · chưa review · không có chữ ký.** Dùng cho8 Lesson international-v2,64 Activities,32 single-skill objectives,41 lexical/IPA blocks và24 audio đã Gate A verified. [Hồ sơ từng mục](beginner-pilot-pedagogy-review.json), [source/audio snapshot](../../mandate/reports/2026-10-28-beginner-gate-b-source-audio-snapshot.json), [phiếu yêu cầu sửa](beginner-pilot-correction-requests.md). Tất cả verdict/reviewer/date trong mẫu là null, không phải PASS.

## Reviewer và bằng chứng

Chủ sản phẩm bổ nhiệm người thật có chuyên môn dạy tiếng Anh cho người lớn Việt Nam mất gốc; có năng lực kiểm tra phát âm/IPA AmE hoặc chỉ định chuyên gia bổ trợ thật. Cung cấp mã reviewer ổn định, tóm tắt vai trò/chuyên môn/kinh nghiệm, xác nhận bổ nhiệm và đồng ý ghi nhận kết luận. Chủ sản phẩm giữ danh tính, bằng chứng chuyên môn và bản ký gốc; repository chỉ lưu mã cùng tham chiếu do chủ sản phẩm xác nhận. Không đưa bằng cấp, địa chỉ/email, chữ ký ảnh hoặc nội dung riêng tư vào Git. Người chủ có thể review nếu thực sự đủ chuyên môn và được ghi nhận đúng vai trò; không suy ra chuyên môn từ việc đã nghe Gate A.

Mỗi quyết định gắn reviewedBundleSha256 + raw source SHA + rubric code/text SHA + ba selected audio SHA/script/request/take của Lesson. Ngày review do reviewer cung cấp; không bịa thời điểm hay chữ ký. AI chỉ có thể ghi cờ hỗ trợ hoặc ghi lại lời giáo viên có nguồn, không ký và không chọn verdict thay người thật.

## Checklist bắt buộc cho từng Lesson

| Mã | Giáo viên xác minh | Bằng chứng cần ghi |
| --- | --- | --- |
| K1 | Tách grammar/phonology/vocabulary khỏi can-do; bốn mục tiêu quan sát được, phù hợp Pre-A1 và prerequisites | Nhận xét từng objective và activity evidence; không suy ra CEFR/mastery |
| K2 | Grammar và ví dụ: I/you+be/from, dạng rút gọn; a/an theo âm, this/that theo điểm nhìn, số lượng/số nhiều | Nguồn dòng/slug, câu đúng/không đúng và lý do; giữ mạo từ An |
| K3 | Vocabulary/meaning/collocation/grammar pattern;41 blocks, nguồn gốc/đề xuất bổ trợ; không bịa master IDs | Quyết định từng block; chấp nhận/sửa/từ chối eraser, please, numbers, task labels, proper nouns |
| K4 | IPA AmE và lời giải phát âm: âm/tên chữ khác nhau, stress, this/that, âm cuối /n,k,ɡ/ và đuôi /s,z/; không chấm giống native | Từng pronunciation/common_error, tài liệu/chuyên môn đối chiếu, khác biệt biến thể chấp nhận được |
| R1 |24 Reading tasks: một đáp án bảo vệ được, các distractor sai rõ nhưng hợp lý, không mơ hồ/đánh đố | Mỗi key + từng option; source line evidence; lý do chấp nhận/sửa |
| L1 |24 Listening tasks: thật sự cần nghe;24 file đúng script/key/evidence, chữ cái/tên/quantity/near-far rõ, không lộ transcript | Từng selected file hash/take và activity; expert verdict nghe, không kế thừa tự động Gate A |
| S1 |8 Speaking tasks: luyện có hỗ trợ rồi tự trả lời theo thẻ mới; full prompt, role, min_words hợp lý | Từng model/rubric/evidence, phương án trả lời đúng khác kể cả contractions; không ép shadowing hay tốc độ |
| W1 |8 Writing tasks: dữ kiện riêng, đáp án mẫu đúng nhưng không bắt chép, lượng/vai rõ; lỗi nhỏ khác sai nghĩa | Từng model và alternative; min_words không đòi chèn từ vô nghĩa |
| V1 |16 rubric texts resolve đúng hai IDs/v1 và code hash, weights .35/.25/.20/.20; targetLanguage/clarity công bằng | Verdict cho từng rubric; alternative answers và ví dụ lỗi đủ để phân loại, không sửa code qua B |
| D1 | VI explanations/EN tasks, instruction/working-memory load, đủ support cho người mất gốc, tăng dần L1→L4 | Nhận xét từng phase/skill, thuật ngữ task có cần giải thích; không dùng số Activity để chứng minh45 phút |
| P1 | Không mở key/model/rubric/transcript/partial answer trước response; luyện khác facts kiểm tra | Review dữ liệu dự kiến chiếu learner và toàn bộ phase; test kỹ thuật chỉ là hỗ trợ |
| U1 | MG01→MG02 prerequisites, transfer và unit check; một L4 không thay toàn evidence của unit | Nêu target can-do/prereq/evidence; không tự tạo completion/enrollment/mastery |
| X1 | Video tùy chọn; pronunciation demo/clarification outline dùng knowledge/practice facts có sẵn | Giáo viên chốt outline≤60 giây/Lesson + wording/hash; chỉ là kế hoạch, không tạo/ghi media hay chạy C |

Đánh giá đủ64 Activities,32 objectives và41 lexical blocks trong JSON; không chỉ tick13 dòng tổng. Cả24 real audio phải được giáo viên đối chiếu dù Gate A đã có sound QA. Trong template, từng activity có key/options/source evidence hoặc sample/rubric để giáo viên xét; các trường này là hồ sơ reviewer, không phải learner DTO/API.

## Focus theo Lesson (chưa phải finding)

| Lesson | Nội dung cần ưu tiên xét | Blocker hiện tại |
| --- | --- | --- |
| MG01-L1 | I/you, lời chào và nơi đến; Lily/Jack/Noah, New York/London; thẻ nói/viết độc lập; câu hướng dẫn chung còn nhắc tên Việt có phù hợp không | Chưa bổ nhiệm reviewer;8 tasks/4 objectives/IPA/audio chưa có teacher verdict; outline chưa chốt |
| MG01-L2 | Jo/J-O/Joe và Ed/E-D; Emma stress/tên chữ; name/from và yêu cầu đánh vần; câu hướng dẫn tên Việt có gây tải không | Như trên; cần expert đối chiếu Ed và letters trực tiếp audio |
| MG01-L3 | Người nói/người nhận, giữ facts khi đổi thẻ, giảm support, các câu đúng khác | Như trên |
| MG01-L4 | Unit transfer, thẻ mới, vai I/you; không suy mastery chỉ từ L4 | Như trên |
| MG02-L1 | Mạo từ An, eraser support chưa duyệt, this/that/near-far và số lượng | Như trên; support lexicon/IPA phải được adjudicate |
| MG02-L2 | Singular/plural, final consonants, /s,z/, quantity/please và min_words | Như trên |
| MG02-L3 | Whole-list quantities, near/far thực sự được assess, response khác model | Như trên |
| MG02-L4 | Transfer và phân biệt chỉ vật/yêu cầu; giới hạn pilot so với stage/CEFR | Như trên |

Các cờ AI là câu hỏi để giáo viên xét, không phải verdict REVISE hay lỗi đã được chuyên gia xác nhận. Không sửa nguồn chỉ vì AI nêu cờ.

## Biểu mẫu kết luận PASS / REVISE / REJECT

```json
{
  "lessonCode": null,
  "reviewedBundleSha256": null,
  "sourceSha256": null,
  "rubricCodeSha256": null,
  "selectedAudioHashes": [],
  "reviewerId": null,
  "reviewedAt": null,
  "evidenceReference": null,
  "verdict": null,
  "reason": null,
  "correctionIds": [],
  "supersedesReviewId": null
}
```

- **PASS:** giáo viên đủ chuyên môn, có bổ nhiệm/bằng chứng thật, đã xét đủ từng mục/skill/audio của đúng bundle; không còn correction/blocker; support/demonstration đã chốt. Tám PASS mới đủ xét Gate B verified.
- **REVISE:** nêu chính xác path/dòng/slug/hash, lý do và replacement/diff đề xuất. Affected Lesson chưa PASS; không tự sửa TXT/audio/rubric hoặc gọi Azure. Cần amendment và approval riêng, sau đó review/hash mới.
- **REJECT:** không phù hợp hoặc sai nghiêm trọng cần thiết kế lại; nêu lý do và phạm vi. Không xóa lịch sử/ký cũ hay mở C để bù.
- **null / NOT_REVIEWED:** chưa có quyết định. Text-only/AUDIO_PENDING không được nâng thành final PASS; Gate A hiện đã có đủ audio nên final B phải xét cả nguồn và audio.

Quyết định bị rút/thay phải có record mới với actual reason/date/reference và supersedes; không ghi đè người ký hoặc giả một chữ ký. Reviewer cần sửa sau khi ký phải nhận bundle mới, không tự kế thừa PASS.

## Tác động khi phát hiện cần sửa

Không có quyền sửa source/audio trong B. Đổi bất kỳ byte của Lesson làm source SHA đổi và bundle B cũ không còn áp dụng. Audio vẫn có thể giữ nguyên bytes nếu script không đổi, nhưng binding của source mới cần scope/re-qualification rõ ràng; không tự rebind. Script/name/pronunciation/answer-evidence đổi có thể cần take mới và renewed A sound QA; không gọi lại Azure hay tăng hạn mức qua B. Rubric code cần engineering scope riêng. A verified giữ giá trị lịch sử trên đúng hashes cũ; không tự sửa lifecycle hay xóa bằng chứng. C/timing của phiên bản chịu ảnh hưởng không được dùng cho bản mới.
