# Intermediate B1 pilot — bản đọc để review

Ngày: 16/10/2026. **Dự thảo AI-assisted, đã review AI và sửa; CEFR vẫn là mục tiêu tạm thời, chưa import/publish.**

Nguồn chuẩn của bản soạn: [JSON](2026-10-16-intermediate-b1-pilot.json). Hash SHA-256: `2a84d48c44dab16b380f452d31b1580600706e433dd0a8145f696902424a28d0`.
[Rubric và giới hạn](../../mandate/reports/2026-10-16-intermediate-b1-content-review.md).

Tài liệu này chứa đáp án và model response riêng cho người review; không phải nội dung learner DTO. Số dòng context dưới đây dùng cho evidenceLines trong JSON. Reviewer: Codex (AI), theo lựa chọn “AI” của người dùng. Không có xác nhận chuyên gia con người. Nhãn cognition là nhận định biên tập; thời gian và độ khó chưa biết. Task Speaking transfer chưa được snapshot hiện tại hỗ trợ; audio mới là script.

## 1. Handle a delayed delivery

Slug: `b1-handle-delivery-change`. Target B1 candidate; trạng thái AI-reviewed-provisional.

Mục tiêu:

- **identify-constraints** (reading, listening): Identify the changed arrangement, its reason and a condition on the available options.
- **explain-change** (speaking, writing): Explain a problem and its practical effect to a colleague or customer.
- **choose-next-action** (reading, listening, speaking, writing): Select a feasible next action, give a brief reason and ask for confirmation without promising an unsupported outcome.

Tiền đề đề xuất: a2-state-dates-and-quantities, a2-explain-simple-reason, a2-request-confirmation. Chưa ánh xạ sang objective IDs đã tồn tại.

### Language Blocks

| Phrase | Nghĩa | Ví dụ không mang đáp án context |
| --- | --- | --- |
| due to | do, vì | The workshop is closed due to repairs. |
| Could you confirm ...? | Bạn có thể xác nhận ... không? | Could you confirm the number of visitors? |
| provided that | với điều kiện là | We can use the room provided that we leave it tidy. |
| instead of | thay vì | Please send a message instead of calling during the presentation. |
| keep you informed | cập nhật thông tin cho bạn | I will keep you informed about the new opening hours. |

### Activate

Before opening the new contexts, recall a phrase from prior practice for explaining a change and one for requesting confirmation. Use each in a new sentence. If you have not studied these before, mark first exposure; this task then introduces language and is not evidence of spaced retrieval.

### Context: harbor-email (reading)

**1.** From: Mina, Harbor Office Supplies | To: Lee, Greenway Studio | Subject: Chair delivery

**2.** Thank you for ordering twelve chairs for your new office. We planned to deliver all of them on Monday, but a damaged part has delayed the final checks. The complete order can now arrive on Wednesday afternoon.

**3.** If you need some chairs sooner, we can send eight on Monday and the remaining four on Thursday. There is no extra delivery charge for this option. However, we need your reply by 3 p.m. today so that we can reserve space on the first truck.

**4.** The smaller delivery would let part of your team start work, but it would not provide enough seats for everyone. Please do not arrange your full team meeting until all twelve chairs have arrived.

**5.** Your old chairs are due to be collected on Tuesday morning. If you choose the Wednesday delivery, we can ask the collection company to come later, but that company must confirm the change. We cannot promise a new collection time yet.

**6.** Please tell us which delivery option you prefer and whether you would like us to contact the collection company.

#### 1. Why has Mina written this email?

`delivery-purpose` · comprehension

A. To confirm that the complete order is already on the truck.

B. To ask Lee to choose how to handle a changed delivery.

C. To ask Lee to pay for repairing damaged chairs.

D. To cancel the order and arrange a collection.

**Đáp án: B.** Căn cứ: harbor-email, dòng 2, 3, 6.

The original arrangement has changed and Mina asks Lee to choose an option.

