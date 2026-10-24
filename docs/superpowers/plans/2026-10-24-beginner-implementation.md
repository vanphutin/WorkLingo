# WorkLingo Beginner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây một pilot MG01 → MG02 có nội dung thật, evidence bốn kỹ năng, lịch sử bất biến và học liệu bổ trợ có thể bổ sung an toàn.

**Architecture:** Tái sử dụng LearningProgram → LearningPath → Level → Mission → MissionLesson/LessonVersion và CurriculumRevision. Beginner có manifest enrollment và resolver riêng; SupplementaryRelease độc lập với nội dung đánh giá, pin khi tạo session. Giữ nguyên đường xử lý Intermediate/IELTS/legacy khi không thuộc Beginner.

**Tech Stack:** Node 20, pnpm 10.34.1, NestJS 11, Prisma 6/PostgreSQL, Zod, Next.js/React, Vitest/Playwright; dùng phiên bản lockfile hiện tại.

**Spec:** [refinement](../specs/2026-10-24-beginner-final-refinement.md), [Knowledge Map](../specs/2026-10-24-beginner-knowledge-map.md), [video plan](../specs/2026-10-24-beginner-video-production-plan.md), [thiết kế gốc](../specs/2026-10-24-beginner-curriculum-resources-design.md). Mandate [MND-20261024-001](../../../mandate/items/MND-20261024-001-feature-enable-beginner-admin-authoring-and-learner-enrollment-for-foundation.md); backlog duy nhất [IMPLEMENTATION_ROADMAP](../../IMPLEMENTATION_ROADMAP.md).

## Global Constraints

- **DRAFT FOR APPROVAL · 2026-10-24 · review delta sau 6113427.** Chỉ chuẩn bị/review tài liệu; mọi checkbox là việc tương lai, chưa chạy.
- Đồng ý định hướng của chủ sản phẩm: một Beginner/two Paths, năm Stage, Unit=Mission, khung 20 Unit/80 Lesson, pilot MG01→MG02, video tùy chọn có alternative đủ dùng. Đây không phải approval thực thi mandate.
- Không code, migrate, seed, publish, gọi AI, sản xuất video hay mở learner trong tác vụ lập plan. Mandate giữ captured/approval=null.
- Không tự chuyển Foundation legacy; không dùng generator Intermediate B1/B2 cho Beginner; không sửa phiên bản Intermediate/IELTS hay lịch sử PR18.
- Learning Lesson đủ R/L/S/W; Supplementary Resource không tạo completion/mastery. Không dùng playback làm evidence; không tạo planned resource trong DB.
- H là Unit mastery; thứ tự Lesson chỉ recommended. L4-first không miễn L1–L3. Pilot không hoàn tất MG-F0, không chứng nhận CEFR; transitionEnabled=false.
- Approval code, migration rehearsal, nhập nội dung thật, controlled cohort, publication và public release là các quyền riêng. Không suy ra quyền production từ plan.
- Các lựa chọn kỹ thuật mới dưới đây là **Codex đề xuất**, chưa được người dùng duyệt. Khi khác refinement cũ, chỉ thay thế sau approval rõ phạm vi; không tự sửa nghĩa approval cũ.

## Review Focus

1. Hai tab start/admit/retry với target khác nhau: đúng một kết quả hoặc 409, không trả session sai Lesson (R2.1/R2.2).
2. Cùng Lesson ID nhưng published pointer/revision mới: superseded Beginner version còn hợp lệ không bị auto-archive; learner cũ start/resume/evaluate/supplement theo manifest, đủ L1–L4 (R1.2a/R2.2/R4.1).
3. Video/caption đổi giữa session, kể cả từ không có video sang có: session giữ bản hoặc NONE; progress không đổi (R4.1).
4. Đoán media/track ID, HEAD/Range hoặc session người khác: không lộ byte/metadata, revoke có hiệu lực ngay (R3.2/R4.2).
5. Upload xong nhưng transaction lỗi, hoặc deploy rollback sau có learner: không binding/file giả, không drop history hay xóa attempt (R3.1 và release gate).

---

## 1. Delta đã xác minh và blocker

Baseline source của worktree: f8dacc6, branch codex/foundation-basic-readiness; main đã chứa PR18 tại 752c19c. Không đọc/đo lại DB trong vòng này. Các references bên dưới là code đã đọc, không phải tính năng đã triển khai.

| Evidence hiện tại | Hệ quả với plan |
| --- | --- |
| `apps/api/src/curriculum/application/curriculum.service.ts`, getPublishedMissionForRevision: order + take:1 | Resolver hiện chỉ chọn Lesson đầu của revision; phải có chọn Lesson chính xác trong Unit nhiều Lesson. |
| `content-publisher.service.ts:600–605` tự ARCHIVED bản current cũ; `curriculum-eligibility.service.ts:38–60` chọn revision mới nhất và từ chối bound version không PUBLISHED | Pin ID đơn thuần chưa đủ: R1.2a cần supersession policy riêng Beginner, R2.2 eligibility theo exact pinned revision, R4.1 supplemental lookup theo exact base, không latest. Không đổi archival semantics của Intermediate/IELTS. |
| `packages/contracts/src/learning-session.contracts.ts`: 45 = readDecode/listenReason/respond, mỗi block 15 phút; `session-planner.ts` chỉ chọn 1 R, 1 L, tối đa cặp S/W | Không gắn Activate vào session 45; không dùng count check làm bằng chứng đủ 45 phút. Cần Beginner planner chọn toàn bộ assessed inventory. |
| `packages/content-format/src/normalizer.ts`: mỗi comprehension Activity thành một question; speaking chỉ shadowing, minWords suy từ mẫu và tối thiểu 4; writing minWords=4 | Chỉ sửa nhãn/đổ template không tạo 8 bài có giao tiếp độc lập. Đề xuất additive format 1.2 cho response/minWords rõ ràng, giữ nguyên 1.0/1.1. |
| `foundation-metadata.ts` và `foundation-rubrics.ts`: speaking response shadowing, rubric shadowing/workplace-writing | MG01/MG02 L3/L4 cần nói nội dung mới; phải thêm guided_response và rubric Beginner được duyệt/hiệu chuẩn. Shadowing vẫn là luyện tập có hỗ trợ, không thay evidence nói độc lập. |
| `curriculum-progress.service.ts`: completion theo revision + session completed + evaluated evidence; `objective-evidence-policy.ts` xét mọi skill trên từng mapping | Mỗi Lesson dùng 4 objective kỹ năng riêng, mỗi objective mapping đúng skill; không gộp 4 skill vào một objective khiến mapping đơn kỹ năng bất khả thi. |
| Foundation mutation có receipt/hash, lock Program→Path→Level→Mission và audit cùng transaction; publisher khóa/recheck sourceHash trong transaction | Reuse, không thay bằng read-check-write ngoài transaction. Auth role không thay kiểm tra program ownership. |
| ProgramContext activate cần enrollment sẵn; onboarding initializeIntermediate cố định; ObjectStorage hiện put/read Buffer | Entry Beginner phải tách; media cần stream/range port mới, không thay audio adapter bằng cách đọc nguyên video vào RAM. |

**Blocker trước learner pilot:** chưa có 8 source hoàn chỉnh/audio thật, người duyệt nội dung/rubric và timed rehearsal; chưa có quyền migration/cohort/publish. Có thể lập plan, nhưng không kết luận 8 bài CONTENT_READY hoặc đúng thời lượng bằng code inspection.

## 2. Chính sách cập nhật và giữ lịch sử — đề xuất cần duyệt

### 2.1 Hai loại phát hành

| Thay đổi | Phát hành / approval | Học viên đang học |
| --- | --- | --- |
| Thêm/thay video giải thích, tài liệu minh họa, caption/transcript bổ trợ cùng mục tiêu; không đổi assessed input/prompt/answer/rubric/evidence/prerequisite | ResourceVersion mới nếu đổi bytes/transcript/caption; SupplementaryRelease mới, reviewer xác nhận compatible với exact base LessonVersion | Ngoài session thấy bản compatible mới đã duyệt cho base của mình; session mới pin bản mới. Session đang dở giữ pin cũ/NONE. Không đổi enrollment manifest/progress. |
| Sửa display label trong thư viện Admin, không thuộc learner material | Metadata audit; không thay file/version đang pin | Không ảnh hưởng assessment hay progress. |
| Đổi nội dung đọc/nghe dùng chấm, câu hỏi/đáp án, instructions đánh giá, objective, từ mục tiêu được chấm, rubric/threshold/minWords/mode, evidence matrix hoặc H | LessonVersion mới + CurriculumRevision mới + curriculum release/manifest mới; content/assessment approval mới | Mặc định chỉ cohort mới. Không tự nâng enrollment cũ, không map completion cũ sang mới. Công cụ chuyển cohort/equivalence ngoài R1–R4. |
| Typo trong câu hỏi/audio/rubric, hoặc video bổ trợ tiết lộ đáp án chính xác của bài check | Không tự coi compatible vì gọi là typo/video; dùng assessment-change route hoặc từ chối publish bổ trợ | Bản đang học giữ nguyên trừ operational revoke; không tự chấm lại lịch sử. |
| Archive / operational revoke | Archive chặn dùng ở release mới nhưng giữ quyền pin lịch sử; revoke có reason/actor/audit và chặn stream ngay | Revoke thắng pin: UI báo unavailable + alternative, giữ evidence/history; không silently dùng version khác. Nếu alternative chính cũng sai/thiếu, dừng session mới của Lesson, không cấp pass. |

