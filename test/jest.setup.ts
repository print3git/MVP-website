import dotenv from "dotenv";
dotenv.config({ path: ".env.test" });
import { applyMockEnv } from "../backend/src/lib/mockEnv";
applyMockEnv();
