import { Page, Request } from "@playwright/test";

export async function waitForModelViewer(page: Page) {
  await page.waitForFunction(() => !!customElements.get("model-viewer"));
  await page.waitForSelector('model-viewer[reveal="auto"]');
  await page.waitForFunction(() => {
    const mv = document.querySelector("model-viewer") as any;
    return mv && (mv as any).modelIsVisible;
  });
}

export async function intercept(page: Page, urlPart: string) {
  const requests: Request[] = [];
  await page.route(`**/*${urlPart}*`, (route) => {
    requests.push(route.request());
    return route.continue();
  });
  return requests;
}
