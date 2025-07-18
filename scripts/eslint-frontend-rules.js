module.exports = {
  rules: {
    "no-hardcoded-colors": {
      create(context) {
        const colorRegex =
          /#[0-9A-Fa-f]{3,8}\b|\brgba?\(|\bhsl[a]?\(|\b(?:red|blue|green|orange|yellow|purple|black|white|gray|grey|pink|brown)\b/i;
        return {
          Literal(node) {
            if (typeof node.value === "string" && colorRegex.test(node.value)) {
              context.report({ node, message: "Hardcoded color detected" });
            }
          },
        };
      },
    },
    "button-requires-aria": {
      create(context) {
        return {
          JSXOpeningElement(node) {
            if (node.name && node.name.name === "button") {
              const hasAria = node.attributes.some(
                (attr) =>
                  attr.type === "JSXAttribute" &&
                  ["aria-label", "aria-labelledby"].includes(attr.name.name),
              );
              const parent = node.parent;
              let hasTextChild = false;
              if (parent && parent.children) {
                hasTextChild = parent.children.some(
                  (child) =>
                    (child.type === "Literal" &&
                      child.value &&
                      child.value.trim()) ||
                    (child.type === "JSXText" && child.value.trim()),
                );
              }
              if (!hasTextChild && !hasAria) {
                context.report({
                  node,
                  message: "Non-textual buttons must have aria-label",
                });
              }
            }
          },
        };
      },
    },
    "controlled-input": {
      create(context) {
        return {
          JSXOpeningElement(node) {
            if (node.name && node.name.name === "input") {
              const hasValue = node.attributes.some(
                (attr) =>
                  attr.type === "JSXAttribute" &&
                  ["value", "checked"].includes(attr.name.name),
              );
              const hasOnChange = node.attributes.some(
                (attr) =>
                  attr.type === "JSXAttribute" && attr.name.name === "onChange",
              );
              if (!hasValue || !hasOnChange) {
                context.report({
                  node,
                  message: "Inputs must be controlled with value and onChange",
                });
              }
            }
          },
        };
      },
    },
    "no-deprecated-html-tags": {
      create(context) {
        const deprecated = new Set([
          "center",
          "font",
          "big",
          "blink",
          "marquee",
        ]);
        return {
          JSXOpeningElement(node) {
            if (node.name && deprecated.has(node.name.name)) {
              context.report({
                node,
                message: `Deprecated HTML tag <${node.name.name}> used`,
              });
            }
          },
          HTMLElement(node) {
            if (deprecated.has(node.tagName)) {
              context.report({
                node,
                message: `Deprecated HTML tag <${node.tagName}> used`,
              });
            }
          },
        };
      },
    },
  },
};
