# PrismaCloak

**Stop leaking your production architecture to Claude.**

## What is this, in plain English?

When you ask an AI to help with database code, you usually paste your entire `schema.prisma`. That tells the AI (and whoever runs that AI service) things like:

- your table names (`PatientRecord`, `InsuranceClaim`)
- your column names (`ssn_hash`, `patient_diagnosis_id`)
- your database connection URL

**PrismaCloak is a local CLI that creates a safe copy of your schema** with fake generic names, while keeping the structure identical so the AI can still write correct queries.

Think of it like this:

```
YOUR REAL WORLD                    WHAT THE AI SEES
─────────────────                  ─────────────────
PatientRecord          →           ModelA
  ssn_hash             →             StringField1
  diagnosis → Diagnosis →           RelationField1 → ModelB

prismacloak.map.json lives ONLY on your laptop — it's the Rosetta Stone
```

After the AI writes code using `ModelA` and `StringField1`, you run **reveal** to convert it back to `PatientRecord` and `ssn_hash` on your machine. The AI never needs to see the real names.

No servers. No API keys. Nothing leaves your laptop unless you paste the shadow file.

## Start here

```bash
git clone https://github.com/robertvo824/prismacloak.git
cd prismacloak
npm install
npm run build
node dist/cli.js demo
```

The `demo` command walks through the entire workflow with a sample healthcare schema.

## Install without npm publish

Until the package is on npm, install directly from GitHub:

```bash
# One-liner (requires Node 18+)
npx github:robertvo824/prismacloak demo

# Or install globally from GitHub
npm install -g github:robertvo824/prismacloak
prismacloak demo
```

Or clone and link locally:

```bash
git clone https://github.com/robertvo824/prismacloak.git
cd prismacloak && npm install && npm run build && npm link
prismacloak demo
```

## The workflow

### Step 1: cloak — make a safe schema

```bash
prismacloak cloak ./prisma/schema.prisma
```

This creates two files next to your schema:

| File | Safe to share? | Purpose |
|------|----------------|---------|
| `schema.shadow.prisma` | **Yes** — paste into AI | Generic names, same relationships |
| `prismacloak.map.json` | **No — keep local** | Translation dictionary |

While developing, re-generate on every save:

```bash
prismacloak cloak ./prisma/schema.prisma --watch
```

### Step 2: paste the shadow schema into your AI

Open `schema.shadow.prisma` and paste it into ChatGPT, Claude, or Cursor. Ask something like:

> "Write a Prisma query to find all ModelA records where EnumField1 is ValueA, including RelationField2."

The AI uses the fake names but the relationships are real, so the query structure is correct.

### Step 3: reveal — convert AI output back

```bash
# From a file
prismacloak reveal --map ./prisma/prismacloak.map.json --file ./ai-output.ts

# Inline
prismacloak reveal --map ./prisma/prismacloak.map.json --text "prisma.ModelA.findMany()"

# From a pipe
echo "prisma.ModelA.findMany()" | prismacloak reveal --map ./prisma/prismacloak.map.json
```

Output goes to stdout (clean for piping). Status messages go to stderr.

## All commands

| Command | What it does |
|---------|--------------|
| `demo` | Guided walkthrough — **start here if you're confused** |
| `cloak <schema>` | Create shadow schema + map file |
| `reveal --map <file>` | Shadow names → your real names |
| `translate --map <file>` | Your real names → shadow names |
| `check --schema <path>` | CI guard — fail if shadow schema leaks real names |
| `inspect --map <file>` | Print the name dictionary |

## Example transformation

**Before** (your real schema — do NOT paste into AI):

```prisma
model PatientRecord {
  id       Int    @id
  ssn_hash String @unique
  claims   InsuranceClaim[]
}
```

**After** (`schema.shadow.prisma` — safe to paste):

```prisma
model ModelA {
  IntField1       Int    @id
  StringField1    String @unique
  RelationField1  ModelC[]
}
```

**AI writes:**

```typescript
await prisma.ModelA.findMany({
  select: { StringField1: true, RelationField1: true },
});
```

**You restore locally:**

```bash
prismacloak reveal --map prismacloak.map.json --text 'prisma.ModelA.findMany(...)'
# → prisma.PatientRecord.findMany(...)
```

## What gets redacted

- Model names → `ModelA`, `ModelB`, …
- Field names → `StringField1`, `IntField2`, `RelationField1`, …
- Enum names / values → `EnumA`, `ValueA`, …
- `@map` / `@@map` database identifiers
- Datasource URLs → placeholder connection string

## What is preserved

- Field types (`String`, `Int`, `DateTime`, …)
- Relations, foreign keys, `@relation` attributes
- Cardinality (`[]`, `?`)
- Prisma attributes (`@id`, `@unique`, `@default`, …)

## CI integration

Keep shadow schemas in sync and block leaks in pull requests:

```bash
prismacloak cloak ./prisma/schema.prisma
prismacloak check --schema ./prisma/schema.prisma
```

Commit `schema.shadow.prisma` to git. Add `prismacloak.map.json` to `.gitignore` — it must stay local.

GitHub Actions:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
- run: npm install -g prismacloak
- run: prismacloak check --schema ./prisma/schema.prisma
```

## Development

```bash
npm install
npm test
npm run build
npm run dev -- demo
```

## Roadmap (Enterprise)

- ~~CI gate that blocks unredacted schemas~~ — shipped in `check` command
- GitHub App for org-wide enforcement across monorepos
- Audit logs of what was sent to external LLMs

## License

MIT
