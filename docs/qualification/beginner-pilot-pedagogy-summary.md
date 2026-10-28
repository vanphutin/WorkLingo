# Gate B — global reviewer intake và AI rationale

2026-10-28 Asia/Saigon. Mandate MND-20261027-003 giữ implementing. Đây là hồ sơ human-reported statement + AI analysis,không phải Gate B verified/CONTENT_READY. Chỉ ba result files được sửa.

## 1. Tuyên bố reviewer đã ghi nhận

Reviewer ID ENG-REVIEWER-001; kind REVIEWER_REPORTED_GLOBAL_PASS; classification HUMAN_REVIEWER_REPORTED.

> Tất cả session đều PASS, tôi đã kiểm tra toàn bộ tài liệu, những phần cần tôi đánh giá mức độ hay giải thích thì để Codex làm.

Lời reviewer do chủ sản phẩm thuật lại trong cuộc trò chuyện. Đã ghi đúng quyền phân tích/giải trình/đề xuất mức độ cho Codex. Không biến AI rationale thành lời của reviewer. Không tự tạo chữ ký,ngày review,evidenceReference hoặc chứng thực danh tính. Ngày nhận27/10/2026 đã ghi trước đó không được dùng làm ngày review. Bằng cấp/bổ nhiệm/consent gốc vẫn do owner giữ; agent chỉ có owner attestation.

**Individual decisions đủ bằng chứng:0/8.** Global PASS được giữ nguyên,nhưng thiếu bindings/date/reference/per-item dispositions để nhập thành tám quyết định riêng. Formal NOT_REVIEWED nghĩa là chưa chấp nhận individual evidence,không phủ nhận lời reviewer đã đọc tài liệu. Không hỏi reviewer lặp lại global conclusion.

## 2. Phạm vi AI đã phân tích

8 Lesson;64 Activities (48 MC +16 S/W);32 single-skill objectives;41 lexical/IPA occurrences (11 expressions);24 actual WAV;16 source rubric texts;112 checklist cells (14 JSON categories×8,13 mã trong checklist Markdown với X1 tách support/demo). Core per-item analyses=161 (64+32+41+24). Tất cả có rationale/citations hoặc exact technical measurements trong [review packet](beginner-pilot-pedagogy-review.json) tại aiAnalysis; không ghi đè human fields/source extracts.

48 keys đều khớp independent semantic source check; không phát hiện key sai trong phạm vi này. Đã đọc/check actual media SHA,PCM16 mono24kHz,không clipped samples và đo energy. Chưa speech recognition/nghe xác minh âm vị độc lập. Existing Gate A human sound QA được dẫn nguồn riêng; không đổi thành teacher per-file decision. Chưa có DB/master-C2 check,provider/live runtime,learner performance hay timed rehearsal. Không gán CEFR/TOEIC/IELTS bằng suy đoán.

## 3. Từng Lesson và exact version

| Lesson | Exact reviewedBundleSha256 | Technical binding | Human evidence | AI items A/O/Lex/Audio |
| --- | --- | --- | --- | --- |
| MG01-L1 | `9a0d43368585060fdc8832754453433e85e9d0fbc70c178533636fb48ad4b217` | MATCH | Global reported PASS;individual pending | 8/4/5/3 |
| MG01-L2 | `29def559327d00d41ba1b711cf214ca155c8f66c1fd5b9221a7c8653d3302503` | MATCH | Global reported PASS;individual pending | 8/4/5/3 |
| MG01-L3 | `86709e22b96a4889d84edfaa282927c564843713b1b80d267f0b2e54a0da0183` | MATCH | Global reported PASS;individual pending | 8/4/5/3 |
| MG01-L4 | `d7612fc457923abf24eda0cf84229e1cfecbad7701274291365a403f9c0c409e` | MATCH | Global reported PASS;individual pending | 8/4/5/3 |
| MG02-L1 | `9b8ee498c5a41a520d6abd43fe3b9b8bf159210b33f98e149d282e42dd583714` | MATCH | Global reported PASS;individual pending | 8/4/6/3 |
| MG02-L2 | `06db374a3a4289630fd11ef8bc9cb170ed285525b94c2965d6d91b2f031cf193` | MATCH | Global reported PASS;individual pending | 8/4/5/3 |
| MG02-L3 | `3d24c725081ffb3de0bd11dac9973c37f17a2ac3fe5edf987a99005ad1b8d320` | MATCH | Global reported PASS;individual pending | 8/4/5/3 |
| MG02-L4 | `ff444130c663e250573d8c57b0cf4920f7c2f26611fec09894004c2771b79cf2` | MATCH | Global reported PASS;individual pending | 8/4/5/3 |