Compatible không có nghĩa bỏ review: máy so sánh base hash + whitelist, reviewer chịu trách nhiệm ngữ nghĩa/phù hợp trình độ/không lộ đáp án. Không có auto-publish hoặc AI tự approve. Nếu chưa chứng minh tương thích, từ chối đường compatible.

### 2.2 Tách supplementary release khỏi assessed version

Refinement cũ yêu cầu cả việc thêm video cũng tạo LessonVersion/CurriculumRevision mới. **Đề xuất thay giới hạn đó bằng release bổ trợ độc lập**, để learner hiện tại nhận được video mà không migrate progress.

- `LessonSupplementaryRelease`: id, exact baseLessonVersionId, sequence, state DRAFT/APPROVED/ARCHIVED/REVOKED, baseAssessmentHash, manifestHash, reviewer/time, revision token. Manifest chứa các binding bất biến; APPROVED có nghĩa có thể phục vụ cho enrollment phù hợp, không phải public.
- `LessonResourceBinding`: releaseId, resourceVersionId, position (`before-practice`/`after-practice`), order. Whole-resource, optional; không có required flag. Release chỉ tham chiếu resource/track đã duyệt có thật.
- Session pin thêm nullable `LearningSession.supplementaryReleaseId` FK Restrict. Null = **NONE**, kể cả session lịch sử trước R4; không fallback latest. Một snapshot release pin toàn bộ caption/transcript/bytes qua ResourceVersion.
- Sessionless GET của Lesson unlocked trả latest APPROVED compatible release cho **base version trong manifest của learner**. Khi bắt đầu session, server chọn và pin release trong transaction; không nhận resource ID tùy ý từ client.
- Session GET/stream dùng pin từ DB, không query latest. Session cũ có thể báo ngoài session rằng có học liệu bổ trợ mới; không chèn vào assessed workflow đang chạy.
- Release rollback = archive bản mới khỏi lựa chọn mới, dùng bản approved trước cho lần mở mới; pin lịch sử không đổi. Revoke là thao tác an toàn riêng, không ngụy trang bằng rollback.
- Thêm entity release là **khái niệm thứ năm**, ngoài bốn resource concepts của refinement. Không thêm bảng watch-event, completion video, adoption/equivalence hay analytics.

**Bất biến nghiệm thu:** trước/sau supplementary update, so sánh ID/hash và số dòng của enrollment/currentLevel, attempts/evaluation, mastery/event, CurriculumCompletion, planSnapshot/lessonVersionId/curriculumRevisionId của session đã có: bằng nhau. Chỉ session được tạo sau release mới có pin mới. Không chỉ so tổng số dòng.

## 3. Feasibility review 8 bài — không phải nội dung đã hoàn thành

Mục tiêu dưới đây là thiết kế biên soạn cụ thể. Từ ví dụ phải đối chiếu sense được duyệt; tên/countries là dữ kiện giáo viên cung cấp, không bịa lexical occurrence trong kho. H của mọi MG02 là mastery MG01; R là L1→L2→L3→L4, không hard gate trong Unit.

| Lesson | R / L: material và tác vụ cần biên soạn | S / W: evidence cần biên soạn | Chỗ dễ quá tải / thiếu thực chất |
| --- | --- | --- | --- |
| MG01-L1 | Hai thẻ tên ngắn; hội thoại chào-hỏi tên; 3 câu đọc + 3 câu nghe tìm thông tin | Tự chào/nói tên theo khung, ghi âm 2 câu; viết thẻ giới thiệu 2 câu | Chỉ I/you + be và tên; `from` giới thiệu có mẫu, không mở rộng ngữ pháp quốc tịch. |
| MG01-L2 | Thẻ tên có 2–3 tương phản chữ/âm giáo viên chọn; clip đọc tên/đánh vần; nhận diện tên và thông tin | Luyện shadowing không tính independent pass; assessed recording nói/đánh vần tên mình; viết tên và 1–2 câu từ dữ kiện nghe | Không dạy thuộc toàn bộ alphabet/IPA; cần audio/đánh giá chấp nhận tên riêng, không ép accent bản ngữ. |
| MG01-L3 | Thẻ người mới + hội thoại đổi người nhận, 3 thông tin đọc/3 nghe không dùng lại đáp án L1 | Tự giới thiệu có dữ kiện thay đổi, 2–3 câu; viết lời chào/thẻ gửi bạn mới | Không thêm thì/câu hỏi ngoài mẫu; không cho sample-answer copy thành evidence. |
| MG01-L4 | Hai hồ sơ mới, clip mới cùng lexical/grammar scope; không lộ đáp án trước submit | Chào/giới thiệu tự chọn dữ kiện, 2–3 câu; thẻ giới thiệu 2–3 câu độc lập | Check ở cùng scope với thông tin mới; không biến thành stage test/CEFR certificate. |
| MG02-L1 | Nhãn/hình đồ vật có text equivalent và clip yêu cầu đồ dùng; 3 đọc/3 nghe | Chỉ/yêu cầu đồ vật theo khung, 2–3 câu; nhắn tên/số lượng 2 câu | a/an + this/that có hỗ trợ; plural chỉ 1–3 đồ vật quen, chưa thêm these/those. |
| MG02-L2 | Nhãn một/nhiều + minimal contrast âm cuối có nghĩa trong audio; 3 đọc/3 nghe | Luyện đuôi rồi recording phân biệt đồ/số lượng; viết danh sách + 1–2 câu | Không chấm thuộc quy tắc /s z ɪz/ như năng lực tổng quát; rubric nghe rõ số lượng/ý nghĩa. |
| MG02-L3 | Danh sách/bối cảnh bàn học mới, thông tin nghe khác mẫu; 3 đọc/3 nghe | Tìm/nhờ đưa đồ theo task card, 3 câu; lời nhắn 2–3 câu | Lời yêu cầu dùng chunk đã dạy; không ngầm yêu cầu where/there is chưa học. |
| MG02-L4 | Inventory và yêu cầu mới có transfer nhưng không thêm grammar; 3 đọc/3 nghe | Recording chọn đúng đồ/số lượng độc lập; tin nhắn 3 câu | Phân biệt sai đồ/số lượng với lỗi nhỏ; không chấm writing theo tiêu chuẩn workplace B1. |

### 3.1 Hợp đồng pilot đề xuất

- Mỗi Lesson: 3 reading Activities + 3 listening Activities + 1 guided_response speaking + 1 writing, **8 assessed Activities**, đủ 4 skill. Mỗi R/L Activity dùng một câu hỏi như normalizer hiện tại; không giả định parser đã có multi-question authoring.
- Mỗi Lesson có 4 required skill objectives; R/L mỗi objective map cả 3 Activity, S/W map một Activity tương ứng. Một Unit có 16 skill objectives, 32 assessed Activity mappings; chưa chạm limit 50 objective. Các code can-do O-MGxx-Lx của map là mục tiêu tổng hợp, không ép thành một objective đa skill.
- Beginner planner riêng `planBeginnerSession`: chỉ 45 phút, 3 block ×15; chọn **tất cả 8 Activities** đúng thứ tự, không rút bớt theo review priority. Không sửa legacy planFoundationSession. R block gồm 5 phút guidance/theory/examples + 10 phút đọc/luyện; L 15 phút nghe-model/replay/luyện; respond 7 phút nói + 8 phút viết/feedback. Đây là dự toán sư phạm, không là timer bắt chờ hay evidence.
- Không cần Activate block để chèn lý thuyết ở 45. Đề xuất format 1.2 có `INSTRUCTION` (slug, text, phase=readDecode/listenReason/respond, order) riêng, không Activity/answer; snapshot/render luôn có text alternative. Không dùng email/dialogue giả để chứa instructions. Video không cộng thêm thời gian/giảm assessed inventory; người học được bỏ qua video.
- Guided speaking format `response_type: guided_response`, prompt riêng với sampleAnswer, `min_words` explicit positive integer; không bắt nói y chang mẫu. Response source 1.2 khai báo `rubric_id`=beginner-guided-speaking hoặc beginner-short-writing và `rubric_version`=1; snapshot pin `{rubricId,rubricVersion}` trên response payload, evaluator resolve exact approved registry entry, không latest. Ngưỡng kỹ thuật đề xuất giữ policy0.7 hiện tại nhưng phải hiệu chuẩn; không chấm lại attempt cũ nếu thêm rubric2. Độ dài 2–3 câu là scope biên soạn, không tự chuyển thành word count bằng AI. Giáo viên đặt min_words theo task, cho tên riêng/short response hợp lệ.
- Học liệu/luyện tập có hỗ trợ được xem; task check không lộ solution/sampleAnswer trước submit. Không dùng API đáp án của preview Admin trong learner DTO. Pending/failed evaluation không thành mastery.

### 3.2 Gate nội dung và thời lượng

**Kết luận:** khả thi có điều kiện về kiến trúc/nội dung, nhưng format/planner/rubric hiện tại chưa đáp ứng nguyên trạng. **8/8 hiện PLANNED, 0/8 được xác minh CONTENT_READY**, không có timed learner evidence trong tác vụ này.