- A sai: The email offers future deliveries; it does not say loading is complete.
- C sai: The part caused a delay, but no repair payment is requested.
- D sai: The order remains available; collection concerns old chairs.

#### 2. If Lee chooses the split delivery, when will the final four chairs arrive?

`delivery-split` · comprehension

A. Monday.

B. Tuesday morning.

C. Wednesday afternoon.

D. Thursday.

**Đáp án: D.** Căn cứ: harbor-email, dòng 3.

The split option sends eight on Monday and four on Thursday.

- A sai: Monday is for the first eight chairs.
- B sai: Tuesday is the planned old-chair collection.
- C sai: Wednesday applies to the complete-order option.

#### 3. What must Lee do to get eight chairs on Monday?

`delivery-condition` · application

A. Reply by 3 p.m. today to reserve truck space.

B. Reply today and pay the charge for the second delivery.

C. Confirm that the old chairs will be collected on Tuesday.

D. Wait for the collection company to approve a later visit.

**Đáp án: A.** Căn cứ: harbor-email, dòng 3.

A reply before the stated deadline is the condition for reserving space.

- B sai: A timely reply is required, but no extra delivery charge is due.
- C sai: Tuesday collection is not the condition for booking the split delivery.
- D sai: The collection company cannot reserve Harbor's first truck.

#### 4. What is one disadvantage of the split delivery compared with the complete Wednesday delivery?

`delivery-comparison` · application

A. The final four chairs require an extra delivery charge.

B. The first eight arrive after the old-chair collection.

C. The full set arrives one day after Wednesday.

D. The collection company must delay its visit until Thursday.

**Đáp án: C.** Căn cứ: harbor-email, dòng 2, 3, 4.

The final four arrive Thursday in the split option, one day after the complete Wednesday delivery.

- A sai: The split option explicitly has no extra delivery charge.
- B sai: The first eight arrive Monday, before Tuesday's collection.
- D sai: No Thursday collection condition is stated.

#### 5. What remains uncertain if Lee chooses the Wednesday delivery?

`delivery-uncertainty` · comprehension

A. Whether the old chairs are scheduled for Tuesday collection.

B. Whether the collection company can change its visit.

C. Whether the split delivery sends four chairs on Thursday.

D. Whether the full order is offered for Wednesday afternoon.

**Đáp án: B.** Căn cứ: harbor-email, dòng 5.

Harbor can ask for a later collection, but the collection company has not agreed.

- A sai: Tuesday is already the scheduled collection day.
- C sai: Thursday is stated in the split option.
- D sai: Wednesday afternoon is the stated complete-order offer.

#### 6. Lee needs all twelve chairs for a Wednesday evening meeting and wants to keep the old chairs until the new ones arrive. Which reply best fits the email?

`delivery-next-action` · application

A. Choose the split delivery and confirm all chairs will be there on Monday.

B. Ask Harbor to cancel the old-chair collection without checking with anyone.

C. Choose Wednesday and tell staff that the collection change is guaranteed.

D. Choose Wednesday and ask Harbor to request a later collection, awaiting confirmation.

**Đáp án: D.** Căn cứ: harbor-email, dòng 2, 3, 5.

Wednesday supplies all twelve; a changed collection must still be confirmed.

- A sai: The split option is incomplete until Thursday.
- B sai: Harbor can request a change but cannot confirm it alone.
- C sai: The email explicitly withholds that guarantee.

### Context: cedar-call (listening)

**1.** Sam: Hi Nora, it is Sam from Cedar Packaging. I am calling about the paper cups for your café. Our delivery van has broken down, so the boxes will not arrive this evening as planned.

**2.** Nora: We have enough cups for tomorrow morning, but there is a school event at two in the afternoon. We will need more before that starts.

**3.** Sam: A courier can bring six boxes by eleven tomorrow. The other four boxes would come on our regular van the following day. The courier costs twenty pounds.

**4.** Nora: That is more than we planned to spend. Could I collect the six boxes myself instead?