### MG01-L1

Có scaffold VI, nhận tên/nơi rồi phân vai I/you và sản xuất từ hai thẻ khác. r3 đã cho vai Kim nên không bắt buộc thẻ; không coi mọi câu là đọc độc lập. I/you+am/are,from và lời chào là mẫu cơ bản; key/model không mâu thuẫn facts thẻ. Question/role-card labels như speaker,partner,where,record chưa có evidence người mất gốc hiểu. VI guides hỗ trợ nhưng chưa có observation.

AI coverage: 8 Activities,4 objectives,5 lexical/IPA,3 audio và14 checklist cells. Findings: CR-B-AI-01, CR-B-AI-03, CR-B-AI-04, CR-B-AI-05, CR-B-AI-06. Actual human disposition/date/reference còn pending. Raw source `9f68a1181b6b592316e899a1afc3a2621b56b5453332378b9c3021ce41a60af8`; rubric code `2424159119b5e779a614dfec48106164ccfc9627ed0940d08c507d37697b126c`. Exact16 rubric-text hashes và24 selected audio/script/request/take hashes nằm trong aiAnalysis.lessons[].bindings và audio[]; đã đối chiếu source/WAV thực.

### MG01-L2

Tái dùng I/you/from, thêm tên chữ/stress và ghép tên+nơi. Listening từ spelling về tìm một tên/nơi, chưa tăng đều từng Activity. Ed/E,D và Jo/J,O/Joe nhất quán; Emma nhấn âm đầu theo source. Không cần thêm My name is. Letters/spell/written/introduce cần scaffold; luyện stress Emma không đồng nghĩa cung cấp full model thẻ Emma/London.

AI coverage: 8 Activities,4 objectives,5 lexical/IPA,3 audio và14 checklist cells. Findings: CR-B-AI-01, CR-B-AI-03, CR-B-AI-04, CR-B-AI-05, CR-B-AI-06. Actual human disposition/date/reference còn pending. Raw source `f88c80a4edb3204ed56bdd12f961c36775b184c19e25104ed19a7e684d9a3f72`; rubric code `2424159119b5e779a614dfec48106164ccfc9627ed0940d08c507d37697b126c`. Exact16 rubric-text hashes và24 selected audio/script/request/take hashes nằm trong aiAnalysis.lessons[].bindings và audio[]; đã đối chiếu source/WAV thực.

### MG01-L3

Có cross-card binding, đảo vai Mia→Leo và hai nơi I/you; listening dài/đa facts hơn L1/L2. Thẻ sản xuất mới, giảm sentence frame. You are from kết hợp lại you+are với from; phân biệt Eva/Noah và Ben/Jo. Không thấy sai mẫu câu. Đổi vai cộng hai địa danh tăng working memory; chưa có learner calibration/teacher item evidence.

AI coverage: 8 Activities,4 objectives,5 lexical/IPA,3 audio và14 checklist cells. Findings: CR-B-AI-01, CR-B-AI-03, CR-B-AI-05, CR-B-AI-06. Actual human disposition/date/reference còn pending. Raw source `44ab75cabd6f71fa56e84fd752bb5690c41085daa3f9adc7a8e4f0ce00a6f2cd`; rubric code `2424159119b5e779a614dfec48106164ccfc9627ed0940d08c507d37697b126c`. Exact16 rubric-text hashes và24 selected audio/script/request/take hashes nằm trong aiAnalysis.lessons[].bindings và audio[]; đã đối chiếu source/WAV thực.

### MG01-L4

Có transfer mới/truy hồi, nhưng r2/l1/l2 chỉ một fact; total audio/tokens thấp hơn L3. Chưa chứng minh progression đơn điệu. Giới thiệu/chuyển vai đúng facts; L4 không thay L1-L3 hay chứng nhận CEFR. Writer/reader/new partner và prompt dài cần hỗ trợ instruction; chưa timed rehearsal.

AI coverage: 8 Activities,4 objectives,5 lexical/IPA,3 audio và14 checklist cells. Findings: CR-B-AI-01, CR-B-AI-03, CR-B-AI-05, CR-B-AI-06. Actual human disposition/date/reference còn pending. Raw source `6ca970412ddb5ddd0a6e71eec7eb61ed7af068f0fdf834c507c1bddea58108c6`; rubric code `2424159119b5e779a614dfec48106164ccfc9627ed0940d08c507d37697b126c`. Exact16 rubric-text hashes và24 selected audio/script/request/take hashes nằm trong aiAnalysis.lessons[].bindings và audio[]; đã đối chiếu source/WAV thực.

### MG02-L1