R1.2b phải giao 8 source authored thật + scripts/audio đã review + 64 assessed Activities + rubric/matrix + reviewer report; R1.1/R1.2a và R2 software tests được phát triển độc lập bằng fixtures cách ly. Với từng Lesson: chạy parser/preview/planner; giáo viên dry-run đủ 4 skill và ghi thời gian từng block; controlled pilot chỉ sau quyền riêng. Mục tiêu đề xuất 35–50 phút active work cho bài 45 phút, không tính chờ mạng/xử lý API/xem video bắt buộc; ngưỡng này cần chủ sản phẩm/chủ biên duyệt. Nếu bài quá ngắn, không thêm replay vô nghĩa; re-author tác vụ có mục đích hoặc trình phương án session ngắn hơn như scope mới. Không âm thầm đổi contract 45 floor. Nếu quá dài, giảm scope/độ khó chứ không bỏ skill/evidence bắt buộc.

Nghiệm thu học liệu phải có reviewer đủ chuyên môn được chỉ định; technical pass không thay sự đánh giá đó. Nếu chưa có asset/reviewer/timing, R1.2b giữ NOT_READY và R2 learner gate thật đóng; không chặn nghiệm thu phần mềm R1.1/R1.2a hoặc R2 integration trên fixtures.

## 4. Contracts, schema và an toàn dùng chung

### Interfaces mới dự kiến (chỉ dùng cho Beginner)

- `BeginnerManifestV1`: `{schemaVersion:1, releaseId:string, hash:string, programId:string, pathId:string, stages:{levelId:string, expectedUnitCodes:string[], transitionEnabled:false, units:{missionId:string, curriculumRevisionId:string, lessons:{lessonId:string, lessonVersionId:string, order:number}[]}[]}[]}`; prerequisite revision IDs lấy từ revision immutable đã duyệt, phải nằm trong manifest. Hash = SHA-256 JSON canonical với object keys sorted recursively, giữ array order, bỏ field hash ở root. Published release JSON lưu version control cùng reviewer record và environment envelope theo mục4.1 bên dưới; server chỉ nhận releaseId từ registry đúng môi trường đã duyệt, không nhận manifest learner gửi.
- R2 schema: nullable `LearnerProgramEnrollment.curriculumManifest` JSON; validate schema/hash và FKs/membership trước lưu. Null của enrollment legacy giữ đường legacy; **Beginner null phải fail closed**, không fallback latest. Không bulk backfill.
- `admitF0(learnerId, input:{releaseId, expectedContextRevision:number|null, idempotencyKey}, tx): Promise<ProgramContextDto>`; chỉ cohort allowlist đã duyệt. Onboarding PENDING không gọi initializeIntermediate: tạo/sửa profile theo transaction riêng đã kiểm thử, admission chỉ F0, không giả placement/assessment pass. COMPLETE giữ lịch sử; activate explicit, không tự đổi active program của learner cũ.
- `resolveBeginnerLesson(tx, learnerId, target:{missionId,lessonId}): Promise<{mission:PublishedMission,curriculumRevisionId:string}>`; exact target từ enrollment manifest, kiểm tra same program/path/level + published/readiness + Unit H.
- `planBeginnerSession(input:{mission:PublishedMission,expectedLessonVersionId:string,durationMinutes:45}): SessionPlan`; reject nếu thiếu/duplicate/unmapped assessed Activity, sai 3R/3L/1S/1W; không tăng scope sang review scheduling/90 phút.
- `startBeginnerSession(learnerId,input:{missionId,lessonId,durationMinutes:45,clientSessionId,expectedContextRevision}): Promise<LearningSessionDto>`; R4 tự pin supplementaryReleaseId. Target+duration+context+curriculum version được bind vào idempotency hash; retry đúng trả pin cũ, sai 409.
- `getBeginnerRoadmap(learnerId): Promise<BeginnerRoadmapDto>`: Stage→Unit→Lesson; lesson workflow state tách required evaluated/pass/pending; nextAction discriminated union resume/await-evaluation/practice/start/locked. Giữ `CurriculumRoadmapDto` cũ không đổi.
- R3 `ResourceMediaStorage.putStream({stream,contentType,maxBytes}): Promise<{key,size,sha256}>`, `stat(key)`, `openRange(key,{start,end}?): Readable`; port mới, không breaking ObjectStorage audio cũ.
- R4 `resolveLessonSupplement(learnerId,{lessonId,sessionId?}): Promise<{releaseId:string|null,resources:AuthorizedResourceDto[]}>`. `AuthorizedResourceDto` gồm bindingId, resourceVersionId, kind=video|document, title, mediaPath, transcript và tracks:{trackId,kind=caption|subtitle,language,mediaPath}[]; path là authorized endpoint, không storage key. Nếu có sessionId, base/pin từ owned session và lessonId phải khớp; nếu không, dùng unlocked manifest. DTO không có answer/key/raw filesystem path.

### 4.1 Vòng đời release registry và quyền theo môi trường

Đây là file registry/read model trên schema đã đề xuất, không thêm release table hoặc tự tạo dữ liệu.

| Bước | Artifact / nguồn ID-hash | Quyền và điều kiện |
| --- | --- | --- |
| DRAFT | Editorial codes, source checksum và references dự kiến; không phải executable manifest, không điền UUID giả cho LessonVersion/CurriculumRevision chưa tồn tại | Quyền biên soạn tài liệu/file; không tự có quyền import/seed/publish. |
| TEST_PUBLISHED | Sau khi được phép, gọi import/audio/publish/curriculum commands thật vào DB và storage test đã xác minh cách ly. Export IDs từ transaction receipts/query chính DB đó; sourceHash/validationHash, snapshot hashes, asset hashes và manifest hash lấy từ dữ liệu thật, đối chiếu membership và file tồn tại | R1.2a chỉ fixtures tự sở hữu, isFixture=true; test fixture audio là file test có thật, không phải audio bài học production. R1.2b dùng tám bài thật khi có quyền riêng nhập/test publication. Cấm dùng .env production hoặc production storage. |
| APPROVED_RELEASE (test) | Registry entry bất biến với schemaVersion, environmentId, releaseId, fixtureOnly, contentReadiness, manifest/hash, source/audio/review/timing references và approval reference/hash | Fixtures chỉ FIXTURE_ONLY: technical acceptance, không CONTENT_READY và không cohort thật. Nội dung thật chỉ CONTENT_READY sau R1.2b human gate; approval test không cho production. |
| Production candidate → APPROVED_RELEASE (production) | Chỉ sau approval riêng cho target production: replay đúng source/audio đã duyệt bằng commands có receipt, tạo IDs của target, export và kiểm tra lại hash/membership; giữ test proof gắn source checksums, không chép UUID/manifest test | Quyền production import/publication phải nêu DB/storage đích và rollback; chưa được cấp trong tác vụ này. Nếu chưa có quyền/target data thì chỉ có draft với editorial refs, không có approved production registry giả. Program/admission vẫn đóng đến gate riêng. |

Chuyển state là hành động có audit/reviewer, không phải CI/test PASS tự approve. Registry loader interface: `loadApprovedBeginnerRelease(releaseId, environmentId): BeginnerManifestV1`; environmentId lấy server deployment profile đã kiểm tra, không từ learner. Loader kiểm tra environment, approved scope/hash, manifest hash và DB/storage references; fixtureOnly bị từ chối ngoài isolated test profile. ContentReadiness khác kỹ thuật parse/publish hợp lệ. Synthetic reviewer/approval identities trong fixture phải đánh dấu test-only; không ghi thành giáo viên/chủ sản phẩm đã duyệt nội dung thật.

Test và production có namespace/release IDs/DB identity/storage root riêng; không commit credentials/connection strings. Production entry approval bind exact target manifest/hash + content evidence; thay IDs/source/assets phải tái kiểm chứng và xin approval tương ứng. Thiếu/bất đồng hash/ID → fail closed, không đoán ID hoặc fallback latest.

Khi retire release khỏi admission mới, giữ registry record và immutable references cho enrollment/session cũ; không bắt release cũ còn nằm trong danh sách new-cohort selectable. Rollback candidate/approval = không đưa vào admission hoặc ngừng admission mới, giữ artifacts/audit nếu đã có references. Không xóa enrollment/progress hoặc clone completion giữa môi trường. Xem mục6.1 cho supersession khác withdrawal.

### API/authz

New routes: `POST /beginner/enrollment`, `GET /beginner/roadmap`, `POST /beginner/sessions`; `GET /beginner/lessons/:lessonId/supplement` (sessionId optional); Admin `/admin/beginner/releases` preview/approve và `/admin/learning-resources` CRUD/version/review, `/admin/beginner/lessons/:lessonVersionId/supplements` draft/approve. Media GET/HEAD `/learning-resources/bindings/:bindingId/media` và `/tracks/:trackId` bắt buộc context lesson/session, kiểm tra cùng binding. Không public file URL.

Admin role qua guard hiện có + scope Beginner, draft/published state và ownership; preview không tạo learner state. Không yêu cầu two-person approval mặc định vì chưa có quyền/role contract tương ứng; lưu actor/reviewer, chỉ cho reviewer Admin đã được chỉ định trong controlled scope. Learner dùng userId từ auth, không body; enrollment, manifest membership, Unit H, LessonVersion và pin/revoke kiểm tra server mỗi media/track/HEAD/Range. Từ chối foreign IDs bằng phản hồi không tiết lộ tài nguyên. Không sửa RBAC toàn app chỉ để thêm menu.

