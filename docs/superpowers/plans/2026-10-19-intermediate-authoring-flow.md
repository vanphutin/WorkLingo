# Intermediate authoring: topic first

Latest user decision replaces fragmented authoring entry points with one business flow: choose topic, view its lessons, then add a lesson using form/JSON. Preserve the150 populated bilingual categories and alias/mapping functionality.

Rules:
1. Sidebar and Intermediate hub expose one primary destination, **Chủ đề & bài học / Topics and lessons**. Earlier category tools remain secondary legacy links.
2. Workspace initially asks the administrator to choose a topic. Only a selected existing topic enables Add lesson. Ungrouped old records have a secondary remediation view with assignment controls; this view cannot create ungrouped topic lessons.
3. `/topics` redirects to the unified workspace. `/topics/new` without a valid topic UUID redirects to topic selection; with a UUID it validates existence before showing the form. The current topic is fixed during creation; changing topic goes back through selection with the unsaved-content guard. Saved lessons retain explicit reassignment controls.
4. New Intermediate-topic imports require a valid topic ID at the API boundary, including advanced/manual clients. Legacy unrelated formats keep existing behavior. Creation is atomic with assignment. Existing ungrouped records remain editable/assignable; do not bulk-classify them.
5. After creation, edit route shows the saved topic and lesson. Save draft → advanced validation/audio → human duration approval → publication remain explicit existing steps, explained as a visible workflow. AI never approves or adds questions.

Implementation: main owns routes, unified workspace/navigation/hub, editor entry wrapper, translations/tests/docs; a bounded backend worker owns mandatory-topic-create validation and tests only. Focused tests first; actual Next fixture checks direct-route redirect, topic selection and JSON mapping. Final review/checks and scoped local commits. No new migration/seed/provider calls are needed for this flow increment.
