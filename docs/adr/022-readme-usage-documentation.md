# ADR-022: README and Usage Documentation

- **Status:** Accepted
- **Context:** Task 22 requires a comprehensive README.md that serves as the first touchpoint for users. The README needs to cover installation, usage, generated files, environment variables, task tracker comparison, and development setup — all while staying under 200 lines per the project's doc_format.md standard.
- **Decision:**
  - Structured the README with a TOC and concise table-based sections following doc_format.md conventions.
  - Prioritized the single-line install command at the top since it's the primary call-to-action.
  - Used tables for all structured data (wizard steps, CLI flags, generated files, env vars, task trackers, scripts) to maximize information density while staying under the 200-line limit.
  - Included a project structure tree in the Development section to help contributors navigate the codebase.
  - Added a brief Architecture section explaining the pure-function generator pattern, since it's the key design principle.
  - Referenced the `docs/adr/` directory for detailed architectural decisions rather than duplicating content.
  - Used MIT license designation consistent with open-source TypeScript CLI projects.
- **Consequences:**
  - README is 164 lines — well under the 200-line limit with room for minor additions.
  - All relative links point to existing directories/files in the repo.
  - The install command references the correct GitHub repo URL (`potgieterdl/ai-helper-tools`).
  - Future updates to generators, wizard steps, or env vars will need corresponding README updates.
