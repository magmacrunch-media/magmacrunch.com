Run tests and linting to verify your changes before pushing.

---

## Quick Commands

```bash
# Lint JavaScript (shared code only)
npm run lint
# or
make lint

# Lint ALL JavaScript (including game-specific — many warnings expected)
npm run lint:all
# or
make lint-all

# Lint a specific game
make lint-game GAME=chess

# Fix lint issues automatically
npm run lint:fix

# Run all tests (lint + JS tests)
npm test
# or
make test

# Run only Python tests
npm run test:py
# or
make test-py

# Run only JS tests
npm run test:js
# or
make test-js

# Run ALL checks (lint + Python + JS)
make check
```

## JavaScript Linting (ESLint)

Configured in `.eslintrc.json`. Lints:
- `nav.js`
- `assets/*.js`
- `assets/cards/js/*.js`
- `templates/*.js`
- `arcade/shared/*.js`

### Key Rules

| Rule | Setting | Notes |
|------|---------|-------|
| `no-var` | off | `var` is allowed (broad browser compat) |
| `prefer-const` | off | Not enforced |
| `no-unused-vars` | warn | Args ignored |
| `no-undef` | error | Must declare globals in `.eslintrc.json` |
| `eqeqeq` | warn (smart) | Allows `==` for null checks |

### Adding New Globals

If your code uses a new global (e.g. `window.MY_CONFIG`), add it to `.eslintrc.json`:

```json
"globals": {
    "MY_CONFIG": "writable"
}
```

## Python Tests (pytest)

Game servers with multiplayer have Python test suites:

```
arcade/chess/tests/test_*.py
arcade/checkers/tests/test_*.py
arcade/backgammon/tests/test_*.py
arcade/cribbage/tests/test_*.py
arcade/chinese-checkers/tests/test_*.py
arcade/scandinavian-stud/tests/test_*.py
arcade/parchisi/tests/test_*.py
arcade/aggravation/tests/test_*.py
arcade/SORRY/tests/test_*.py
```

Run all Python tests:
```bash
npm run test:py
```

Or run a specific game's tests:
```bash
cd arcade/chess && pytest -v --tb=short
```

Requires `pytest>=7.0` (see `requirements.txt`).

## JavaScript Tests

Game logic tests in `arcade/*/tests/test-*.js`:

```bash
npm run test:js
```

Or run a specific test:
```bash
node arcade/george-boole/tests/test-game-logic.js
node arcade/george-boole/tests/test-game.js
```

## CI Workflow

GitHub Actions runs on every push/PR to `main`:

1. **Lint** — ESLint with Node.js 22
2. **Python tests** — pytest across all game servers
3. **JS tests** — Node.js test files

See `.github/workflows/ci.yml`.

## Pre-Commit Checklist

```bash
# Run everything
npm test

# Or step by step
npm run lint
npm run test:js
npm run test:py
``` 
