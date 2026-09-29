# AI Daily

This automation generates a daily AI digest for investors and developers, with extra weight on:

- product launches and API changes
- enterprise adoption and commercial traction
- big-tech strategic moves
- China market and domestic platform updates

For Chinese titles and summaries, set:

- `OPENAI_API_KEY`: required for AI-generated Chinese rewriting
- `AI_DAILY_MODEL`: optional, for example `gpt-4o-mini`

Without an API key, the generator still runs, but falls back to rule-based Chinese copy.

Run locally:

```bash
npm run ai-daily
```

Dry run without writing files:

```bash
npm run ai-daily:dry-run
```

Override the digest date:

```bash
AI_DAILY_DATE=2026-06-05 npm run ai-daily
```
