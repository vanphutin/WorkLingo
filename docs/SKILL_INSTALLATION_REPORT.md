# Repository skill installation — 2026-10-14

## Installed and verified

| Requested package | Repository location | License | Pinned source |
|---|---|---|---|
| UI UX Pro Max | `.agents/skills/ui-ux-pro-max/` | MIT, LICENSE preserved | nextlevelbuilder/ui-ux-pro-max-skill `7246805992a42b7bba37d4cac83b01416f0c6c44` |
| Frontend Design | `.agents/skills/frontend-design/` | Apache 2.0, LICENSE.txt preserved | anthropics/skills `dbd4588f9e1033efb41dad4bef2f7947c8993d44` |
| Superpowers, 15 workflow skills | `.agents/skills/superpowers/<skill>/` | MIT, LICENSE preserved | obra/superpowers `bb92a77741419a4ab5f06e711a283343f1ada0c3` |

Codex native app-server `skills/list`, `cwds: [D:\\Projects\\WorkLingo]`, `forceReload: true` returned every new skill with `scope: repo`, `enabled: true`, `errors: []`. Evidence: [SKILL_DISCOVERY.json](SKILL_DISCOVERY.json). This was a read-only local discovery request, not a model/API turn. Existing `codex-quota-optimizer` remained present and enabled.

## Installation and review

- Read official READMEs and actual package licenses from pinned shallow checkouts in a temporary directory. Reviewed installer and its GitHub helper before use.
- Used the bundled `skill-installer/scripts/install-skill-from-github.py` with explicit `--dest` and pinned `--ref`; it refuses existing destinations and validates archive paths/symlinks. No npm/global package install, config change, hook registration or dependency upgrade.
- UI UX Pro Max official Codex platform template targets `.agents/skills/ui-ux-pro-max`. Installed its self-contained upstream package; only adapted Claude-specific search command examples to this repository's absolute script path. Instructions, restrictions and frontmatter otherwise retained. This local adaptation is reflected in the manifest hash.
- Frontend Design contains instructions and license only; no runtime dependencies.
- Superpowers upstream now recommends a Codex marketplace plugin. This installation copies its individual skill directories, including their references and optional scripts, into a repository collection. Plugin lifecycle/bootstrap hooks are not installed. No claim of complete plugin installation is made.
- Inspected every SKILL.md frontmatter and invocation metadata, parsed all 18 UI UX Python files without execution, and reviewed search entrypoint/imports, local CSV reads, closed JSON decision-rule parser and persistence file operations. Search runtime uses Python standard library and local modules; catalog/tests contain subprocess/file operations but were not executed. Superpowers optional shell/browser scripts were copied, not executed. They require separate source/dependency review before future execution.
- Python 3.11.9 was already installed. Runtime smoke: design-system generation and keyboard-navigation search returned data; Next.js hydration query and one narrower retry returned no results. No dependencies or Internet execution blocker occurred.
- Original skills, root instructions, `skills-lock.json` and application business logic were not changed by this installation.

## Activation and limitations

Use actual discovered names: `$ui-ux-pro-max`, `$frontend-design`, `$brainstorming`, `$writing-plans`, `$systematic-debugging`, `$verification-before-completion`, etc. `superpowers` is a collection, not a single SKILL.md, and no invented `$superpowers` invocation is needed. Natural-language tasks also match descriptions. Skills are available on the next turn; if the picker is stale, restart Codex. Native discovery is already verified here.

Repository/user instructions and current tool availability take precedence. Do not execute upstream instructions to edit global Codex config, fabricate a Skill tool, override invocation restrictions, choose unavailable models, or create unauthorized commits/pushes. Existing `implement` and architecture skills remain invocation restricted. Shell helpers assume Unix/Git Bash and optional brainstorming visuals include a local Node server; neither is required for instruction-only usage.

Routing for the resumed redesign: UI UX Pro Max handles design intelligence, Frontend Design visual direction, Superpowers brainstorming/planning/verification as applicable, existing Git/React/review skills retain distinct responsibilities. Prior autonomous execution directive supplies product scope and delegates reversible design choices; no repeated design approval is introduced. Only actually followed workflows will be claimed in the final audit.

Official sources: [UI UX Pro Max installation](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill#installation), [Anthropic Skills README](https://github.com/anthropics/skills), [Superpowers Codex installation](https://github.com/obra/superpowers#codex-app), [OpenAI local skills documentation](https://learn.chatgpt.com/docs/build-skills), [app-server discovery](https://learn.chatgpt.com/docs/app-server).
