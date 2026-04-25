# 🚀 TypeScript Template

A friendly TypeScript starter for Node.js ESM projects, with testing, linting, and formatting ready to go.

## ✨ What's Included

- ⚡ TypeScript + Node.js ESM setup
- 🧪 Vitest for fast, native ESM testing
- 🧹 XO linting and Prettier formatting
- 🧭 Import aliases via `package.json#imports`

## 📋 Requirements

- Node.js 18+

## 🛠️ Setup

```bash
npm install
```

## ▶️ Scripts

- `npm start` - Run the app with `tsx`
- `npm test` - Run Vitest tests
- `npm run lint` - Lint code with XO
- `npm run format` - Format files with Prettier

## 📁 Project Structure

- `src/index.ts` - Entry point example
- `src/modules/greet.ts` - Sample module
- `tests/index.test.ts` - Sample Vitest test
- `tsconfig.json` - TypeScript config extending `@tsconfig/node24`

## 🧭 Path Aliases

- `#src/*` -> `src/*`
- `#modules/*` -> `src/modules/*`

Use `.js` import specifiers in TypeScript source to match Node ESM resolution.