Chuyển sang a/an,near/far,số lượng và chỉ-với-yêu-cầu. Tái dùng hello/tên, chưa assess lại I/you/from. An eraser theo âm, this/that số ít và two/three số nhiều; key/model khớp. Eraser/please vẫn support proposal. Cùng lúc a/an,near/far,count,/s,z/ và request khá dày cho entry; VI giải thích có, mức phù hợp thực chưa đo.

AI coverage: 8 Activities,4 objectives,6 lexical/IPA,3 audio và14 checklist cells. Findings: CR-B-AI-01, CR-B-AI-02, CR-B-AI-05, CR-B-AI-06. Actual human disposition/date/reference còn pending. Raw source `55838590b4dd367aee7608c81289cede1ae70f31cec8cc13906933a256c473bb`; rubric code `2424159119b5e779a614dfec48106164ccfc9627ed0940d08c507d37697b126c`. Exact16 rubric-text hashes và24 selected audio/script/request/take hashes nằm trong aiAnalysis.lessons[].bindings và audio[]; đã đối chiếu source/WAV thực.

### MG02-L2

Âm cuối /n,k,ɡ/,books/s/,pens-bags/z/ gắn lượng có nghĩa. Nói giảm near/far để tập âm, không tự chứng minh khó hơn. Two/three+plural và this/that nhất quán; r2 có thể giải singular bằng options mà không cần thẻ. Singular/plural/quantity cần scaffold VI. Số đếm cũng đủ giải phần lớn câu nghe, chưa tách evidence riêng khả năng nghe /s,z/.

AI coverage: 8 Activities,4 objectives,5 lexical/IPA,3 audio và14 checklist cells. Findings: CR-B-AI-01, CR-B-AI-02, CR-B-AI-05, CR-B-AI-06. Actual human disposition/date/reference còn pending. Raw source `46ab7eb3f512c5f9a4177b475bbb45283b2d107cf0693d3e8cb0b3cdc234eb2a`; rubric code `2424159119b5e779a614dfec48106164ccfc9627ed0940d08c507d37697b126c`. Exact16 rubric-text hashes và24 selected audio/script/request/take hashes nằm trong aiAnalysis.lessons[].bindings và audio[]; đã đối chiếu source/WAV thực.

### MG02-L3

Có ba-mục list, NOT requested, far và chỉ-với-yêu-cầu. Không tăng audio theo L2; chưa productive carryover I/you/from. Near bag→this,far book→that,three bags/two books và response models khớp facts. NOT/whole/both/requested là instruction burden; cần VI clarification không lộ đáp án. Chưa learner observation.

AI coverage: 8 Activities,4 objectives,5 lexical/IPA,3 audio và14 checklist cells. Findings: CR-B-AI-01, CR-B-AI-02, CR-B-AI-05, CR-B-AI-06. Actual human disposition/date/reference còn pending. Raw source `ea938e80fcb4ded511222b0e92c8737781a02a16e6e4039630b2c1b8a8db5db7`; rubric code `2424159119b5e779a614dfec48106164ccfc9627ed0940d08c507d37697b126c`. Exact16 rubric-text hashes và24 selected audio/script/request/take hashes nằm trong aiAnalysis.lessons[].bindings và audio[]; đã đối chiếu source/WAV thực.

### MG02-L4

Transfer quầy/thẻ mới kiểm quantity/object/near-far. Tokens bằng L3,audio ngắn hơn; chưa chứng minh nghe khó/dài hơn hay actual mastery. Nói this/pen,that/book,two bags; viết this/bag,three pens,one book đều nhất quán. Phải chấp nhận diễn đạt khác đúng ý. Prompt dài/tự kiểm cần xác minh comprehension; không dựa số Activity để suy thời lượng/độ khó.

AI coverage: 8 Activities,4 objectives,5 lexical/IPA,3 audio và14 checklist cells. Findings: CR-B-AI-01, CR-B-AI-02, CR-B-AI-05, CR-B-AI-06. Actual human disposition/date/reference còn pending. Raw source `bdf4db905a41d86efcde87f1dfa39e71e8ce9829dccec8936aa100a7df3b4631`; rubric code `2424159119b5e779a614dfec48106164ccfc9627ed0940d08c507d37697b126c`. Exact16 rubric-text hashes và24 selected audio/script/request/take hashes nằm trong aiAnalysis.lessons[].bindings và audio[]; đã đối chiếu source/WAV thực.

## 4. Năm yêu cầu reviewer

