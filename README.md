# Hawk TypeScript (.hts)

Enhanced switch-case syntax for TypeScript with multi-value support and auto-break.

## Features

- **Multi-value cases**: `'dog', 'puppy': action`
- **Auto-break**: No need to write `break;`
- **Optional fall-through**: Use `:>` to continue to next case
- **Full TypeScript support**: All TS features work normally
- **VSCode Extension**: Syntax highlighting included

## Installation

```bash
npm install hawkts-switch
```

## Setup

### 1. Install VSCode Extension

The VSCode extension provides syntax highlighting for `.hts` files:

```bash
cd node_modules/hawkts-switch/vscode-extension
npx vsce package
# Then install the .vsix file in VSCode
```

Or install from the VSCode marketplace (coming soon).

### 2. Configure Build

Update your `package.json`:

```json
{
  "scripts": {
    "build": "hawkts-switch"
  }
}
```

### 3. Add to .gitignore

```
.hawkts-temp
```

## Usage

Create files with `.hts` extension:

```typescript
// src/sounds.hts

export function getSound(animal: string): string {
  switch (animal) {
    'dog', 'puppy': return 'bark';
    'cat', 'kitten': return 'meow';
    'wolf': return 'howl';
    default: return 'silence';
  }
}
```

Build to transform `.hts` → `.ts` → `.js`:

```bash
npx hawkts-switch
```

## Syntax

### Multi-value Cases

```typescript
switch (animal) {
  'dog', 'puppy': console.log('barks');
  'cat', 'kitten': console.log('meows');
  default: console.log('silence');
}
```

Compiles to:

```javascript
switch (animal) {
  case 'dog':
  case 'puppy':
    console.log('barks');
    break;
  case 'cat':
  case 'kitten':
    console.log('meows');
    break;
  default:
    console.log('silence');
}
```

### Fall-through with `:>`

Use `:>` instead of `:` to fall through to the next case:

```typescript
switch (count) {
  0:> output += "Zero ";
  1:> output += "One ";
  2: console.log(output + "Two");
  default: console.log("Other");
}
```

## CLI Options

```
hawkts-switch [options]

Options:
  --src <dir>       Source directory (default: src)
  --out <dir>       Output directory (default: dist)
  -p, --project     Path to tsconfig.json (default: tsconfig.json)
  -h, --help        Show help
```

## File Extensions

| Extension | Description |
|-----------|-------------|
| `.hts`    | Hawk TypeScript |
| `.htsx`   | Hawk TSX (for React) |
| `.ts`     | Standard TypeScript (copied as-is) |

## How It Works

```
src/
  utils.ts        ← Standard TypeScript (copied)
  handler.hts     ← Hawk TypeScript (transformed)
       ↓
   hawkts-switch build
       ↓
.hawkts-temp/     ← Temporary (auto-cleaned)
  utils.ts
  handler.ts      ← Transformed to standard TS
       ↓
   tsc
       ↓
dist/
  utils.js
  handler.js
```

## Background

Here is a post explaining why I decided to try and write this code:
[zenn.dev/theblindhawk](https://zenn.dev/theblindhawk/articles/f3633b0524fb91)

## Contributing

Issues and pull requests welcome at [GitHub](https://github.com/TheBlindHawk/JS-switch).

## License

MIT
