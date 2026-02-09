# Hawk TypeScript VSCode Extension

Syntax highlighting and language support for `.hts` (Hawk TypeScript) files.

## Features

- Syntax highlighting for `.hts` and `.htsx` files
- Support for custom switch syntax:
  - Multi-value cases: `'dog', 'puppy': action`
  - Auto-break (implicit)
  - Fall-through operator: `:>`

## Installation

### From VSIX (Local)

1. Build the extension:
   ```bash
   cd vscode-extension
   npx vsce package
   ```

2. Install in VSCode:
   - Open VSCode
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "Install from VSIX"
   - Select the generated `.vsix` file

### Development Mode

1. Open the `vscode-extension` folder in VSCode
2. Press `F5` to launch Extension Development Host
3. Open a `.hts` file to test

## Example

```hts
function getSound(animal: string): string {
  let result = '';

  switch (animal) {
    'dog', 'puppy': result = 'bark';
    'cat', 'kitten': result = 'meow';
    'wolf':> result = 'howl';  // fall-through
    'fox': result += ' (and yap)';
    default: result = 'silence';
  }

  return result;
}
```

## Build Integration

Use with the `hawkts-switch` CLI to compile `.hts` files:

```bash
npm install hawkts-switch
npx hawkts-switch
```