| Yêu cầu | AI kết luận có giới hạn |
| --- | --- |
| 1 | PARTIAL_NOT_MONOTONIC_OR_EMPIRICALLY_CALIBRATED: Giảm scaffold/tăng role binding có; nhiệm vụ reset across skills/phonology,L4 vẫn có single fact; chưa learner calibration. |
| 2 | WITHIN_UNIT_REUSE_PRESENT_CROSS_UNIT_PRODUCTION_GAP: Mỗi Unit tái dùng core patterns; MG02 chỉ giữ hello/names,chưa assess I/you/from. |
| 3 | RESTRAINED_CORE_TARGETS_MASTER_CEFR_PROVENANCE_UNKNOWN: 41 occurrences/11 inline expressions; eraser/support/meta-language cần disposition. Không DB/C2/CEFR/master ID giả. |
| 4 | COMPLEXITY_PARTIAL_MEANINGFUL_DURATION_GROWTH_NOT_DEMONSTRATED: Cả -45/-50dBFS edge-energy spans đều không tăng đơn điệu; MG02 chỉ24–26 whitespace tokens. Không bù bằng silence/replay. |
| 5 | NEW_FACT_TRANSFER_DESIGN_PRESENT_ACTUAL_TRANSFER_NOT_OBSERVED: Thẻ S/W riêng và full models hidden hỗ trợ transfer;48/64 tasks vẫn MC. Chưa learner interaction/performance/mastery; không CEFR claim. |

### Listening measurements,không dùng im lặng để suy tiến bộ

| Lesson | Script whitespace tokens | Full WAV total s | Edge-trimmed span -45dBFS s | -50dBFS s |
| --- | --- | --- | --- | --- |
| MG01-L1 | 25 | 18.562 | 14.920 | 14.980 |
| MG01-L2 | 28 | 19.417 | 15.680 | 15.840 |
| MG01-L3 | 36 | 24.152 | 20.400 | 20.540 |
| MG01-L4 | 33 | 22.501 | 18.860 | 18.900 |
| MG02-L1 | 25 | 22.343 | 18.660 | 18.700 |
| MG02-L2 | 24 | 22.782 | 19.100 | 19.140 |
| MG02-L3 | 26 | 22.093 | 18.420 | 18.440 |
| MG02-L4 | 26 | 21.858 | 18.160 | 18.220 |

Energy-window method20ms,first-to-last frame trên threshold; span vẫn chứa internal pauses. Đây là signal proxy,không phải phân đoạn speech/phonetic judgement. Hai threshold cho cùng xu hướng không tăng đều. Không kết luận có cố tình padding hoặc suy45 phút từ audio. MG01 có role/place binding tăng ở L3; MG02 request/pointing có tăng logic nhưng tokens/duration gần như phẳng.

## 5. Correction proposals,không thi hành

- **CR-B-AI-01 / P2** — Progression/listening chưa tăng đều hoặc được calibration. MG01 script whitespace tokens25→28→36→33; MG02=25→24→26→26. Actual audio18.56→19.42→24.15→22.50 và22.34→22.78→22.09→21.86s. Edge-energy trimmed spans cùng xu hướng. MG01-L4 r2/l1/l2 quay về một fact. Teacher chốt ladder số facts/role switches/retrieval support và đề xuất sửa task/script cuối Unit nếu cần tăng listening có nghĩa. Không chỉ tăng tốc,thêm im lặng,replay/câu vô ích.
- **CR-B-AI-02 / P2** — MG02 chưa assess lại I/you/from từ MG01. MG02 có hello/tên nhưng assessed response/facts đều vật/vị trí/lượng; không sản xuất/chọn đúng phần giới thiệu I am/from/You are. Đề xuất tích hợp một lượt giới thiệu/xác nhận vai vào thẻ nói/viết cuối MG02 bằng kiến thức cũ; không tăng grammar cấp cao hoặc số Activity cho đẹp. Teacher chốt exact wording/load.
- **CR-B-AI-03 / P2** — min_words cao hơn một số paraphrase ngắn do AI đề xuất. Bảy candidate responses ghép tên+from một mệnh đề/contractions thấp hơn minimum. Writer UI hiển thị minimum; chưa chứng minh runtime hard-reject, chưa human adoption các candidate. Teacher xét candidate; nếu chấp nhận, đề xuất hạ min_words đúng bảy task theo số token phù hợp, giữ đủ ý/rubric. Không ép lặp I am/filler. Không tuyên bố runtime FAIL.
- **CR-B-AI-04 / P2** — Còn Minh và hướng dẫn tên Việt trong international-v2. mg01-l1-l1 option C line248 còn Minh; MG01-L1 listenReason line42 và MG01-L2 listenReason line46 còn hướng dẫn tên Việt. Đề xuất Minh→Alex (tên quốc tế đã có), thu gọn hai câu hướng dẫn tên Việt theo mục tiêu hiện hành; teacher chốt. Không phải sai key.
- **CR-B-AI-05 / P2** — Thiếu master mapping/support disposition và scaffold cho thuật ngữ chỉ dẫn. 41 externalMasterEntryId=null; wordBankSlug chỉ inline authored bank. Eraser/please/numbers/task labels còn pending. Singular/plural/requested/quantity/identify/both/NOT chưa được gloss/mapping đầy đủ cho Pre-A1. Không bịa master ID/CEFR/C2. Với quyền/nguồn riêng, đối chiếu approved offline export hoặc công bố inline provenance. Đề xuất glossary VI cho instruction words,tách vocab assessed; human chốt six supports và loại editorial pending wording trước CONTENT_READY. Không đọc DB.
- **CR-B-AI-06 / P1** — Cần engineering kiểm chứng context evaluator. evaluation.service.ts:223-234 Beginner truyền prompt chung,rubricId/version,referenceText rỗng,requiredPhrases rỗng; không truyền role-card facts hay rubric text riêng. Registry có weights. Chưa gọi provider/runtime để kết luận behavior. Normalizer.ts:238 đặt payload.prompt=act.question/act.prompt,không thêm card facts; foundation-validation.ts:56-62 chỉ chuyển draft.activities vào snapshot. Source-chain này giải thích vì sao generic prompt không mang facts riêng của thẻ. Scope engineering riêng để kiểm chứng mock contract; nếu thiếu, cung cấp editor-only facts/criteria cho evaluator,giữ learner DTO redacted. Không sửa product/R1.2a lifecycle hay gọi provider ở đây. Static gap,không phải production failure đã tái hiện.