### Transaction/migration

- Reuse receipt unique(actor,operation,key), requestHash và audit trong transaction. Curriculum mutation dùng lock order hiện có Program→Path→Level→Mission; lock nhiều row theo ID. Enrollment/start khóa LearnerProfile→enrollment rồi đọc immutable manifest/revision; mutation release không khóa ngược learner. Resource mutation khóa resource→version→release (multi-ID sorted); approve recheck expectedRevision/basehash/asset readiness và commit bindings+audit+receipt atomic.
- Không upload/hash/decode/call AI trong DB transaction. Upload staging/quarantine → validate actual bytes/hash/size → finalize immutable key → DB commit. Commit fail: file orphan quarantine có reconciliation, không binding READY giả; không xóa file đã có reference. Nếu finalize fail, không APPROVED. Verify file tồn tại trước approve; restore cần đối chiếu hash.
- FK Restrict cho resource/version/track/binding/release/session pin; index tất cả referencing FK, unique(resourceId,version), unique(baseLessonVersionId,sequence), unique(releaseId,position,order). Release membership và approved-version status kiểm tra transaction; reject cross-program base.
- Migration M1 (R2): nullable manifest, không rewrite progress/level/status; M2 (R3): resource/version/track tables; M3 (R4): release/binding + nullable session pin. Mỗi migration additive, reviewed SQL, lock/statement timeout và rehearsal empty DB + legacy fixture trước deploy. Không prisma migrate reset/db push trên DB thật. Không migration trên DB production trong scope plan.
- Rollback app về build cũ chỉ sau test tương thích: build cũ không parse guided_response/1.2. Giữ reader mới cho session đã phát sinh; disable admission/new authoring/player là rollback an toàn. Không hứa downgrade binary tùy ý, không DROP tables/columns khi đã có reference.

## 5. Kế hoạch R1 → R2 → R3 → R4

Dependencies: approval R1.1 → core contracts/planner; R1.2a sau R1.1 → Admin/registry/test publication bằng fixtures; R1.2b sau R1.1+R1.2a → nội dung/audio thật và human content gate. R2 software/integration chỉ cần R1.1+R1.2a và quyền fixtures/test migrations tương ứng, không phải chờ R1.2b; R2 cohort thật cần thêm R1.2b CONTENT_READY + approved target registry + cohort/publication permission. R3 độc lập R2 sau approval resource policy; R4 software cần R1.2a+R3, learner test fixtures cần R2, learner acceptance thật cần R1.2b+R2. Không bắt video quay xong mới nghiệm thu text/audio R1/R2. Mỗi task dưới đây theo red→green→review; chỉ execution sau approval. Commit chỉ explicit files trên feature branch, không merge/push/deploy tự động.

### R1.1 — Format, evidence và Beginner planner

**Files — Modify:** `packages/content-format/src/{ast.ts,parser.ts,normalizer.ts,validator.ts,foundation-metadata.ts}`, `apps/api/src/curriculum/domain/curriculum.types.ts`, `apps/api/src/content-authoring/application/{content-imports.service.ts,content-publisher.service.ts}` (minimal default-deny 1.2 runtime gate only), `apps/api/src/teacher-ai/domain/foundation-rubrics.ts`, `apps/api/src/teacher-ai/application/evaluation.service.ts`, `apps/api/src/learning-sessions/application/{learning-sessions.service.ts,learning-session.types.ts}`, `apps/web/src/lib/api/api-client.ts` (additive instructions DTO schema), `apps/web/src/features/learning-session/activity-workspace.tsx`, `apps/web/src/features/learning-session/activity-renderers/speaking-activity.tsx`, `packages/content-format/src/index.ts`, `packages/contracts/src/index.ts` (exports only). **Create:** `packages/content-format/src/beginner-format.ts`, `packages/contracts/src/beginner.contracts.ts`, `apps/api/src/learning-sessions/domain/beginner-session-planner.ts`, `apps/api/src/teacher-ai/domain/beginner-rubrics.ts`; package index exports chỉ cho file mới. Test tại file sibling `.spec.ts`, renderer `.test.tsx`; thêm `beginner-format.spec.ts`.

**Interfaces:** consumes existing Activity/SessionPlan/Foundation evidence; produces additive format 1.2 INSTRUCTION/guided_response/min_words, `BeginnerManifestV1`, `planBeginnerSession`, versioned Beginner rubric selection. 1.0/1.1 normalizer/rubric output giữ nguyên; evaluation dispatch chọn Beginner bằng exact snapshot/program và rubric id/version, không category label. INSTRUCTION xuất thành optional instructions array trên snapshot/Beginner learner Activity DTO theo learningBlock phase, legacy omit; client Zod schema phải giữ field và renderer hiển thị theo phase. SessionPlan chỉ mang IDs, không instructions/đáp án. Runtime DTO không gửi solution trước submit. Export thêm hashBeginnerManifest(manifestWithoutHash):string cùng schema; R1 tests chỉ dùng synthetic valid fixtures, không cấp approval cho registry thật.

- [ ] Write tests `accepts_complete_beginner_12_not_todo`, `preserves_10_11_snapshots`, `guided_response_does_not_require_verbatim_sample`, `short_name_response_uses_authored_min_words`, `plans_all_8_assessed_activities_45_minutes`, `rejects_missing_skill_duplicate_or_unmapped_evidence`, `runtime_12_import_publish_default_denied_before_write`, `plans_exact_v2_without_selecting_first_v1`, `rejects_expected_version_mismatch_before_planning`; assert `[3,3,2]` Activity/block, tổng45, S/W có đủ, cùng input cho cùng plan; default-deny guard có `expect(databaseWrite).not.toHaveBeenCalled()` với mock ports.
- [ ] Run `pnpm --filter @worklingo/content-format exec vitest run src/beginner-format.spec.ts src/normalizer.spec.ts src/foundation-format.spec.ts` và API focused planner/rubric tests; xác nhận test mới FAIL đúng missing behavior, không nhầm fixture fail.
- [ ] Implement interfaces nêu trên; giữ planner legacy nguyên; mapping objectives split theo skill, instructions render riêng không tạo attempt; add contract exports/test và learner redaction tests.
- [ ] Run cùng tests + evaluation.service.spec.ts + speaking renderer test; phải PASS, output 1.0/1.1 giữ nguyên. Chưa gọi AI thật; evaluation mocked có queued/fail branch.
- [ ] Review diff + explicit stage file/task, commit `feat(beginner): add versioned pilot content and planning contracts` sau khi đạt test.

Exact-version handoff R1.1: future R2 resolver lấy LessonVersion ID từ enrollment manifest/binding, load snapshot V2 và truyền `mission.lessonVersion.id=V2` cùng `expectedLessonVersionId=V2`; planner không đọc DB, không nhận danh sách Lesson để tự chọn first/latest. ID lệch → `BEGINNER_LESSON_VERSION_MISMATCH`; output `SessionPlan.lessonVersionId=V2`, toàn bộ Activity IDs từ snapshot V2. R1.1 chỉ định nghĩa/test pure boundary bằng synthetic fixtures; không triển khai resolver/SessionCreation/session-start route hoặc xác minh FK DB của resolver (R2).

Runtime1.2 guard R1.1 mặc định đóng, không thêm bypass flag mở authoring: create/updateSource/validate trong ContentImportsService và publish trong ContentPublisherService đều từ chối trước bất kỳ write/job/provider call, kể cả import giả lập đã tồn tại. Exact error `BEGINNER_AUTHORING_DISABLED`; BOM/CRLF/header variants được test để tránh bypass. Parser1.2 có thể hoạt động pure/offline, không đồng nghĩa runtime import được phép. File allowlist/test inventory và preapproval review: [R1.1 scope review](../../../mandate/reports/2026-10-24-beginner-r11-preapproval-review.md).

**Acceptance R1.1 độc lập:** parser/normalizer/schema/hash/planner/rubric dispatch/redaction với synthetic fixtures, giữ output 1.0/1.1, không gắn independent speaking vào shadowing. 1.2 qua API import/publish mặc định bị chặn trước write; test default-deny và sai program. Runtime authoring enablement thuộc R1.2a đã được phép; R1.1 không cần DB migration/test publication, tám bài thật, video, registry thật hay timed rehearsal. **Rollback:** disable feature/readers mới chỉ khi chưa có dữ liệu1.2; nếu có references thì giữ reader/evaluator. **Không làm:** nhập/publish dữ liệu, seed, gọi AI/STT thật, regenerate legacy snapshots, thay ngưỡng chung hoặc tuyên bố rubric/content đã được hiệu chuẩn.

### R1.2a — Admin/editor/validation/preview và test registry

