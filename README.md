# HawkTS

Enhanced TypeScript syntax with modular transforms.

## Features

### Switch Transform (included)
- **Multi-value cases**: `'dog', 'puppy': action`
- **Auto-break**: No need to write `break;`
- **Fall-through operator**: Use `:>` to continue to next case

### Coming Soon
- Pipe operator: `value |> fn1 |> fn2`
- Pattern matching: `match value { ... }`

## Installation

```bash
npm install hawkts
```

## Quick Start

### 1. Create `.hts` files

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

### 2. Build

```bash
npx hawkts
```

### 3. Output

```javascript
// dist/sounds.js
switch (animal) {
  case 'dog':
  case 'puppy':
    return 'bark';
    break;
  // ...
}
```

## VSCode Extension

Install syntax highlighting for `.hts` files:

```bash
cd node_modules/hawkts/vscode-extension
npx vsce package
# Install the generated .vsix in VSCode
```

## CLI Options

```
hawkts [options]

Options:
  --src <dir>         Source directory (default: src)
  --out <dir>         Output directory (default: dist)
  -p, --project       Path to tsconfig.json (default: tsconfig.json)
  --features <list>   Enable specific features (default: all)
  -h, --help          Show help
  -v, --version       Show version

Examples:
  hawkts
  hawkts --src ./source --out ./build
  hawkts --features switch
```

## Configuration

### package.json

```json
{
  "scripts": {
    "build": "hawkts"
  }
}
```

### .gitignore

```
.hawkts-temp
```

## Syntax Reference

### Multi-value Cases

```typescript
switch (animal) {
  'dog', 'puppy': console.log('barks');
  'cat', 'kitten': console.log('meows');
  default: console.log('silence');
}
```

### Fall-through (`:>`)

```typescript
switch (count) {
  3:> result += 'Three... ';
  2:> result += 'Two... ';
  1:> result += 'One... ';
  0: result += 'Liftoff!';
}
```

## File Extensions

| Extension | Description |
|-----------|-------------|
| `.hts`    | Hawk TypeScript |
| `.htsx`   | Hawk TSX (React) |
| `.ts`     | Standard TypeScript (copied) |

## Programmatic API

```typescript
import { transform } from 'hawkts';

const input = `
switch (x) {
  1, 2, 3: console.log('low');
  default: console.log('high');
}
`;

const output = transform(input);
// output is valid TypeScript
```

### Selective Features

```typescript
import { transform } from 'hawkts';

const output = transform(input, {
  features: {
    switch: true,
    // pipe: false,
  }
});
```

## Architecture

```
hawkts/
├── src/
│   ├── core/
│   │   ├── types.ts        # Transform interface
│   │   └── transformer.ts  # Orchestrator
│   ├── transforms/
│   │   ├── switch.ts       # Switch transform
│   │   └── index.ts        # All transforms
│   └── index.ts            # Main exports
├── bin/
│   └── hawkts.js           # CLI
└── vscode-extension/       # Syntax highlighting
```

## Background

Blog post about the motivation:
[zenn.dev/theblindhawk](https://zenn.dev/theblindhawk/articles/f3633b0524fb91)

## Contributing

Issues and PRs welcome at [GitHub](https://github.com/TheBlindHawk/hawkts).

## License

MIT
