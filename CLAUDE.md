# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Run all tests: `npm test`
- Run a single test: `node --test test/map.js` or `node --test test/forEach.js`
- Run linting: `npx standard`

## Code Style

- Follow StandardJS style guidelines (https://standardjs.com/)
- Use 'strict' mode at the top of files
- Use CommonJS module format (require/module.exports)
- Async functions should handle errors with try/catch
- Parameter defaults should be declared in function signature (e.g., `n = 16`)
- Use concise function expressions for simple callbacks
- Tests use Node.js built-in test runner (node:test) with describe/test structure
- Use global built-in objects rather than importing them (e.g., AbortController)
- Use assert from node:assert/strict for test assertions
- Use assert.rejects for testing async errors
- Use consistent 2-space indentation
- Prefer const/let over var
- Use descriptive variable names that indicate purpose