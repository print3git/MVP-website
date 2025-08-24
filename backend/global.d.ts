declare module "*";
declare module "./logger" {
  export const capture: any;
}
declare module "../lib/logger" {
  export const capture: any;
}
declare module "../../db";
declare module "stripe" {
  export const Checkout: any;
  export default any;
}
declare module "@aws-sdk/client-s3";
declare module "@gltf-transform/core";
declare module "./logger.js" {
  export function capture(e: any): void;
}
declare module "../logger.js" {
  const logger: any;
  export default logger;
}
declare module "../../mail.js" {
  export function sendMail(...args: any[]): Promise<void>;
}
declare module "../../db.js" {
  const db: any;
  export default db;
}
declare module "../../queue/printQueue.js" {
  export function enqueuePrint(...args: any[]): void;
}
declare module "../../queue/dbPrintQueue.js" {
  export function enqueuePrint(
    jobId: any,
    sessionId: any,
    options: any,
    a: any,
    b: any,
  ): Promise<void>;
}