[Exact proposal scope/source hashes/candidate alternatives](beginner-pilot-correction-requests.md). P1 là static evaluator-context risk cần engineering scope/test riêng,không phải runtime/production failure đã tái hiện. Không sửa Lesson/audio/rubric/product. Source byte mới sẽ cần explicit source binding/requalification; script mới có thể cần Gate A audio QA riêng. Không gọi Azure hay thay Gate A lịch sử.

## 6. Bằng chứng còn thiếu và bước kế tiếp tối thiểu

- Một hồ sơ xác nhận thực tế của reviewer ràng buộc tám bundle ở bảng với đúng source/rubric/audio hashes và danh sách32/64/41/24 mục đã review,actual review date và mã evidence thật do owner lưu. Không đòi reviewer viết lại toàn bộ AI rationale; có thể dùng một biên bản/matrix chung chứa tám hàng version-bound và explicit per-item coverage/dispositions. Không tự chuyển global quote thành các hàng PASS.
- Reviewer/owner cung cấp disposition thực tế cho sáu correction proposals,sáu support items và tám demonstration/clarification outlines. AI đã soạn lý do/outline để hỗ trợ; human không bị gán là tác giả.
- Nếu cần sửa,approval scope riêng cho exact diff rồi review/requalification bản mới; không bỏ qua bằng chứng hoặc tự sửa source để theo global PASS.
- Bản bàn giao MG01-L1 cũ còn hash62 ký tự/missing receipt reference; có thể bổ sung thật hoặc một hồ sơ review version-bound đầy đủ cho tám Lesson giải quyết trực tiếp version coverage. Không hỏi lại kết luận global đã cung cấp.

AI matrix digest kỹ thuật: `cadae9db447cf140a931a0b1fad08461aa4bf6e8850f85fcb59d5259b9e312b0`. Quy tắc canonical nằm trong aiAnalysis.analysisMatrixHashRule; digest này không phải human evidenceReference/chữ ký. Có thể dùng để reviewer xác định ma trận AI được nhắc tới trong một xác nhận thực tế sau này.

## 7. Verification

PASS cho technical record integrity: counts/unique IDs,48 semantic keys,144 option analyses,7 alternative token bounds,112 checklist cells/16 rubric texts,source projection,29 protected files,9 frozen artifacts,24 actual WAV,3 A-evidence hashes,matching mandate hash/implementing lifecycle,three-file allowlist,9 local links và human/AI separation. Existing pure tests20 PASS,0 FAIL,0 skipped; mandate validate16 PASS. Original human fields và lịch sử cũ nguyên trạng; không có individual human PASS được tạo. Chỉ existing pure tests được chạy; không nhận typecheck/lint/build/runtime/DB PASS từ document work. Một oversized Windows command không khởi chạy (OS206); đã chuyển sang persistent Node,không tạo helper ngoài allowlist.

AI còn soạn8 clarification texts và8 outline proposals từ kiến thức đã có,đặt riêng trong aiAnalysis,không ghi vào source hoặc field teacher-approved. Tất cả teacherApproval=null. Matrix digest đã bao gồm các đề xuất này; đây không phải học liệu đã publish hoặc thời lượng quan sát được.

