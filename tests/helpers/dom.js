import { JSDOM } from "jsdom";

export function buildDOM(html = "") {
  const dom = new JSDOM(`<!doctype html><html><body>${html}</body></html>`, {
    url: "http://localhost/",
  });
  return dom;
}
