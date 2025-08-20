import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });
import { applyMockEnv } from "../backend/src/lib/mockEnv";
applyMockEnv();

if (!process.env.CI_REQUIRE_EXTERNAL) {
  process.env.CI_REQUIRE_EXTERNAL = "0";
}