## 8. Autonomous AI reviewer supplement — current recommendations

authorType=AI;reviewerId=WORKLINGO-AI-REVIEWER-001;decisionType=AI_RECOMMENDATION;humanSigned=false. Reviewer ENG-REVIEWER-001/global quote và mọi human finalDecision/history/date/reference giữ nguyên. Đây là judgement của AI,không phải chữ ký hay lời giải trình của reviewer.

Tiêu chuẩn AI: chỉ REVISE khi có accepted exact source correction;PASS là source/design recommendation có giới hạn,không đóng Gate B. Không ép tám PASS theo global quote hoặc tám REVISE vì thiếu human evidence. Duration không đại diện toàn bộ độ khó;null master ID không tự là từ sai.

| Lesson | Exact bundle | AI verdict | Evidence | Findings | Required action |
| --- | --- | --- | --- | --- | --- |
| MG01-L1 | `9a0d43368585060fdc8832754453433e85e9d0fbc70c178533636fb48ad4b217` | REVISE | content/beginner/pilot/mg01-l1.lesson.txt:308; content/beginner/pilot/mg01-l1.lesson.txt:248 | CR-B-AI-03, CR-B-AI-04 | Separate approved content successor |
| MG01-L2 | `29def559327d00d41ba1b711cf214ca155c8f66c1fd5b9221a7c8653d3302503` | REVISE | content/beginner/pilot/mg01-l2.lesson.txt:330; content/beginner/pilot/mg01-l2.lesson.txt:348 | CR-B-AI-03 | Separate approved content successor |
| MG01-L3 | `86709e22b96a4889d84edfaa282927c564843713b1b80d267f0b2e54a0da0183` | REVISE | content/beginner/pilot/mg01-l3.lesson.txt:331; content/beginner/pilot/mg01-l3.lesson.txt:349 | CR-B-AI-03 | Separate approved content successor |
| MG01-L4 | `d7612fc457923abf24eda0cf84229e1cfecbad7701274291365a403f9c0c409e` | REVISE | content/beginner/pilot/mg01-l4.lesson.txt:330; content/beginner/pilot/mg01-l4.lesson.txt:348 | CR-B-AI-03 | Separate approved content successor |
| MG02-L1 | `9b8ee498c5a41a520d6abd43fe3b9b8bf159210b33f98e149d282e42dd583714` | REVISE | content/beginner/pilot/mg02-l1.lesson.txt:333; content/beginner/pilot/mg02-l1.lesson.txt:14 | CR-B-AI-03, CR-B-AI-05 | Separate approved content successor |
| MG02-L2 | `06db374a3a4289630fd11ef8bc9cb170ed285525b94c2965d6d91b2f031cf193` | PASS | content/beginner/pilot/mg02-l2.lesson.txt:181; content/beginner/pilot/mg02-l2.lesson.txt:204 | No confirmed mandatory source edit;shared risks deferred | Keep source;retain evidence limits |
| MG02-L3 | `3d24c725081ffb3de0bd11dac9973c37f17a2ac3fe5edf987a99005ad1b8d320` | REVISE | content/beginner/pilot/mg02-l3.lesson.txt:326 | CR-B-AI-03 | Separate approved content successor |
| MG02-L4 | `ff444130c663e250573d8c57b0cf4920f7c2f26611fec09894004c2771b79cf2` | REVISE | content/beginner/pilot/mg02-l4.lesson.txt:337; content/beginner/pilot/mg02-l4.lesson.txt:147 | CR-B-AI-02, CR-B-AI-03 | Separate approved content successor |

