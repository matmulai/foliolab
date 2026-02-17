## 2024-05-23 - Lazy Loading Repository Details
**Learning:** Eagerly fetching detailed information (like READMEs) for a list view creates massive N+1 performance bottlenecks.
**Action:** Removed the eager fetching of READMEs in `getRepositories`. The initial repository list now loads significantly faster. The detailed information (title from README) is now only fetched on-demand during the "Analyze" step for selected repositories. This trade-off means the initial list shows the raw repository name instead of the "nice" title, but the performance gain is worth it.
