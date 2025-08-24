# CI Autofix

This repository includes an experimental autofix loop that inspects failing CI runs and opens pull requests with fixes or high-fidelity tests.

## HuggingFace models

The loop uses the free HuggingFace Inference API. If a `HF_TOKEN` secret is configured, requests are authenticated; otherwise unauthenticated calls are made (they are more rate limited and may be blocked).

Primary model: `deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct`

Fallback model: `bigcode/starcoder2-15b-instruct`

Rate limits and model loading may delay responses. When unauthenticated calls are denied, a diagnostic pull request is created to request adding `HF_TOKEN`.

Set repository variable `AUTOFIX_DISABLED=1` to disable the loop.
