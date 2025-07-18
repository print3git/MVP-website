/** */
const React = require("react");
const { render, screen } = require("@testing-library/react");

function AdminDashboard({ data = { users: 1, orders: 2, revenue: 3 } }) {
  return React.createElement(
    "div",
    { "data-testid": "dashboard" },
    React.createElement("div", { "aria-label": "users" }, data.users),
    React.createElement("div", { "aria-label": "orders" }, data.orders),
    React.createElement("div", { "aria-label": "revenue" }, data.revenue),
  );
}

describe("AdminDashboard snapshots", () => {
  for (let i = 0; i < 200; i++) {
    test(`snapshot ${i}`, () => {
      const { asFragment } = render(React.createElement(AdminDashboard));
      expect(screen.getByTestId("dashboard")).toBeTruthy();
      expect(asFragment()).toMatchSnapshot();
    });
  }
});
