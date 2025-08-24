declare namespace NodeJS {
  interface ProcessEnv {
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    FRONTEND_SUCCESS_URL: string;
    FRONTEND_CANCEL_URL: string;
  }
}
export {};
