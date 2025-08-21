# CI plumbing tests

These tests validate continuous integration plumbing instead of application logic.
Run them locally with:

```
node --test tests/ci/**/*.test.js
```

They are lightweight and require no build step.