**5.** Sam: Yes. They will be ready at our depot from eight thirty. Collection is free, but please bring the order number. The depot closes for staff training at ten.

**6.** Nora: I have a colleague who can go there at nine. Please hold the boxes while I check with him. Do not book the courier yet.

**7.** Sam: Of course. Please call me back before four today. If I do not hear from you, I will leave the whole order for the regular van; I will not book the courier automatically.

**8.** Nora: Thanks. I will confirm this afternoon. The remaining four boxes can wait until the following day.

#### 1. Why does Sam call Nora?

`cups-purpose` · comprehension

A. A broken van has changed the cup delivery.

B. The café has ordered the wrong cup size.

C. The courier has delivered too many boxes.

D. The school event has been cancelled.

**Đáp án: A.** Căn cứ: cedar-call, dòng 1.

Sam explains that the van failure prevents the planned arrival.

- B sai: No cup-size error is discussed.
- C sai: The courier is only an option.
- D sai: The event is still planned.

#### 2. When does Nora need the extra cups?

`cups-needed` · comprehension

A. Before the café opens tomorrow morning.

B. Before the depot training starts today.

C. Before the school event tomorrow afternoon.

D. Before the regular van arrives this evening.

**Đáp án: C.** Căn cứ: cedar-call, dòng 2.

Existing stock covers the morning; the event at two requires more.

- A sai: She already has enough for the morning.
- B sai: Depot training is tomorrow and is not the café's demand.
- D sai: The regular delivery this evening is no longer possible.

#### 3. What would the courier option provide?

`cups-courier` · comprehension

A. All ten boxes this evening for twenty pounds.

B. Six boxes by eleven tomorrow for twenty pounds.

C. Four boxes tomorrow morning at no extra charge.

D. Six boxes the following day with the regular van.

**Đáp án: B.** Căn cứ: cedar-call, dòng 3.

Sam offers six boxes by eleven with a twenty-pound courier charge.

- A sai: Neither the quantity nor time matches.
- C sai: The remaining four are on the regular van, not this courier.
- D sai: The first six could come tomorrow, not the following day.

#### 4. Which collection plan meets the depot's conditions?

`cups-collection` · application

A. Arrive at ten thirty with the order number.

B. Arrive at nine and pay the courier charge.

C. Arrive at eight before the boxes are ready.

D. Arrive at nine with the order number.

**Đáp án: D.** Căn cứ: cedar-call, dòng 5, 6.

Nine is inside the stated collection window and the order number is required.

- A sai: The depot closes at ten.
- B sai: Collection is free; a courier payment is unnecessary.
- C sai: The boxes are not ready until eight thirty.

#### 5. Why does Nora ask Sam not to book the courier yet?

`cups-decision` · comprehension

A. She may arrange free collection, but she must check with her colleague.

B. She is checking whether tomorrow's school event can use fewer than six boxes.

C. She wants to wait until the regular van can deliver all ten boxes.

D. She needs Sam to decide which colleague will collect the boxes for her.

**Đáp án: A.** Căn cứ: cedar-call, dòng 4, 6.

She is checking the cheaper collection option before committing.

- B sai: She does not propose reducing the number of boxes needed for the event.
- C sai: The regular van is too late for the event, and she is considering collection.
- D sai: Nora is responsible for checking with her colleague; Sam is holding the boxes.

#### 6. What will Sam do if Nora does not call back before four?

`cups-no-reply` · application

A. Book the courier and charge Nora twenty pounds.

B. Send only four boxes with the courier tomorrow.

C. Keep the full order for the regular van.

D. Hold six boxes indefinitely at the depot.

**Đáp án: C.** Căn cứ: cedar-call, dòng 7.

Sam states the fallback and says a courier will not be booked automatically.

- A sai: He explicitly rules out automatic booking.
- B sai: The four-box courier option was never offered.
- D sai: The fallback is the regular van, not indefinite collection.

### Context: printer-task (speaking-task)