| Correction ID | AI disposition | Evidence/confirmation | Required mandate | Risk |
| --- | --- | --- | --- | --- |
| CR-B-AI-01 | DEFER_PENDING_EVIDENCE | NON_MONOTONIC_MEASUREMENTS_CONFIRMED_PEDAGOGICAL_DEFECT_NOT_CONFIRMED | EXISTING-GATE-C-PROGRESSION-EVIDENCE-REVIEW — MND-20261027-004 (scope review;not authorized) | P2 |
| CR-B-AI-02 | ACCEPT_FOR_CORRECTION | CONFIRMED_ALIGNMENT_GAP_WITH_REVIEWER_CROSS_UNIT_REUSE_REQUIREMENT | BEGINNER-OFFLINE-CONTENT-CORRECTIONS (not captured) | P2 |
| CR-B-AI-03 | ACCEPT_FOR_CORRECTION | CONFIRMED_MINIMUM_GUIDANCE_TENSION_WITH_AI_ACCEPTED_MEANING_PRESERVING_VARIANTS | BEGINNER-OFFLINE-CONTENT-CORRECTIONS (not captured) | P2 |
| CR-B-AI-04 | ACCEPT_FOR_CORRECTION | CONFIRMED_OWNER_STYLE_DICTIONARY_MISMATCH_NOT_WRONG_KEY | BEGINNER-OFFLINE-CONTENT-CORRECTIONS (not captured) | P2 |
| CR-B-AI-05 | ACCEPT_FOR_CORRECTION | LEARNER_FACING_EDITORIAL_MARKERS_CONFIRMED_OTHER_COMPONENTS_DEFERRED | BEGINNER-OFFLINE-CONTENT-CORRECTIONS (not captured) | P2 |
| CR-B-AI-06 | DEFER_PENDING_EVIDENCE | STATIC_CONTEXT_OMISSION_OBSERVED_RUNTIME_GRADING_FAILURE_NOT_REPRODUCED | BEGINNER-EVALUATOR-CONTEXT-VERIFICATION (not captured) | P1 |

**Kết quả AI: 1 PASS,7 REVISE,0 REJECT.** Dispositions:4 ACCEPT_FOR_CORRECTION,2 DEFER_PENDING_EVIDENCE. Có thêm hai phần master-provenance/gloss của CR05 deferred,không phải hai proposal độc lập. Tất cả8 recommendations có source/hash evidence;24 audio vẫn không có independent phonetic judgement mới,không tự biến waveform metrics thành pronunciation PASS.

### AI recommendation MG01-L1 — REVISE

minimum10 cao hơn candidate đủ ý9 từ;distractor Minh chưa đồng bộ tên đã chọn. I/you/from đúng nghĩa;ba key đọc và ba key nghe khớp evidence;hai thẻ S/W khác nhau tạo transfer.

Confidence: source/hash HIGH,pedagogical learner impact MODERATE;no new independent phonetic assurance. Source/rubric/audio bindings,citations,coverage,findings/severity và limitations đầy đủ trong aiAnalysis.autonomousReviewRounds[0].lessonRecommendations.

### AI recommendation MG01-L2 — REVISE

Hai task S/W minimum7 so với candidate đủ ý6 từ;không cần xóa hướng dẫn tên Việt đúng kiến thức. Phân biệt tên/tên chữ và đổi người/nơi có mục đích;Ed/E,D và Jo/J,O/Joe nhất quán;model giữ facts.

Confidence: source/hash HIGH,pedagogical learner impact MODERATE;no new independent phonetic assurance. Source/rubric/audio bindings,citations,coverage,findings/severity và limitations đầy đủ trong aiAnalysis.autonomousReviewRounds[0].lessonRecommendations.

### AI recommendation MG01-L3 — REVISE

Hai response có thể giữ đủ vai/facts bằng9 và8 từ nhưng minimum10 và9;đề xuất sửa constraint,không sửa audio đã có căn cứ vai nghĩa. Có ghép thẻ,đảo vai và hai địa danh;thẻ sản xuất mới,đáp án/rubric đúng facts,không cần rewrite audio vì chỉ nhìn độ dài.

Confidence: source/hash HIGH,pedagogical learner impact MODERATE;no new independent phonetic assurance. Source/rubric/audio bindings,citations,coverage,findings/severity và limitations đầy đủ trong aiAnalysis.autonomousReviewRounds[0].lessonRecommendations.

### AI recommendation MG01-L4 — REVISE

Response S/W đủ ý có thể8 và9 từ thay minimum9 và10;không lấy audio ngắn hơn L3 làm bằng chứng bắt buộc rewrite. Unit check có role/card mới,không tự chứng nhận CEFR;keys và model đúng. Các mục một fact không tự là lỗi nếu phục vụ truy hồi.

Confidence: source/hash HIGH,pedagogical learner impact MODERATE;no new independent phonetic assurance. Source/rubric/audio bindings,citations,coverage,findings/severity và limitations đầy đủ trong aiAnalysis.autonomousReviewRounds[0].lessonRecommendations.

### AI recommendation MG02-L1 — REVISE

Minimum10 so với candidate That's đủ ý9 từ;objective/guide/meaning còn copy biên tập cần giáo viên duyệt/đang đề xuất trong phần learner-facing. A/an theo âm,near/far,plural và chỉ-với-yêu-cầu đều nhất quán;eraser/please phù hợp tác vụ ở cấp AI.

Confidence: source/hash HIGH,pedagogical learner impact MODERATE;no new independent phonetic assurance. Source/rubric/audio bindings,citations,coverage,findings/severity và limitations đầy đủ trong aiAnalysis.autonomousReviewRounds[0].lessonRecommendations.

