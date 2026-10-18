# Structural and behavioral coverage

- VERIFIED means the specific source declaration or reviewed rule has evidence; it does not mean runtime-tested or deployed.
- Structural file coverage is not behavioral or code-test coverage.
- Curated behavior covers selected flows; every module remains PARTIALLY_ANALYZED.
- No production test suite or database mutation was executed.

|Module|Discovered files|Structurally analyzed|Verified records|Reviewed use cases/rules|Status|
|---|---:|---:|---:|---:|---|
|workspace|6|4|2|0|PARTIALLY_ANALYZED (structural metadata only)|
|api|9|7|8|0|PARTIALLY_ANALYZED (structural + selected behavior)|
|database|34|33|127|0|PARTIALLY_ANALYZED (structural metadata only)|
|admin-curriculum|12|12|91|0|PARTIALLY_ANALYZED (structural metadata only)|
|ai-gateway|27|27|92|2|PARTIALLY_ANALYZED (structural + selected behavior)|
|analytics|9|9|22|0|PARTIALLY_ANALYZED (structural metadata only)|
|audio-settings|7|7|25|0|PARTIALLY_ANALYZED (structural metadata only)|
|audit|7|7|15|0|PARTIALLY_ANALYZED (structural metadata only)|
|auth|14|14|41|5|PARTIALLY_ANALYZED (structural + selected behavior)|
|common|19|19|49|2|PARTIALLY_ANALYZED (structural + selected behavior)|
|content-authoring|16|16|73|8|PARTIALLY_ANALYZED (structural + selected behavior)|
|curriculum-foundation|12|12|49|2|PARTIALLY_ANALYZED (structural + selected behavior)|
|curriculum|11|11|26|0|PARTIALLY_ANALYZED (structural metadata only)|
|engagement|11|11|33|0|PARTIALLY_ANALYZED (structural metadata only)|
|health|4|4|10|0|PARTIALLY_ANALYZED (structural metadata only)|
|ielts-band-curriculum|12|12|57|1|PARTIALLY_ANALYZED (structural + selected behavior)|
|ielts-bridge|11|11|72|2|PARTIALLY_ANALYZED (structural + selected behavior)|
|ielts-integrated-practice|12|12|60|2|PARTIALLY_ANALYZED (structural + selected behavior)|
|ielts-mock|16|16|102|2|PARTIALLY_ANALYZED (structural + selected behavior)|
|ielts-orientation|15|15|76|0|PARTIALLY_ANALYZED (structural metadata only)|
|jobs|8|8|47|5|PARTIALLY_ANALYZED (structural + selected behavior)|
|learning-programs|12|12|32|2|PARTIALLY_ANALYZED (structural + selected behavior)|
|learning-sessions|20|20|109|8|PARTIALLY_ANALYZED (structural + selected behavior)|
|mastery|17|17|62|3|PARTIALLY_ANALYZED (structural + selected behavior)|
|media|13|13|37|0|PARTIALLY_ANALYZED (structural metadata only)|
|onboarding|12|12|47|5|PARTIALLY_ANALYZED (structural + selected behavior)|
|operations|5|5|16|0|PARTIALLY_ANALYZED (structural metadata only)|
|progress|3|3|9|0|PARTIALLY_ANALYZED (structural metadata only)|
|progression|7|7|30|2|PARTIALLY_ANALYZED (structural + selected behavior)|
|storage|4|4|17|0|PARTIALLY_ANALYZED (structural + selected behavior)|
|teacher-ai|13|13|39|2|PARTIALLY_ANALYZED (structural + selected behavior)|
|users|9|9|29|2|PARTIALLY_ANALYZED (structural + selected behavior)|
|api-tests|71|71|76|0|PARTIALLY_ANALYZED (structural metadata only)|
|web|310|291|584|0|PARTIALLY_ANALYZED (structural + selected behavior)|
|existing-docs|103|103|1|0|PARTIALLY_ANALYZED (structural metadata only)|
|infra|1|0|1|0|PARTIALLY_ANALYZED (structural + selected behavior)|
|package-content-format|17|16|50|0|PARTIALLY_ANALYZED (structural metadata only)|
|package-contracts|42|41|204|0|PARTIALLY_ANALYZED (structural metadata only)|
|package-test-fixtures|8|7|2|0|PARTIALLY_ANALYZED (structural metadata only)|
|operations-scripts|12|3|10|0|PARTIALLY_ANALYZED (structural + selected behavior)|

Denominator: discovered files within the explicit allowlist; dependency, runtime data, generated artifacts and excluded file classes are outside it. Configuration files not parsed remain inventoried. No claim of 100% system coverage.