**1.** You coordinate an office move. The hired printer will arrive on Friday instead of Thursday. Staff need to print visitor badges on Thursday morning. A nearby branch can lend a printer, but it cannot deliver it. A colleague may be able to collect it; this is not confirmed.

**2.** Leave that colleague a voice message. Explain the problem and its effect, suggest a workable option and ask whether they can collect the printer. Do not claim collection is already arranged.

#### Nhiệm vụ speaking: printer-voice-message

Leave a brief voice message for the colleague using the task card. Explain the effect on Thursday's badges, propose collection from the branch and ask whether the colleague can do it.

Ý nghĩa cần thể hiện:

- Friday arrival conflicts with Thursday badges
- branch loan needs collection
- colleague availability unknown
- explicit confirmation request

**Model riêng cho reviewer — chấp nhận cách diễn đạt tương đương:**

> Hi Alex. The hired printer will not arrive until Friday, but we need badges on Thursday morning. The nearby branch can lend us one, although they cannot deliver it. Could you collect it and let me know whether that is possible? I will wait for your confirmation before arranging it.

Rubric: task-achievement, reason-and-action, coherence, language-control, intelligibility.

Khả năng runtime: manual-review-only; current snapshot supports shadowing.

### Context: uniform-task (writing-task)

**1.** You ordered uniforms for a community event on Saturday. Twenty shirts are ready, but five smaller shirts will not arrive until Monday. The supplier can replace those five with a different colour on Friday at no extra cost. The event organiser must approve that colour before you accept.

**2.** Write the organiser an email explaining the change, recommending a next step with a reason and asking for a decision by tomorrow noon. Do not promise a refund or a delivery that the supplier has not offered.

#### Nhiệm vụ writing: uniform-email

Write an email to the organiser using the task card. Suggested length: 80–110 words; this is an authoring target, not a CEFR definition or automatic pass rule.

Ý nghĩa cần thể hiện:

- 20 ready and five small delayed beyond Saturday
- alternative colour Friday at no extra cost
- recommendation with reason
- organiser approval by tomorrow noon
- no unsupported promise

**Model riêng cho reviewer — chấp nhận cách diễn đạt tương đương:**

> Hello Priya, I have an update about the uniforms for Saturday's event. Twenty shirts are ready, but the five smaller shirts will arrive on Monday, after the event. The supplier can send five shirts in a different colour on Friday without an extra charge. I suggest accepting the different colour so that everyone has a shirt, provided that you are happy with it. Could you confirm your decision by tomorrow noon? I will wait for your approval before telling the supplier. Best wishes, Kim

Rubric: task-achievement, reason-and-action, coherence, language-control.

Khả năng runtime: existing short_text can separate learner task and private model; suggested length remains editorial and current scoring is unchanged.


## 2. Reschedule a team arrangement

Slug: `b1-reschedule-team-arrangement`. Target B1 candidate; trạng thái AI-reviewed-provisional.

Mục tiêu:

- **identify-constraints** (reading, listening): Identify the revised time or location and distinguish a confirmed arrangement from a proposal.
- **explain-change** (speaking, writing): Explain a scheduling problem and its consequence using connected, factual language.
- **choose-next-action** (reading, listening, speaking, writing): Choose an option that meets stated constraints and ask the relevant person to confirm it.

Tiền đề đề xuất: a2-state-dates-and-quantities, a2-explain-simple-reason, a2-request-confirmation. Chưa ánh xạ sang objective IDs đã tồn tại.

### Language Blocks

| Phrase | Nghĩa | Ví dụ không mang đáp án context |
| --- | --- | --- |
| bring forward | chuyển lên sớm hơn | Could we bring the equipment check forward? |
| be available | rảnh, có thể tham gia | I am available after lunch. |
| as long as | miễn là | We can share the desk as long as both screens work. |
| let me know | cho tôi biết | Please let me know whether you received the file. |
| otherwise | nếu không thì | Save a copy now; otherwise, you may lose your notes. |

### Activate