**Modify:** `apps/web/src/features/admin-curriculum/{curriculum-workspace.tsx,foundation-definition-editor.tsx}`, `apps/api/src/curriculum-foundation/application/{foundation-validation.ts,foundation-curriculum.service.ts}`, `apps/api/src/content-authoring/application/content-publisher.service.ts`, `apps/api/src/app.module.ts`. **Create:** `apps/web/src/features/admin-beginner/beginner-workspace.tsx`, `apps/web/src/app/(admin)/admin/programs/beginner/page.tsx`, `apps/api/src/beginner/application/beginner-release.service.ts`, `apps/api/src/beginner/beginner-admin.controller.ts`, `apps/api/src/beginner/beginner.module.ts`, `apps/api/test/integration/beginner-authoring.integration.spec.ts`, `apps/api/test/integration/beginner-release-registry.integration.spec.ts`, `apps/web/src/features/admin-beginner/beginner-workspace.test.tsx`; scoped DTO/client files as needed. Fixtures mới tại `apps/api/test/fixtures/beginner/authoring/`, không chung thư mục học liệu thật.

**Interfaces:** consumes R1.1 + existing import/audio/publish/CurriculumDefinition commands; produces preview, readiness validation và registry loader mục4.1. Không cần tám bài thật; fixtures có test-owned text/audio bytes thật trong temporary test storage, không gắn production identity/reviewer/timing giả. Fixture IDs/hash lấy từ publication/query test thật; chỉ test profile được load fixture registry. Publisher giữ prior Beginner LessonVersion PUBLISHED khi có replacement hợp lệ (mục6.1); Intermediate/IELTS vẫn giữ hành vi archive hiện tại. Classification Beginner dựa server-owned program binding, không category/source label. Nếu chưa chứng minh same Beginner program hoặc Lesson dùng chung với program khác, reject replacement cần review, không nới quyền toàn app.

- [ ] Write `rejects_wrong_program_todo_missing_audio_or_unselected_evidence`, `preview_writes_no_enrollment_attempt_or_completion`, `stale_hash_or_revision_409_and_no_partial_publish`, `test_registry_uses_published_ids_and_rejects_wrong_environment`, `fixtures_never_content_ready_or_production_approved`, `failed_test_publication_never_creates_approved_registry`, `beginner_supersession_preserves_prior_published_version`; thêm existing Intermediate/IELTS replacement assertions unchanged.
- [ ] Run `pnpm --filter @worklingo/api exec vitest run test/integration/beginner-authoring.integration.spec.ts test/integration/beginner-release-registry.integration.spec.ts` và workspace test red; trước DB setup phải có quyền scoped test fixture publication và preflight environment, không tự seed app DB.
- [ ] Implement scoped tree/editor/validation/preview + registry lifecycle/export/recheck. Test publication là explicit command trong isolated harness đã được phép; preview không âm thầm publish hay ghi learner state. Áp dụng supersession guard riêng Beginner trong publication transaction.
- [ ] Run green + existing content-publish/Foundation admin/eligibility suites; xác nhận all4 Lesson bindings trên fixture Unit và32 evidence mappings dùng đúng versions; thiếu học liệu thật vẫn SOFTWARE_READY / FIXTURE_ONLY, không CONTENT_READY.
- [ ] Review explicit files, commit `feat(beginner): add isolated authoring and release registry` sau approval triển khai task; không stage fixtures thành học liệu production.

**Acceptance:** Admin/editor/validation/preview/registry usable trên fixtures, tests xác nhận scope/history/environment. Technical acceptance không đợi R1.2b. **Rollback:** disable new authoring/test publication/registry admissions, giữ approved snapshots/receipts nếu có references. **Không làm:** tám bài/audio production, content approval giả, seed/publish ngoài test target được phê duyệt, mở learner thật.

### R1.2b — Tám bài thật, audio, sư phạm và timed rehearsal

**Create:** `content/beginner/pilot/{mg01-l1.lesson.txt,mg01-l2.lesson.txt,mg01-l3.lesson.txt,mg01-l4.lesson.txt,mg02-l1.lesson.txt,mg02-l2.lesson.txt,mg02-l3.lesson.txt,mg02-l4.lesson.txt}`, `docs/qualification/beginner-pilot-content-review.md`; registry export khi thực sự có publication dùng path template `content/beginner/pilot/releases/<environmentId>/<releaseId>.json`, không tạo file approved rỗng/TODO. Audio bytes ở approved target storage, source repo chỉ refs/checksums/rights/review; không giả định Git giữ media.

**Interfaces:** consumes R1.1 format/planner + R1.2a Admin preview/test registry; produces 8 authored sources, real reviewed audio,64 assessed Activities,16 skill objectives/Unit, pedagogical rubric/matrix và reviewer/timing report. Draft sáng tác có thể làm song song; CONTENT_READY phải qua đủ gate, không suy ra từ software approval.

- [ ] Lập review checklist cho từng Lesson: R/L/S/W can-do/evidence, hỗ trợ và transfer, source sense được duyệt, script/audio/narration, answer isolation, pronunciation/names, min_words/rubric hợp trình độ; mục thiếu giữ NOT_READY.
- [ ] Biên soạn tám source/audio thật và kiểm tra bằng parser/preview; chỉ nhập/test publication vào environment được duyệt riêng. Chưa có quyền thì giữ files draft/editorial refs, không điền UUID/hash publication giả.
- [ ] Reviewer được chỉ định kiểm tra sư phạm và rubric; tiến hành timed rehearsal từng bài bằng learner-mode Admin preview R1.2a với người thực hiện phù hợp đối tượng và người đánh giá quan sát. Không cần tạo enrollment/attempt thật để hợp thức hóa rehearsal; không thay fixture test bằng tuyên bố learner mastery.
- [ ] Ghi source/audio/rubric hash/version, actor/reviewer/date, profile người thực hiện không chứa PII, thời gian thực từng phase/active work, hỗ trợ/replay tự chọn, lỗi và kết luận. Dự toán45 và target35–50 active phút ở mục3 chỉ là đề xuất cần duyệt; count64/8 hoặc block targetMinutes không chứng minh thời lượng. Không ép số câu/replay/chờ để đủ phút; không đạt thì re-author hoặc xin scope duration mới, không tự đổi contract45.
- [ ] Rerun affected parser/preview tests và human checklist sau chỉnh nội dung; chỉ khi đủ8/8 human review/timing mới ghi CONTENT_READY và export/approve registry đúng môi trường theo mục4.1. Commit authored sources/report tách phần mềm; publication/cohort production vẫn cần quyền riêng.

**Acceptance:** tám Lesson có nội dung/audio thật, bốn kỹ năng/evidence/rubric phù hợp và timed rehearsal có người đánh giá; giữ rõ evidence kỹ thuật và sư phạm. **Rollback:** rút candidate khỏi admission mới/giữ draft hoặc NOT_READY; lưu review history, không xóa versions/files có reference hoặc sửa progress. **Không làm:** TODO scaffolds để đủ8 bài, video bắt buộc, tăng câu/replay vô nghĩa, giả caption/audio/mastery hoặc claim CEFR.

### R2.1 — Manifest enrollment và entry F0

**Modify:** `apps/api/prisma/schema.prisma`, `apps/api/src/learning-programs/application/program-context.service.ts`, `apps/api/src/learning-programs/domain/program-availability.ts`, `packages/contracts/src/beginner.contracts.ts`. **Create:** `apps/api/prisma/migrations/<generated_timestamp>_beginner_enrollment_manifest/migration.sql`, `apps/api/src/beginner/application/beginner-enrollment.service.ts`, `apps/api/src/beginner/beginner-learner.controller.ts`, `apps/api/test/integration/beginner-enrollment.integration.spec.ts`, `apps/api/test/integration/beginner-migration.integration.spec.ts`. Timestamp generated only when migration execution is approved. Read existing onboarding service at execution before adding narrowly scoped entry wiring; do not refactor it globally.

**Interfaces:** consumes registry service from R1.2a; software tests dùng FIXTURE_ONLY approved test manifest; admission thật cần R1.2b CONTENT_READY và approved target manifest; produces `admitF0` and nullable enrollment manifest; validates F0 level/path/program and approved cohort allowlist. Initial active-context switch is explicit with expected token, not implicit on page visit.

- [ ] Write `pending_new_profile_enters_f0_without_intermediate_initialization`, `existing_learner_history_unchanged`, `basic_direct_entry_denied`, `manifest_null_or_bad_hash_fails_closed`, `concurrent_same_request_once_changed_request_409`; verify actor from auth, no client learnerId override.
- [ ] Run new integration tests red on disposable harness only; migration fixture asserts enrollment/session/attempt/evaluation/mastery/completion checksums stable through M1.
- [ ] Implement entry/profile+enrollment+receipt+audit atomically with expected-context revision; add default-off admission feature/cohort gate. Migrate only isolated test DB within separately authorized execution scope.
- [ ] Run new tests green plus existing `program-context-api`, `program-enrollment-migration`, `onboarding-self-placement`, `program-learning-boundaries` integration specs. Learner switching out/in preserves pinned manifest/currentLevel; no fake placement result.
- [ ] Review explicit diff and commit `feat(beginner): add isolated F0 enrollment with pinned manifest`.

**Acceptance:** entry only approved F0 release, idempotent and ownership-safe; legacy null behavior unchanged; no public catalog flip. **Rollback:** stop new admission; existing owned sessions/history still readable/resumable. **Không làm:** Basic direct entry, cross-path transition, legacy migration.

### R2.2 — Exact Lesson sessions, roadmap, mastery và stage guard

