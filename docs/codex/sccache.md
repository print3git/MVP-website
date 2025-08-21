# sccache

This repository provides a composite action at `.github/actions/sccache` that installs and configures [sccache](https://github.com/mozilla/sccache) for Rust builds.

## Usage

Add the action to a workflow before running `cargo` commands:

```yaml
- uses: actions/cache@v4.0.2
  with:
    path: ~/.cache/sccache
    key: ${{ runner.os }}-sccache-${{ hashFiles('**/Cargo.lock') }}
    restore-keys: ${{ runner.os }}-sccache-
- uses: ./.github/actions/sccache
- run: cargo build --locked
```

The action downloads a static `sccache` binary on Linux, adds it to the `PATH`, and exports `RUSTC_WRAPPER` and `SCCACHE_DIR` environment variables. It also prints cache statistics so cache effectiveness is visible in the workflow logs.
