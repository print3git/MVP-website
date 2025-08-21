# no-hardcoded-colors

Enforces usage of design tokens instead of hardcoded color literals.

## Allowed tokens

- `var(--color-black)`
- `var(--color-white)`
- `var(--color-red)`
- `var(--color-blue)`
- `var(--color-green)`

## Auto-fix mappings

| Literal(s)                 | Token                |
| -------------------------- | -------------------- |
| `#000`, `#000000`, `black` | `var(--color-black)` |
| `#fff`, `#ffffff`, `white` | `var(--color-white)` |
| `#f00`, `#ff0000`, `red`   | `var(--color-red)`   |
| `#00f`, `#0000ff`, `blue`  | `var(--color-blue)`  |
| `#0f0`, `#00ff00`, `green` | `var(--color-green)` |

Colors outside these mappings will produce an error. Add a token or extend the whitelist as needed.