**Modify:** `apps/api/src/curriculum/application/curriculum.service.ts`, `apps/api/src/learning-sessions/application/{session-creation.service.ts,learning-sessions.service.ts}`, `apps/api/src/curriculum-foundation/application/{curriculum-eligibility.service.ts,curriculum-progress.service.ts}` (add scoped adapters/delegation, preserve legacy path), `apps/web/src/features/learning-session/session-shell.tsx`, `apps/web/playwright.config.ts` (add beginner-desktop/mobile projects, testMatch beginner-pilot/beginner-resources only). **Create:** `apps/api/src/beginner/application/{beginner-lesson-resolver.service.ts,beginner-session.service.ts,beginner-roadmap.service.ts}`, `apps/web/src/features/beginner/{beginner-roadmap.tsx,beginner-roadmap.test.tsx}`, `apps/web/src/lib/api/beginner-client.ts`, `apps/web/src/app/(learner)/beginner/page.tsx`, `apps/api/test/integration/beginner-progression.integration.spec.ts`, `apps/web/e2e/beginner-pilot.spec.ts`. New contract/schema tests next to beginner.contracts.ts.

**Interfaces:** consumes R1.1 planner + R1.2a fixture registry + R2.1 enrollment; produces resolver/start/roadmap interfaces in section4. Existing SessionCreation input gains internal planningPolicy=`legacy`|`beginner-pilot-v1` default legacy, not learner-controlled; Beginner handler calls dedicated planner. Exact-version lookup accepts explicit bound lessonVersionId, never implicit first/currentPublishedVersion.

- [ ] Write `every_mg01_lesson_selectable_from_manifest`, `new_published_pointer_does_not_change_enrolled_version`, `l4_first_missing_l1_l3_remains_locked`, `queued_failed_or_weak_skill_does_not_unlock_mg02`, `all_required_evidence_opens_mg02`, `pilot_finished_stage_exit_still_disabled`, `retry_uuid_different_lesson_409`, `resume_exact_plan_after_context_switch`; thêm matrix mục6.1 (`old_enrollment_starts_v1_after_c2_publish`, `old_session_resumes_and_evaluates_v1_after_c2_publish`). Assert no fake completion for unlearned Units, no answer leak.
- [ ] Run `pnpm --filter @worklingo/api exec vitest run test/integration/beginner-progression.integration.spec.ts` red; use actual attempts + controlled evaluated test evidence, never seeded completion to simulate progression.
- [ ] Implement exact resolver/start/read model and gates; Beginner eligibility nhận exact manifest revision/prerequisite IDs, không gọi legacy latest-based eligibility làm authoritative gate cho pinned content. Roadmap exposes five-stage tree with unpublished content only as explicitly approved planned titles; no draft IDs/media/answers. Next action resume→await/practice→recommended Lesson→eligible Unit; separate 4/4 workflow from mastery. Stage expected MG01–04 means pilot MG01/02 never stage-ready.
- [ ] Run integration green + existing curriculum progress/eligibility, session ownership, program boundaries; web roadmap test and `pnpm --filter @worklingo/web exec playwright test e2e/beginner-pilot.spec.ts`. E2E enter→L1–L4→pending/fail/weak→unlock→MG02→resume; no CEFR badge. Use deterministic eval fixtures; paid/live model calibration requires separate scope/consent.
- [ ] Review explicit diff and commit `feat(beginner): add version-pinned pilot progression and roadmap`.

**Acceptance phần mềm:** start each of8 fixture Lessons,64 mappings selected, only evaluated test evidence opens next Unit, exact resume và matrix mục6.1 pass. **Acceptance learner thật:** cần thêm R1.2b và permission/registry đúng target; Intermediate/IELTS/legacy behavior preserved. **Rollback:** stop new enrollment/start; retain Beginner reader, resume/evaluation and manifest for existing sessions. **Không làm:** public launch, MG-F0 completion, Basic/Intermediate admission, changing old curriculum DTO shape.

### R3.1 — Minimal resource library và immutable assets

**Modify:** Prisma schema, `apps/api/src/storage/storage.module.ts`, `apps/api/src/app.module.ts`. **Create:** `apps/api/prisma/migrations/<generated_timestamp>_learning_resource_library/migration.sql`, `packages/contracts/src/learning-resource.contracts.ts`, `apps/api/src/learning-resources/learning-resources.module.ts`, `apps/api/src/learning-resources/learning-resources-admin.controller.ts`, `apps/api/src/learning-resources/application/resource-library.service.ts`, `apps/api/src/learning-resources/domain/resource-media-storage.port.ts`, `apps/api/src/learning-resources/infrastructure/local-resource-media.adapter.ts`, `apps/web/src/features/admin-learning-resources/resource-library.tsx`, `apps/web/src/app/(admin)/admin/learning-resources/page.tsx`; sibling unit/UI tests and `apps/api/test/integration/learning-resource-library.integration.spec.ts`.

**Interfaces:** produces LearningResource identity (creator/rights/access), immutable LearningResourceVersion (file checksum/type/size/duration/transcript/review), ResourceTrack (language/kind/hash/storageKey pinned to version), ResourceMediaStorage port. New version for caption/transcript fix; do not mutate old track. MP4 video H.264/AAC, PDF supplementary documents, UTF-8 transcript/VTT; proposed limits 250MiB/video, 20MiB/PDF, 2MiB/track, video<=20min; explicit local storage free-space preflight and no total-capacity promise. Limits require product/ops approval before R3. PDF served download/sandbox, not active same-origin content; no arbitrary remote URL ingestion.

- [ ] Write `requires_actual_file_hash_rights_and_review`, `version_and_track_immutable`, `mime_spoof_path_traversal_size_limit_denied`, `failed_commit_has_no_ready_binding`, `referenced_assets_not_deleted`; assert where-used/archive/revoke semantics and version order races.
- [ ] Run new resource unit/integration tests red against isolated storage root/DB; verify no upload path points at production storage.
- [ ] Implement staged streaming upload, validation, metadata/review/list/where-used; do not invent transcoding/thumbnail/caption content. File and DB backup/restore procedure includes checksum inventory and orphan reconciliation; uploaded optional resource has no mastery fields.
- [ ] Run tests green, existing local-object-storage adapter tests unchanged, migration empty/legacy rehearsal + backup restore checksum test.
- [ ] Review explicit diff, commit `feat(resources): add reviewed immutable local resource library`.

**Acceptance:** real file review lifecycle, version/access/transcript/caption/storage, restore proven on test; no learner access yet. **Rollback:** stop upload/review writes, retain all referenced assets/reader. **Không làm:** fake planned resources, cloud/CDN/HLS/DRM, AI caption autoapproval, viewing analytics.

### R3.2 — Authorized delivery primitive

**Create:** `apps/api/src/learning-resources/resource-media.controller.ts`, `apps/api/src/learning-resources/application/resource-access.service.ts`, `apps/api/test/integration/resource-media-security.integration.spec.ts`; extend ResourceMediaStorage adapter with stat/openRange. Learner authorization resolver is deny-all until R4; Admin preview explicit role/scope.

**Interfaces:** `authorizeBindingAccess(userId, bindingId, context): AuthorizedMedia` used by GET/HEAD/tracks; `AuthorizedMedia` contains storage key only internally. R3 permits Admin preview versions, R4 adds learner manifest/session context. No unguarded raw ResourceVersion URL.

- [ ] Write `head_get_range_share_authorization`, `foreign_session_track_binding_denied`, `range_206_content_range`, `unsatisfiable_range_416`, `revocation_denies_existing_pin`, `stream_is_not_read_all_buffer`; revoked access cannot be recovered by guessing key.
- [ ] Run security tests red on local fixtures.
- [ ] Implement bounded single-byte-range streaming (full GET200, valid range206, malformed/multi-range rejected416, HEAD headers/no body), safe Content-Type/Disposition, Cache-Control private/no-store. Do not mount storage dir public; sanitize logs, no bearer URLs. Abort stream on disconnect; each new request rechecks revoke, cache cannot bypass it. Revocation áp dụng từ request kế tiếp; không thu hồi byte đã gửi hoặc hứa cắt ngay response đang stream. UI không retry sang version khác.
- [ ] Run tests green + role/ownership tests; verify unauthorized HEAD/Range return no asset metadata/bytes, and track attached to another version is denied.
- [ ] Review/stage explicit files, commit `feat(resources): enforce authorized ranged media delivery`.

**Acceptance:** access safe across all methods, no full video buffer; revoked requests denied. **Rollback:** disable media route/player, alternatives remain. **Không làm:** learner access before R4 membership, public asset URLs, analytics.

### R4.1 — Compatible supplementary releases và session pins

**Modify:** Prisma schema, session creation internal handler, Beginner resolver/roadmap, resource services. **Create:** `apps/api/prisma/migrations/<generated_timestamp>_lesson_supplementary_release/migration.sql`, `packages/contracts/src/lesson-supplement.contracts.ts`, `apps/api/src/learning-resources/application/lesson-supplement.service.ts`, `apps/api/src/learning-resources/lesson-supplement-admin.controller.ts`, `apps/api/test/integration/supplement-update-compatibility.integration.spec.ts`; sibling contract tests.

**Interfaces:** consumes R1/R2 exact LV + R3 resource versions; produces `approveSupplementRelease(actorId,input:{baseLessonVersionId,expectedRevision,baseAssessmentHash,bindings,idempotencyKey}): SupplementReleaseDto` and `resolveLessonSupplement`. Implements five concepts and pin policy section2; assessment hash includes every base snapshot field relevant to learning/evaluation, excluding **only** separately stored supplementary metadata. Review compatible classification is recorded, not inferred from hash alone.

