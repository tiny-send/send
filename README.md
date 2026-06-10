# tinysend send

Send email to your audience from any GitHub workflow. Release notes, incident updates, deploy notes, digests — one step, no server.

[![subscribers](https://api.tinysend.com/v1/badges/updates/subscribers.svg)](https://updates.tinysend.com)

```yaml
- uses: tiny-send/send@v1
  with:
    api-key: ${{ secrets.TINYSEND_API_KEY }}
    list: ${{ vars.TINYSEND_LIST }}
    subject: ${{ github.event.release.name }}
    body: ${{ github.event.release.body }}
```

GitHub notifications reach people who watch your repo. This reaches your audience — subscribers, users, customers — with real deliverability, archives, and unsubscribe handling. Get an API key and a list at [tinysend.com](https://tinysend.com); subscribers can sign up at your list's archive page or via a [README badge](https://tinysend.com/docs).

## Inputs

- `api-key` (required): tinysend API key, store as a repo secret
- `list` (required): list id to send to
- `subject` (required): email subject
- `body`: message content, markdown by default
- `body-file`: read content from a file instead of `body`
- `format`: `markdown` (default), `html`, or `text`
- `channel`: `email` (default); `sms` and `whatsapp` coming soon
- `draft`: `true` to create the post without sending

## Outputs

- `post-id`: id of the created post
- `status`: `sent` or `draft`
- `recipients`: how many people it went to

## Recipes

### Release notes to your subscribers

```yaml
on:
  release:
    types: [published]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: tiny-send/send@v1
        with:
          api-key: ${{ secrets.TINYSEND_API_KEY }}
          list: ${{ vars.TINYSEND_LIST }}
          subject: '${{ github.event.repository.name }} ${{ github.event.release.tag_name }} is out'
          body: ${{ github.event.release.body }}
```

### Issues as a newsletter

Write a post by opening an issue. Label it `announcement` and it's emailed to your list — the issue tracker becomes your editor.

```yaml
on:
  issues:
    types: [labeled]

jobs:
  announce:
    if: github.event.label.name == 'announcement'
    runs-on: ubuntu-latest
    steps:
      - uses: tiny-send/send@v1
        with:
          api-key: ${{ secrets.TINYSEND_API_KEY }}
          list: ${{ vars.TINYSEND_LIST }}
          subject: ${{ github.event.issue.title }}
          body: ${{ github.event.issue.body }}
```

### Incident updates (statuspage for free)

Open an issue labeled `incident` → subscribers get "we're investigating". Close it → they get the resolution.

```yaml
on:
  issues:
    types: [labeled, closed]

jobs:
  incident:
    if: contains(github.event.issue.labels.*.name, 'incident')
    runs-on: ubuntu-latest
    steps:
      - uses: tiny-send/send@v1
        with:
          api-key: ${{ secrets.TINYSEND_API_KEY }}
          list: ${{ vars.TINYSEND_STATUS_LIST }}
          subject: "${{ github.event.action == 'closed' && 'Resolved' || 'Investigating' }}: ${{ github.event.issue.title }}"
          body: ${{ github.event.issue.body }}
```

### Deploy notes on production deploys

```yaml
on:
  deployment_status:

jobs:
  notify:
    if: github.event.deployment_status.state == 'success' && github.event.deployment.environment == 'production'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: tiny-send/send@v1
        with:
          api-key: ${{ secrets.TINYSEND_API_KEY }}
          list: ${{ vars.TINYSEND_LIST }}
          subject: 'New version live'
          body-file: CHANGELOG.md
```

### Changelog file as the source of truth

```yaml
on:
  push:
    branches: [main]
    paths: ['CHANGELOG.md']

jobs:
  send:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: tiny-send/send@v1
        with:
          api-key: ${{ secrets.TINYSEND_API_KEY }}
          list: ${{ vars.TINYSEND_LIST }}
          subject: 'Changelog update'
          body-file: CHANGELOG.md
```

### Scheduled digest

GitHub is the scheduler, tinysend is the channel. Generate content with any step (script, API call, agent), then send it.

```yaml
on:
  schedule:
    - cron: '0 9 * * MON'

jobs:
  digest:
    runs-on: ubuntu-latest
    steps:
      - id: write
        run: |
          echo "content<<EOF" >> "$GITHUB_OUTPUT"
          gh api repos/${{ github.repository }}/releases --jq '.[0].body' >> "$GITHUB_OUTPUT"
          echo "EOF" >> "$GITHUB_OUTPUT"
        env:
          GH_TOKEN: ${{ github.token }}
      - uses: tiny-send/send@v1
        with:
          api-key: ${{ secrets.TINYSEND_API_KEY }}
          list: ${{ vars.TINYSEND_LIST }}
          subject: 'Weekly digest'
          body: ${{ steps.write.outputs.content }}
```

### Universal email webhook

Any external system can trigger an email to your list via `repository_dispatch` — no server required.

```yaml
on:
  repository_dispatch:
    types: [notify]

jobs:
  send:
    runs-on: ubuntu-latest
    steps:
      - uses: tiny-send/send@v1
        with:
          api-key: ${{ secrets.TINYSEND_API_KEY }}
          list: ${{ vars.TINYSEND_LIST }}
          subject: ${{ github.event.client_payload.subject }}
          body: ${{ github.event.client_payload.body }}
```

### Agent finished a job

Agents running inside Actions (Claude Code action and friends) can report to humans through the same step — and via tinysend's [MCP server and agent APIs](https://tinysend.com/agents), agents can manage the whole list themselves.

## Why tinysend

- audiences, not notifications: curated subscriber lists with archives, double opt-in, unsubscribe handled
- agent-first: agents can self-register (auth.md), use the MCP server, or this action
- multi-channel roadmap: same action will text and WhatsApp your audience — `channel: sms` is coming, no workflow rewrite
- [SDK](https://github.com/tiny-send/tinysend-node) (`npm install tinysend`) when you outgrow the action

## License

MIT

---

a [system operator](https://systemoperator.com) product