Before opening the contexts, recall how you asked for confirmation in prior practice. Write a new request about a time and a sentence explaining a reason. If no relevant prior practice exists, mark first exposure; do not call this spaced retrieval.

### Context: training-email (reading)

**1.** From: Rosa, team coordinator | Subject: Thursday's safety workshop

**2.** The trainer's return journey has changed, so Thursday's safety workshop cannot start at 2 p.m. as planned. She can lead it at 10 a.m. on Thursday or at 2 p.m. on Friday. Both sessions would last one hour.

**3.** The workshop must take place in person because everyone needs to practise with the equipment. Joining by video is therefore not an option. The room on the second floor is available at either proposed time.

**4.** Three members of the sales team have customer visits throughout Thursday morning. They could attend on Friday, but their manager needs to approve a change to their normal duties first.

**5.** Please reply by noon on Tuesday with your availability. I will then ask the manager about Friday and confirm one session for the whole group. Do not change your calendars until you receive that confirmation.

**6.** If neither time works for you, tell me which duty you cannot move. Please do not arrange a separate session with the trainer; I need to keep the whole group's requirements together.

#### 1. What does Rosa need from the team first?

`workshop-purpose` · comprehension

A. An individual booking made directly with the trainer.

B. Confirmation that everyone can attend a video workshop.

C. Approval of a session time already chosen by Rosa.

D. A reply saying when they are available.

**Đáp án: D.** Căn cứ: training-email, dòng 5.

Rosa needs availability before choosing and confirming one session.

- A sai: Rosa asks the team not to arrange separate sessions.
- B sai: Video attendance is not possible.
- C sai: Rosa has not selected a final time.

#### 2. Why can the team not attend by video?

`workshop-online` · comprehension

A. The trainer is travelling and cannot join by video.

B. They need to practise with equipment in person.

C. The manager wants to discuss Friday's changed duties first.

D. The second-floor room is booked for an online meeting.

**Đáp án: B.** Căn cứ: training-email, dòng 3.

Physical equipment practice is the stated reason.

- A sai: Travel changed the time, but physical practice explains the video restriction.
- C sai: Manager approval concerns the sales team's availability on Friday.
- D sai: The room is available; the activity itself requires in-person practice.

#### 3. What prevents three sales colleagues from attending on Thursday morning?

`workshop-constraint` · comprehension

A. They have customer visits.

B. The workshop room is unavailable.

C. Their manager has refused permission.

D. They are travelling with the trainer.

**Đáp án: A.** Căn cứ: training-email, dòng 4.

Their customer visits occupy Thursday morning.

- B sai: The room is available at both times.
- C sai: Approval for Friday is pending, not refused.
- D sai: The trainer's travel is a different issue.

#### 4. Why is Friday at 2 p.m. still a proposal?

`workshop-pending` · comprehension

A. The trainer still needs to offer a time on Friday.

B. The room is available Thursday but has not been checked Friday.

C. The sales manager still needs to approve changed duties.

D. Rosa still needs to decide whether practice can happen by video.

**Đáp án: C.** Căn cứ: training-email, dòng 2, 3, 4, 5.

The time and room are possible, but the sales colleagues' duties need approval.

- A sai: Friday at two has already been offered.
- B sai: The room is available at either proposed time.
- D sai: In-person practice has already ruled out video.

#### 5. You cannot move a duty at either proposed time. What should you do?

`workshop-next-action` · application

A. Book a private session with the trainer.

B. Change your calendar to Friday anyway.

C. Ask a colleague to mark you present.

D. Tell Rosa which duty cannot be moved.

**Đáp án: D.** Căn cứ: training-email, dòng 6.

Rosa asks for the unmovable duty so she can coordinate the group.

- A sai: She explicitly rules out separate sessions.
- B sai: Friday is not yet confirmed.
- C sai: The email does not suggest attendance by proxy.

#### 6. Which message accurately describes the workshop's current status?

`workshop-calendar` · application

A. The Thursday ten o'clock session is confirmed; everyone should update their calendar now.