- [ ] Write `compatible_video_available_to_existing_manifest_without_progress_changes`, `session_pinned_none_stays_none_after_add`, `existing_session_retains_old_caption_and_file`, `new_session_pins_new_release`, `assessed_change_requires_new_curriculum`, `concurrent_start_release_retry_keeps_original_pin`, `stale_base_or_revoked_asset_cannot_approve`; thêm `superseded_v1_still_gets_only_v1_supplement` và `c2_publish_does_not_invalidate_v1_session_pin_or_evaluation` theo mục6.1; assert full invariants section2.2 and no retroactive recalculation.
- [ ] Run new integration tests red on isolated fixtures including sessions created before M3.
- [ ] Implement draft/validate/reviewer approval transaction, immutable release/bindings, latest-compatible lookup only for sessionless/new-session; pin at same transaction as session create. Archive/revoke audited; deletion denied when referenced. Detect basehash mismatches, reject content edits via resource endpoints.
- [ ] Run tests green + session idempotency/ownership + resource security suites; rollback new release and verify historical pin unchanged and future choice uses previous approved version.
- [ ] Review explicit diff, commit `feat(resources): add compatible lesson supplements with immutable session pins`.

**Acceptance:** existing learners receive reviewed supplementary updates without changed base progress; active/history sessions stable, null doesn't upgrade; assessment changes isolated. **Rollback:** archive latest release/stop approvals; retain pins/history. **Không làm:** enrollment migration/equivalence engine, editing approved base snapshot, silent current-pointer lookup.

### R4.2 — Admin binding preview và optional learner player

**Modify:** Beginner Admin workspace/roadmap, session shell, resource access resolver. **Create:** `apps/web/src/features/learning-resources/{lesson-supplement-panel.tsx,accessible-video-player.tsx}`, `apps/web/src/lib/api/learning-resources-client.ts`, sibling `.test.tsx`, `apps/web/e2e/beginner-resources.spec.ts`.

**Interfaces:** consumes authorized supplementary DTO and media binding endpoints; shows real approved resources only, text/audio alternative is primary when no video. Caption/transcript display exact pinned version; resource navigation does not create LearningSession/ActivityAttempt. Player position transient UI only.

- [ ] Write `can_complete_lesson_without_video`, `play_end_does_not_write_attempt_mastery_completion`, `locked_lesson_or_other_session_no_media`, `old_session_shows_pinned_caption`, `revoked_media_shows_alternative`, `keyboard_and_caption_controls_work`; assert supplementary has no completed/mastered badge.
- [ ] Run new web tests red; verify failure đúng missing component/behavior, không thiếu fixture file.
- [ ] Implement Admin where-used/binding preview and learner panel/player/PDF download; avoid altering Intermediate/IELTS shell except scoped integration entry.
- [ ] Run web tests green, resource security integration, `pnpm --filter @worklingo/web exec playwright test e2e/beginner-pilot.spec.ts e2e/beginner-resources.spec.ts`; run actual no-video route too. E2E uses actual tiny licensed/test MP4/VTT, not imaginary production videos.
- [ ] Review explicit diff, commit `feat(beginner): add optional reviewed learning resources`.

**Acceptance:** both unlocked-sessionless and owned-session flows authorized; no playback evidence; late video does not invalidate attempts; absent/revoked optional video leaves adequate alternatives. **Rollback:** disable panel/new approvals, keep authorized historical reader and all pins/assets. **Không làm:** watch telemetry, completion percentage, fake resource slots, claiming CEFR.

## 6. Release/test gates và rollback chung

Các commands dưới đây **chưa chạy trong vòng lập plan**. Future integration harness phải xác minh test DB identifier + isolated storage root trước setup/reset; cấm production URL. Dùng sẵn harness tạo/reset fixture theo spec hiện hành, không tự nối .env DB thật. Playwright config hiện fallback DATABASE_URL dù tạo schema riêng; Beginner test command phải set explicit TEST_DATABASE_URL tới DB test riêng + role test và verify host/database/role trước globalSetup. Không coi schema ngẫu nhiên trên DB production là test cách ly; bổ sung fail-closed preflight cho project Beginner, giữ suite cũ không đổi.

Focused commands bổ sung (cùng command cho red/green; mỗi task dùng assertion chính bên cạnh cùng named cases đã nêu, không chỉ snapshot implementation):

| Task | Command | Assertion chính trong test |
| --- | --- | --- |
| R1.1 | `pnpm --filter @worklingo/api exec vitest run src/learning-sessions/domain/beginner-session-planner.spec.ts src/teacher-ai/domain/beginner-rubrics.spec.ts` | `expect(plan.blocks.map(b=>b.activityIds.length)).toEqual([3,3,2])`; old format parsed payload deepEqual baseline. |
| R1.2a | `pnpm --filter @worklingo/web exec vitest run src/features/admin-beginner/beginner-workspace.test.tsx` | `expect(learnerMutationCalls).toEqual([])` sau preview; integration so state DB trước/sau, sai program publish reject. |
| R1.2b | Parser/preview commands của R1.1/R1.2a + human checklist/timing report từng Lesson | Không có assertion tự động thay thế human timing/content verdict; thiếu evidence vẫn NOT_READY. |
| R2.1 | `pnpm --filter @worklingo/api exec vitest run test/integration/beginner-enrollment.integration.spec.ts test/integration/beginner-migration.integration.spec.ts` | `expect(enrollments).toHaveLength(1)` sau concurrent retry; khác hash `expect(status).toBe(409)`. |
| R2.2 | `pnpm --filter @worklingo/web exec vitest run src/features/beginner/beginner-roadmap.test.tsx` | `expect(mg02.state).toBe('locked')` khi thiếu evidence, all required pass thì available; stageReady luôn false trong pilot. |
| R3.1 | `pnpm --filter @worklingo/api exec vitest run test/integration/learning-resource-library.integration.spec.ts src/learning-resources/infrastructure/local-resource-media.adapter.spec.ts` | `expect(approvedVersions).toHaveLength(0)` sau upload/commit lỗi; restore sha256 bằng bản trước. |
| R3.2 | `pnpm --filter @worklingo/api exec vitest run test/integration/resource-media-security.integration.spec.ts` | `expect(range.status).toBe(206)` đúng quyền; unauthorized HEAD không có Content-Range/asset length. |
| R4.1 | `pnpm --filter @worklingo/api exec vitest run test/integration/supplement-update-compatibility.integration.spec.ts` | `expect(afterProtectedState).toEqual(beforeProtectedState)`; old session nullable pin vẫn null, new session pin release2. |
| R4.2 | `pnpm --filter @worklingo/web exec vitest run src/features/learning-resources` | `expect(mutationRequests).toEqual([])` sau play/ended; get media vẫn cần quyền. |

New response-mode tests pin rubric1 despite registry adding rubric2; no historical evaluation rewrite. E2E command cần `--project=beginner-desktop --project=beginner-mobile` sau khi hai project đã được thêm vào config; test collector phải tìm đúng2 specs, không cho `No tests found` hoặc skipped route thành PASS.

1. Mỗi task: focused red→green như trên; adjacent tests theo touched behavior, không full suite lặp sau từng dòng. Lint/typecheck các packages bị đổi. Schema `pnpm --filter @worklingo/api exec prisma validate` và migrate rehearsal trên test only khi quyền tương ứng được cấp.
2. R1.1 độc lập chỉ chạy focused unit/component và pure legacy regression, lint/typecheck/build; không gọi root `pnpm test`/E2E hoặc integration harness tự tạo DB nếu chưa có quyền scoped test-data/setup. Broad DB/E2E gates áp dụng R1.2a/R2 trở đi sau preflight/approval môi trường; thiếu quyền phải báo chưa chạy, không coi skipped là pass. Increment gate khi có đủ quyền: `pnpm format:check`, `pnpm i18n:check`, `pnpm mandate:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`; một lần trên candidate cuối mỗi increment khi có cross-package change. Không báo pass nếu network/provider/schema fixture làm skip test.
3. R1/R2 regression bắt buộc existing `content-publish`, `curriculum-foundation-{admin,eligibility,progress}`, `session-ownership`, `program-context-api`, `program-learning-boundaries`, `learning-programs-api`, `onboarding-self-placement`, `ielts-study-session`, `ielts-flow-v3-compatibility` integration specs. Intermediate AI generation/content import tests nằm trong package test; không gọi provider thật để tránh quota/data egress ngoài quyền.
4. R3/R4 thêm storage, resource auth/security/migration/restore suites, caption/transcript security, no-video E2E. Final release candidate `pnpm --filter @worklingo/web e2e` gồm suite IELTS hiện có. AI/STT calibration thật là human/provider gate riêng, không mock-passing rồi tuyên bố pedagogy verified.
5. Rehearse additive migrations from empty + representative legacy fixture; snapshot hashes/counts before/after; no enrollment/status/program pointer backfill. Fail/retry upload/approve/start and process-restart/resume; retained old format readers. Review SQL locks/timeouts/indexes; FK references restrict file cleanup.
6. Acceptance report ghi commit, test commands/results, reviewed content/audio/rubric versions, remaining defects; cần code review độc lập trước merge khi sau này được cho phép. Technical green ≠ controlled cohort/public approval. User duyệt từng gate qua mandate CLI/hash, không checkbox tự tick để sinh approval.

