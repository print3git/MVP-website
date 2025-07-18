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
