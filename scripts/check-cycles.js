#!/usr/bin/env node
import madge from "madge";

madge("src")
  .then((res) => {
    const cycles = res.circular();
    if (cycles.length) {
      console.error("Dependency cycles detected:", cycles);
      process.exit(1);
    }
    console.log("No cycles found.");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
