/* eslint-disable */
/** @jest-environment jsdom */
import React, { useState, useEffect } from "react";
import { render, screen, fireEvent } from "@testing-library/react";

function ModalExample() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>open</button>
      {open && (
        <div role="dialog">
          <button onClick={() => setOpen(false)}>close</button>
        </div>
      )}
    </div>
  );
}

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div>
      <button onClick={() => setCollapsed((c) => !c)}>toggle</button>
      <nav data-testid="sidebar" className={collapsed ? "collapsed" : ""} />
    </div>
  );
}

function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onTouchStart={() => setOpen(true)}>menu</button>
      {open && <nav data-testid="mobile" onClick={() => setOpen(false)} />}
    </div>
  );
}

function Dropzone() {
  const [files, setFiles] = useState([]);
  const handle = (f) => setFiles(Array.from(f));
  return (
    <div>
      <div
        data-testid="drop"
        onDragEnter={(e) => {
          e.preventDefault();
          e.target.classList.add("hover");
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.target.classList.remove("hover");
        }}
        onDrop={(e) => {
          e.preventDefault();
          handle(e.dataTransfer.files);
        }}
      />
      <span data-testid="count">{files.length}</span>
    </div>
  );
}

function PayButton({ action }) {
  const [loading, setLoading] = useState(false);
  const click = async () => {
    setLoading(true);
    await action();
    setLoading(false);
  };
  return <button onClick={click}>{loading ? "Loading..." : "Pay"}</button>;
}

function ScrollNav() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = 0;
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > last);
      last = y;
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <nav data-testid="nav" className={hidden ? "hide" : "show"} />;
}

describe("ui interactions", () => {
  test("modal open/close", () => {
    render(<ModalExample />);
    fireEvent.click(screen.getByText("open"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByText("close"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  test("sidebar toggle", () => {
    render(<Sidebar />);
    const nav = screen.getByTestId("sidebar");
    expect(nav.className).toBe("");
    fireEvent.click(screen.getByText("toggle"));
    expect(nav.className).toBe("collapsed");
  });

  test("mobile menu touch", () => {
    render(<MobileMenu />);
    fireEvent.touchStart(screen.getByText("menu"));
    expect(screen.getByTestId("mobile")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("mobile"));
    expect(screen.queryByTestId("mobile")).toBeNull();
  });

  test("dropzone interaction", () => {
    render(<Dropzone />);
    const drop = screen.getByTestId("drop");
    const file = new File(["x"], "f.txt", { type: "text/plain" });
    fireEvent.dragEnter(drop);
    expect(drop.classList.contains("hover")).toBe(true);
    fireEvent.drop(drop, { dataTransfer: { files: [file] } });
    expect(screen.getByTestId("count").textContent).toBe("1");
  });

  test("payment button loading", async () => {
    const action = jest.fn(() => Promise.resolve());
    render(<PayButton action={action} />);
    fireEvent.click(screen.getByText("Pay"));
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    await screen.findByText("Pay");
    expect(action).toHaveBeenCalled();
  });

  test("nav hides on scroll", () => {
    render(<ScrollNav />);
    const nav = screen.getByTestId("nav");
    expect(nav.className).toBe("show");
    window.scrollY = 100;
    fireEvent.scroll(window);
    expect(nav.className).toBe("hide");
    window.scrollY = 0;
    fireEvent.scroll(window);
    expect(nav.className).toBe("show");
  });
});