Rollback theo increment ưu tiên disable new writes/admission, không destructive down migration. Backup DB+object files và verify hashes trước data deployment. Sau có 1.2 sessions phải forward-fix/giữ reader tương thích; không quay binary không hiểu payload. Rollback không revoke nhầm mọi asset và không đổi score/completion. Đường historical read/resume/evaluation vẫn hoạt động; lỗi nội dung có thể block new starts và báo reviewer, không tự biến fail thành pass.

### 6.1 Regression bắt buộc: enrollment cũ khi revision/pointer mới

Fixture scenario dùng publication thật trong DB/storage test đã được phép: approve test registry A pin C1→V1; learner A có một session V1 đang dở và enrollment chưa đổi; publish V2 cùng Lesson, C2 có target/bộ prerequisite mới; pointer chuyển V2; test registry B pin C2→V2 cho learner B. Dùng receipts/IDs/hashes của DB test, không tự sửa trạng thái để né lỗi publisher. Assert V1/C1 còn hợp lệ sau supersession.

**Policy cần thực hiện, chưa có trong code:** publisher hiện auto-archives prior version (source ở mục1). Với replacement chỉ thuộc Beginner, giữ V1 PUBLISHED, pointer là V2; superseded khác withdrawn. Không auto-archive C1, bindings/audio/rubric hay xóa registry A vì B mới hơn. Không đổi quy tắc auto-archive Intermediate/IELTS. Version đã ARCHIVED do thao tác withdrawal không tự unarchive/không blanket cho mọi ARCHIVED đi qua; nếu có legacy archive chưa rõ provenance thì review riêng, không migrate/backfill trong scope này.

| Flow / owner task | Assertion trên A sau khi B/C2/V2 đã publish |
| --- | --- |
| Start / R1.2a+R2.2 | Session mới của A vẫn C1/V1, H của C1, đúng đủ Activities V1; không latest/first fallback hoặc lỗi bound_lesson_unavailable chỉ vì superseded. B start C2/V2; prerequisite mới C2 không hồi tố A. |
| Resume / R2.2 | Session đang dở vẫn planSnapshot/checkpoint/Activity IDs V1 và existing attempts; retry cùng clientSessionId giữ target cũ; không cần A còn selectable cho new admission. |
| Evaluation / R2.2 | Submit/evaluate/retry task cũ dùng Activity/audio/prompt/rubric version V1 và policy pinned; queued→evaluated cập nhật đúng attempt/mastery/completion C1, không tạo hoặc chấm theo C2/V2. B request Activity V1 từ session V2 bị từ chối. |
| Supplement sessionless/new session / R4.1 | A chọn latest compatible release theo exact base V1 (có thể S1b mới), B theo V2/S2; S2 không áp dụng V1 dù cùng Lesson ID. C1/V1 không còn current vẫn được authorize nếu hợp lệ/unlocked. |
| Supplement historical session / R4.1 | A session pin S1a giữ file/transcript/caption/hash S1a; NONE vẫn NONE sau có S1b/S2; media GET/HEAD/Range/track kiểm tra pin/quyền, không bắt base là currentPublishedVersion. |
| Negative boundaries / R2.2+R4.1 | Missing/corrupt manifest/hash, foreign/draft/unbound version, genuine withdrawal/new-start block và resource revoke bị chặn đúng policy; không nới ARCHIVED cho mọi nội dung hoặc fallback latest để vượt lỗi. |

Files test: mở rộng `apps/api/test/integration/beginner-authoring.integration.spec.ts`, `apps/api/test/integration/beginner-progression.integration.spec.ts`, `apps/api/test/integration/supplement-update-compatibility.integration.spec.ts` ở tasks đã có, không tạo suite song song. Run `pnpm --filter @worklingo/api exec vitest run test/integration/beginner-authoring.integration.spec.ts test/integration/beginner-progression.integration.spec.ts test/integration/supplement-update-compatibility.integration.spec.ts`; assert actual DB foreign keys/IDs/hash trước-sau, không chỉ DTO mocks. Bổ sung old-content audio authorized access test cùng version. Evaluation dùng deterministic provider test doubles để kiểm tra routing/provenance, không chứng minh calibration AI thật.

Acceptance R2 cần start/resume/evaluation matrix; R4 thêm supplementary/media matrix. Rollback publication B/ngừng admission mới không xóa A/C1/V1 hoặc invalidates A; giữ reader/evaluator/assets/approved historical registry. Explicit safety revoke vẫn chặn resource như mục2, không silently đổi file. Đường supersession không thay ARCHIVED thành published hàng loạt.

## 7. Quyết định còn cần chủ sản phẩm duyệt

| Quyết định | Khuyến nghị cụ thể | Chặn đợt |
| --- | --- | --- |
| Compatible supplementary updates cho learner hiện tại | Approve policy mục2, 5th concept SupplementaryRelease; sessionless/new session nhận bản reviewed cùng base, existing session pin cũ/NONE | R3 schema đầy đủ và R4; không chặn text/audio R1/R2 |
| Format/planner mới đúng Beginner | Additive 1.2 instructions + guided_response + authored min_words; dedicated 45-minute planner chọn đủ 8 assessed tasks; giữ 1.0/1.1/legacy output | R1.1 code, có thể xin approval độc lập |
| Nội dung/evaluation/timing | Chỉ định reviewer/chủ biên; duyệt task/rubric + target35–50 active phút, gate source/audio thật của8 bài; threshold0.7 kỹ thuật chưa là chuẩn năng lực | R1.2b CONTENT_READY và R2 cohort thật; không chặn R1.1/R1.2a/R2 software |
| Resource operations | Local MP4/PDF/VTT, limits mụcR3, disk/backup ownership, reviewer designation; production6 video slots không phải dependency text-only | R3 |
| Authority thực thi | Duyệt riêng increment/files/data environments/test migrations; sau đó riêng nhập nội dung/publish + cohort allowlist; merge/push/deploy/public vẫn không được suy ra | Mọi execution |

Không mở lại các lựa chọn đã đồng ý định hướng ở Global Constraints. Basic direct-entry, MG03–CB12 authoring, stage checkpoint/cross-path transition, Intermediate admission, analytics/cloud/DRM nằm ngoài R1–R4; cần proposal/approval riêng, không được để thành phần việc ngầm.

### Approval có thể xin riêng cho R1.1

Đề nghị scope nhỏ nhất: đúng các file R1.1 để thêm format1.2/instructions/guided_response/min_words, manifest schema/hash, dedicated45 planner, rubric registry/dispatch version hóa, redaction và default-deny runtime import/publish guard. Unit/component tests dùng synthetic fixtures và mocked ports; regression1.0/1.1 + Intermediate/IELTS/shared readers. Không migration, integration DB setup/publication, tám bài/audio thật, provider calls, registry approval, learner/cohort hoặc deploy.

R1.1 software-ready không phụ thuộc reviewer/timed rehearsal/nội dung của R1.2b, cũng không phụ thuộc quyết định SupplementaryRelease/video. Rubric fixtures/weights là kỹ thuật chưa hiệu chuẩn, không được mở học viên bằng approval R1.1. MND-20261024-001 bao trùm R1–R4: không transition toàn mandate thành approved từ một approval R1.1. Trước khi ghi approval thực thi, capture một record phạm vi R1.1 liên kết parent/plan qua mandate CLI, không dự đoán ID và không tạo backlog/sprint khác; parent giữ captured. Record riêng chỉ được approve khi có human authorization đúng scope/hash. Chưa tạo record hoặc approval đó trong tác vụ này. Cần explicit human scope/hash theo mandate trước khi code; **chưa được approve trong vòng review này**. R1.2a test-DB publication và R1.2b content gates xin quyền riêng, không ăn theo approval R1.1.

## 8. Review của vòng lập plan

- Coverage: update/history → mục2/R4; feasibility → mục3/R1; schema/API/auth/transaction/migration → mục4 + R2/R3; regressions/rollback → mục6; approval → mục7/mandate. Không đánh dấu implemented.
- Type consistency: LessonSupplementaryRelease là identity release duy nhất; ResourceVersion pin track; session FK nullable=NONE; manifest exact LV; planner chỉ45. Braced file lists là các file riêng, không phải glob staging.
- Review Focus 1–5 đều có named tests trong task sở hữu; failed upload không thể publish; null pin, session retries, old pointer, media track scope được nêu tường minh.
- Hai rủi ro không thể xác minh chỉ bằng tài liệu: giáo viên/timing thực tế và provider rubric calibration. Giữ NOT_READY cho tới có evidence, không dùng đủ số Activity thay thế.
- Delta vòng review sau6113427: tách R1.2a/R1.2b; thêm registry lifecycle/environment/permission; thêm supersession + pinned start/resume/evaluation/supplement regression và giữ human timed gate với contract45. Recheck dependency: software R2 không chờ học liệu thật, learner launch phải chờ R1.2b. R1.1 là scope có thể xin approval riêng, chưa được duyệt.
- Tác vụ hiện tại chỉ chỉnh plan và mandate captured; tests/migrations/product changes ở trên là tương lai, không ghi PASS.
