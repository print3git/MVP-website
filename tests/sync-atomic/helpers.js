const fs = require("fs");
const os = require("os");
const path = require("path");

function setup(overrides = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "hf-sync-"));
  const bin = path.join(tmp, "bin");
  fs.mkdirSync(bin);
  const log = path.join(tmp, "log");
  fs.writeFileSync(log, "");

  const make = (name, content) => {
    const p = path.join(bin, name);
    fs.writeFileSync(p, content);
    fs.chmodSync(p, 0o755);
  };

  make(
    "git",
    `#!/usr/bin/env bash
  echo git "$@" >> "$LOG"
  if [[ "$1" == "clone" ]]; then
    dest="${"${@: -1}"}"
    mkdir -p "$dest"
    [[ "$GIT_CLONE_FAIL" == "1" ]] && exit 1
  fi
  if [[ "$1" == "lfs" && "$2" == "install" && "$GIT_LFS_TIMEOUT" == "1" ]]; then
    exit 124
  fi
  exit 0
  `,
  );

  make(
    "rsync",
    `#!/usr/bin/env bash
  echo rsync "$@" >> "$LOG"
  src="${"${@: -2:1}"}"
  dest="${"${@: -1}"}"
  mkdir -p "$dest"
  if [[ "$RSYNC_CHECK_PERMS" == "1" && ! -r "$src" ]]; then
    exit 23
  fi
  if [[ "$RSYNC_FAIL_FIRST" == "1" && ! -f "${tmp}/rsync-done" ]]; then
    touch "${tmp}/rsync-done"
    exit 255
  fi
  cp -r "$src" "$dest" 2>/dev/null || true
  exit 0
  `,
  );

  make(
    "huggingface-cli",
    `#!/usr/bin/env bash
  echo hf "$@" >> "$LOG"
  exit 0
  `,
  );

  make(
    "curl",
    `#!/usr/bin/env bash
  echo curl "$@" >> "$LOG"
  exit 0
  `,
  );

  return {
    tmp,
    log,
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      HF_TOKEN: "token",
      LOG: log,
      ...overrides,
    },
  };
}

module.exports = { setup };