### AI recommendation MG02-L2 — PASS

Không xác nhận source defect bắt buộc sửa. Option cue ở r2 hợp với formative grammar practice;không dùng riêng nó làm proof đọc độc lập. Thiếu master link/calibration và static evaluator risk được giữ là hạn chế riêng,không ép REVISE bài này. Bài phonology/formative rõ mục tiêu âm cuối-số lượng;48-case source matrix của toàn pilot không có sai key tại sáu task này. Response lịch sự7 từ đạt minimum6,thẻ viết riêng và rubric xét nghĩa. Không bắt bài này dài hơn chỉ để tăng số giây.

Confidence: source/hash HIGH,pedagogical learner impact MODERATE;no new independent phonetic assurance. Source/rubric/audio bindings,citations,coverage,findings/severity và limitations đầy đủ trong aiAnalysis.autonomousReviewRounds[0].lessonRecommendations.

### AI recommendation MG02-L3 — REVISE

Candidate This is a book.That's a bag.Two pens giữ đủ near/far/request với9 từ,dưới minimum10. Chỉ sửa constraint/rubric variant;không buộc rewrite nội dung tích hợp đang hợp lý. Ba-mục list,NOT requested,near/far và phân biệt vật chỉ/vật cần lấy tạo tích hợp có nghĩa;thẻ S/W riêng,keys đúng,không bắt buộc thêm intro vào mọi Lesson.

Confidence: source/hash HIGH,pedagogical learner impact MODERATE;no new independent phonetic assurance. Source/rubric/audio bindings,citations,coverage,findings/severity và limitations đầy đủ trong aiAnalysis.autonomousReviewRounds[0].lessonRecommendations.

### AI recommendation MG02-L4 — REVISE

Candidate That's đủ ý9 từ dưới minimum10;writing checkpoint chưa tái dùng I/you/from theo yêu cầu cross-unit reuse,đề xuất chỉ sửa một writing task. Transfer quầy/thẻ mới giữ object/quantity/position;keys/model đúng. Điểm kết Unit thích hợp cho một task tích hợp lại kiến thức MG01.

Confidence: source/hash HIGH,pedagogical learner impact MODERATE;no new independent phonetic assurance. Source/rubric/audio bindings,citations,coverage,findings/severity và limitations đầy đủ trong aiAnalysis.autonomousReviewRounds[0].lessonRecommendations.

### Những scope được chấp nhận ở cấp AI

- CR02: chỉ MG02-L4 writing checkpoint thêm reuse I am/from,không bắt mọi task MG02 sửa.
- CR03:10 min_words replacements (bảy cũ+ba That's mới),ba MG02 speaking rubric-text clarifications. MG02-L2 không có defect minimum đã xác nhận.
- CR04: chỉ Minh→Alex ở distractor;không bắt xóa hướng dẫn tên Việt đúng kiến thức.
- CR05: chỉ bốn visible pending-editorial fields MG02-L1;provenance/master mapping và broad English glossary vẫn deferred.
- CR01: measurements có thật,nhưng blanket rewrite theo monotonic duration chưa có đủ căn cứ.
- CR06:P1 static risk,chưa runtime failure;verification mock-only riêng trước mọi evaluator fix.

Hai required mandate proposals chỉ được mô tả trong result packet,mandateId=null;chưa tạo/duyệt record mới. Offline content-corrections successor dự kiến bảy source TXT,hai pure-test files và hai successor qualification artifacts;engineering verification dự kiến một mocked unit-test file và một report. Exact allowlist/baseline/hash sẽ phải capture và duyệt trước thi hành. Không sửa acceptance để thay qualified human bằng AI;Gate B giữ implementing,CONTENT_READY=false.

AI verification PASS:20 existing pure tests,0 FAIL/skipped;one direct-node in-memory simulation PASS for22 hypothetical field changes,10 short variants and8/64/32/41/24 inventories;actual source/WAV files unchanged. Hash checks29 protected files/9 frozen artifacts/24 WAV/3 A-evidence files PASS;original human/all prior AI records unchanged,Markdown append-only,only3 allowed files,matching approval and mandate validate16 PASS. First pnpm-shim simulation without result was not counted;two-line probe proved multiline truncation,direct node run returned concrete assertions. No runtime/provider/DB/phonetic/Gate C claim.

Technical AI decision digest: `22aae301943ee84f0670d4d20df74bd83e997a14b6bec83067e04156b8ce65bb`. This is not a human signature,evidenceReference or approved mandate proposal hash. Old AI matrix/human global statement/history are retained;future correction/evaluator verification requires separate captured scopes/approvals.