B. Two times are being considered; Rosa will confirm after checking replies and approval.

C. The Friday two o'clock session is confirmed; only the room booking is still uncertain.

D. Each employee should choose a session and confirm a private booking with the trainer.

**Đáp án: B.** Căn cứ: training-email, dòng 2, 4, 5, 6.

There are two proposals and a clear confirmation step.

- A sai: Thursday is a proposal and Rosa says to wait before updating calendars.
- C sai: Friday is not confirmed; the room is available and duty approval is pending.
- D sai: Rosa asks for availability to coordinate one session, not private bookings.

### Context: handover-call (listening)

**1.** Evan: Hi Lina. I am checking our project handover for Monday. We booked the South meeting room at eleven, but maintenance has closed it until the end of the day.

**2.** Lina: Thanks for telling me. Our designer can join only after one, and our finance colleague has to leave at three. Could we use a different room at two?

**3.** Evan: The North room is free at two. It has space for six people, but there is no video equipment. How many people are coming from your office?

**4.** Lina: Four of us will attend in person, and you said there would be two people from your team. Nobody needs to join online.

**5.** Evan: Good. I can hold the North room until five today. Could you confirm with your designer before then? I will send the new invitation only when you agree.

**6.** Lina: Yes. Please include the equipment checklist with the invitation. The designer wants to review it before the meeting.

**7.** Evan: I will. If the designer cannot attend at two, we will keep Monday for a short phone update and arrange the in-person handover later. We should not call the phone update a completed handover.

**8.** Lina: Agreed. I will message you by four thirty, so you have time to release the room if necessary.

#### 1. What has made the original room unavailable?

`handover-problem` · comprehension

A. It is being used for another client's interview.

B. It is too small for four people.

C. Maintenance has closed it for the day.

D. Its video link has already been booked.

**Đáp án: C.** Căn cứ: handover-call, dòng 1.

Evan says maintenance has closed the South room.

- A sai: No other interview is mentioned.
- B sai: The group size is discussed for the alternative room.
- D sai: No video booking causes the closure.

#### 2. Why is two o'clock a possible meeting time?

`handover-window` · application

A. It is after the designer can join and before the finance colleague leaves.

B. It gives the designer time to leave before the finance colleague arrives at three.

C. It keeps the original booking and avoids asking Lina to confirm a changed time.

D. It allows the designer to attend before one and the finance colleague after three.

**Đáp án: A.** Căn cứ: handover-call, dòng 2.

Two falls between the designer's availability after one and the finance colleague's departure at three.

- B sai: Three is the finance colleague's departure, not arrival time.
- C sai: The original booking was eleven and a new confirmation is still required.
- D sai: The availability limits are reversed.

#### 3. Why could the North room work for the group?

`handover-room` · application

A. It seats the four client visitors, with Evan's team joining by video.

B. It can hold everyone, with the finance colleague attending online from another room.

C. Only four people will attend, because Evan's team will join by phone.

D. It fits all six attendees and nobody needs a video link.

**Đáp án: D.** Căn cứ: handover-call, dòng 3, 4.

Four client staff plus two from Evan's team fit the room; online access is unnecessary.

- A sai: Evan's two team members are attending in person, and video equipment is unavailable.
- B sai: Nobody needs to join online; all six plan to attend in person.
- C sai: Lina counts four client staff plus two from Evan's team.

#### 4. When will Evan send the revised invitation?

`handover-invite` · comprehension

A. As soon as the maintenance work begins.

B. After Lina confirms the designer can attend.

C. Only after the room hold expires at five.

D. After the finance colleague leaves the meeting.

**Đáp án: B.** Căn cứ: handover-call, dòng 5.

Evan waits for Lina's agreement before sending it.

- A sai: Maintenance has already changed the arrangement.
- C sai: The hold deadline is the limit for confirming, not a reason to wait.
- D sai: The invitation precedes the meeting.

#### 5. What does Lina ask Evan to include with the invitation?

`handover-attachment` · comprehension

A. A list of all six attendees.

B. An updated room booking form.

C. An equipment checklist.

D. Notes from Monday's phone update.

**Đáp án: C.** Căn cứ: handover-call, dòng 6.

The designer wants to review the equipment checklist.

- A sai: Lina mentions attendance, but does not request an attendee list.
- B sai: The room hold is discussed, but no form is requested.
- D sai: The fallback phone update has not happened and is not the requested attachment.

#### 6. If the designer cannot attend at two, what have they agreed?

`handover-fallback` · application

A. Have a short phone update on Monday and arrange the in-person handover later.

B. Hold a phone update on Monday and record the in-person handover as already completed.

C. Keep Monday at eleven in the South room and ask the designer to join online.

D. Use the North room at two without the designer and cancel any later handover.

**Đáp án: A.** Căn cứ: handover-call, dòng 7, 8.

The fallback is a limited phone update with the real handover still to be arranged.

- B sai: Evan explicitly says the phone update is not a completed handover.
- C sai: The South room is closed and the designer cannot join until after one.
- D sai: They agreed to a limited phone update and later handover, not this alternative.

### Context: interview-task (speaking-task)

**1.** You help organise a volunteer interview on Wednesday. The interviewer is unavailable at noon but can meet at 9 a.m. or 4 p.m. The applicant works until 3 p.m. and can travel to the office in thirty minutes. The office closes at 5 p.m.; the interview lasts thirty minutes.

**2.** Leave the applicant a voice message recommending one feasible slot, explain why it fits and ask them to confirm. The interviewer has offered times but no appointment has been confirmed.

#### Nhiệm vụ speaking: interview-voice-message

Leave a voice message to the applicant. Recommend a feasible slot with a reason and request confirmation.

Ý nghĩa cần thể hiện:

- Wednesday four proposed
- work until three plus travel
- finish before five
- confirmation request
- proposal not guaranteed booking

**Model riêng cho reviewer — chấp nhận cách diễn đạt tương đương:**

> Hello Jamie. The interviewer cannot meet at noon on Wednesday. She has offered nine in the morning or four in the afternoon. Since you work until three and need thirty minutes to travel, I suggest four. The interview would finish before the office closes. Could you confirm whether that works for you? I will book it after you reply.

Rubric: task-achievement, reason-and-action, coherence, language-control, intelligibility.

Khả năng runtime: manual-review-only; current snapshot supports shadowing.

### Context: site-visit-task (writing-task)

**1.** You coordinate a Friday site visit for a small team. The guide can now meet only at 9 a.m. or 3 p.m. The team's shared bus cannot arrive before 10 a.m. and must leave the site at 4 p.m. The visit lasts forty-five minutes.

**2.** Write a factual email proposing a feasible time, explaining why the other option does not work, asking the guide to confirm and requesting the meeting point. Reply requested by Wednesday at 5 p.m. Do not say the new booking is already confirmed.

#### Nhiệm vụ writing: site-visit-email

Write the guide an email using the task card. Suggested length: 80–110 words; length alone does not establish proficiency.

Ý nghĩa cần thể hiện:

- Friday three proposed
- nine impossible because bus arrival
- 45-minute visit finishes before four
- confirmation and meeting point
- reply Wednesday five

**Model riêng cho reviewer — chấp nhận cách diễn đạt tương đương:**

> Hello Morgan, Thank you for letting us know about the change to Friday's site visit. I suggest starting at three in the afternoon. Our bus cannot reach the site before ten, so the nine o'clock option is not possible. A forty-five-minute visit at three would finish before our bus leaves at four. Could you confirm whether three is still available and tell us where the group should meet you? Please reply by five on Wednesday so that I can update the team. I will wait for your confirmation before changing our booking. Best wishes, Dani

Rubric: task-achievement, reason-and-action, coherence, language-control.

Khả năng runtime: existing short_text can separate learner task and private model; suggested length remains editorial and current scoring is unchanged.
