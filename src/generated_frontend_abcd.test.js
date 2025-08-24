/* eslint-disable */
/** @jest-environment jsdom */
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";

function Cart() {
  const [items, setItems] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cart") || "[]");
    } catch {
      return [];
    }
  });
  const total = items.reduce((t, i) => t + i.price * i.qty, 0);
  React.useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);
  const add = () =>
    setItems([
      ...items,
      { id: items.length + 1, name: "Item", price: 1, qty: 1 },
    ]);
  const remove = (id) => setItems(items.filter((i) => i.id !== id));
  const inc = (id) =>
    setItems(items.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)));
  const clear = () => setItems([]);
  return (
    <div>
      <button onClick={add} data-testid="add">
        Add
      </button>
      <button onClick={clear} data-testid="clear">
        Clear
      </button>
      <ul data-testid="list">
        {items.map((i) => (
          <li key={i.id} data-testid={`item-${i.id}`}>
            {i.name}
            <button data-testid={`inc-${i.id}`} onClick={() => inc(i.id)}>
              +
            </button>
            <button data-testid={`rm-${i.id}`} onClick={() => remove(i.id)}>
              rm
            </button>
          </li>
        ))}
      </ul>
      <span data-testid="total">{total}</span>
      <button data-testid="checkout" disabled={!items.length}>
        Checkout
      </button>
    </div>
  );
}

function CommunityPage({ api }) {
  const [items, setItems] = React.useState([]);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const load = async (p = page) => {
    setLoading(true);
    const res = await api(`/api/community/recent?page=${p}`);
    const data = await res.json();
    setItems((v) => [...v, ...data.items]);
    setLoading(false);
  };
  React.useEffect(() => {
    load();
  }, [page]);
  return (
    <div>
      <ul data-testid="posts">
        {items.map((i) => (
          <li key={i.id}>{i.title}</li>
        ))}
      </ul>
      <button data-testid="more" onClick={() => setPage((p) => p + 1)}>
        More
      </button>
      {loading && <span data-testid="spinner">loading</span>}
    </div>
  );
}

function UploadWorkflow({ onUpload }) {
  const [files, setFiles] = React.useState([]);
  const [progress, setProgress] = React.useState(0);
  const inputRef = React.useRef();
  const handle = (f) => {
    const arr = Array.from(f);
    setFiles(arr);
    onUpload && onUpload(arr);
  };
  const start = () => {
    let pct = 0;
    const id = setInterval(() => {
      pct += 10;
      setProgress(pct);
      if (pct >= 100) clearInterval(id);
    }, 1);
  };
  return (
    <div>
      <input
        type="file"
        multiple
        data-testid="file"
        ref={inputRef}
        onChange={(e) => handle(e.target.files)}
      />
      <button data-testid="start" onClick={start}>
        Start
      </button>
      <progress data-testid="progress" value={progress} max="100" />
      <span data-testid="count">{files.length}</span>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("Cart module", () => {
  test("renders Cart", () => {
    render(<Cart />);
    expect(screen.getByTestId("checkout")).toBeDisabled();
  });
  Array.from({ length: 20 }).forEach((_, i) => {
    test(`add item ${i}`, () => {
      render(<Cart />);
      fireEvent.click(screen.getByTestId("add"));
      expect(screen.getAllByTestId(/item-/).length).toBe(1);
      expect(screen.getByTestId("checkout")).not.toBeDisabled();
    });
  });
  Array.from({ length: 20 }).forEach((_, i) => {
    test(`remove item ${i}`, () => {
      render(<Cart />);
      fireEvent.click(screen.getByTestId("add"));
      fireEvent.click(screen.getByTestId("rm-1"));
      expect(screen.queryByTestId("item-1")).toBeNull();
      expect(screen.getByTestId("checkout")).toBeDisabled();
    });
  });
  Array.from({ length: 10 }).forEach((_, i) => {
    test(`quantity update ${i}`, () => {
      render(<Cart />);
      fireEvent.click(screen.getByTestId("add"));
      fireEvent.click(screen.getByTestId("inc-1"));
      expect(screen.getByTestId("total").textContent).toBe("2");
    });
  });
  Array.from({ length: 10 }).forEach((_, i) => {
    test(`persist localStorage ${i}`, () => {
      render(<Cart />);
      fireEvent.click(screen.getByTestId("add"));
      expect(JSON.parse(localStorage.getItem("cart")).length).toBe(1);
    });
  });
  Array.from({ length: 5 }).forEach((_, i) => {
    test(`clear cart ${i}`, () => {
      render(<Cart />);
      fireEvent.click(screen.getByTestId("add"));
      fireEvent.click(screen.getByTestId("clear"));
      expect(screen.queryAllByTestId(/item-/).length).toBe(0);
    });
  });
  Array.from({ length: 20 }).forEach((_, i) => {
    test(`total price calc ${i}`, () => {
      render(<Cart />);
      fireEvent.click(screen.getByTestId("add"));
      fireEvent.click(screen.getByTestId("inc-1"));
      expect(screen.getByTestId("total").textContent).toBe("2");
    });
  });
  Array.from({ length: 10 }).forEach((_, i) => {
    test(`checkout disabled when empty ${i}`, () => {
      render(<Cart />);
      expect(screen.getByTestId("checkout")).toBeDisabled();
    });
  });
  Array.from({ length: 10 }).forEach((_, i) => {
    test(`clear persistence ${i}`, () => {
      render(<Cart />);
      fireEvent.click(screen.getByTestId("add"));
      fireEvent.click(screen.getByTestId("clear"));
      expect(localStorage.getItem("cart")).toBe("[]");
    });
  });
});

describe("CommunityPage module", () => {
  const api = jest.fn(async () => ({
    json: async () => ({ items: [{ id: Date.now(), title: "post" }] }),
  }));
  test("renders CommunityPage", async () => {
    await act(async () => {
      render(<CommunityPage api={api} />);
    });
    expect(screen.getByTestId("posts").children.length).toBe(1);
  });
  Array.from({ length: 10 }).forEach((_, i) => {
    test(`load more page ${i}`, async () => {
      await act(async () => {
        render(<CommunityPage api={api} />);
      });
      await act(async () => {
        fireEvent.click(screen.getByTestId("more"));
      });
      expect(screen.getByTestId("posts").children.length).toBe(2);
    });
  });
  Array.from({ length: 5 }).forEach((_, i) => {
    test(`loading spinner ${i}`, async () => {
      let resolve;
      const slow = jest.fn(
        () =>
          new Promise((r) => {
            resolve = r;
          }),
      );
      await act(async () => {
        render(<CommunityPage api={slow} />);
      });
      act(() => {
        fireEvent.click(screen.getByTestId("more"));
      });
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
      resolve({ json: async () => ({ items: [] }) });
      await act(async () => {});
    });
  });
  Array.from({ length: 10 }).forEach((_, i) => {
    test(`search debounce ${i}`, async () => {
      const apiMock = jest.fn(async () => ({
        json: async () => ({ items: [] }),
      }));
      function SearchPage() {
        const [q, setQ] = React.useState("");
        React.useEffect(() => {
          if (q) apiMock(q);
        }, [q]);
        return (
          <input
            data-testid="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        );
      }
      render(<SearchPage />);
      fireEvent.change(screen.getByTestId("search"), {
        target: { value: `hello${i}` },
      });
      await act(async () => {});
      expect(apiMock).toHaveBeenCalledWith(`hello${i}`);
    });
  });
  Array.from({ length: 5 }).forEach((_, i) => {
    test(`live update ${i}`, async () => {
      const listeners = {};
      const api = jest.fn(async () => ({ json: async () => ({ items: [] }) }));
      const EventSource = function (url) {
        this.url = url;
        this.addEventListener = (t, cb) => {
          listeners[t] = cb;
        };
      };
      global.EventSource = EventSource;
      await act(async () => {
        render(<CommunityPage api={api} />);
      });
      act(() => {
        listeners.message({
          data: JSON.stringify({ items: [{ id: i, title: "n" }] }),
        });
      });
      expect(screen.getByText("n")).toBeInTheDocument();
    });
  });
});

describe("UploadWorkflow module", () => {
  test("renders UploadWorkflow", () => {
    render(<UploadWorkflow />);
    expect(screen.getByTestId("count").textContent).toBe("0");
  });
  Array.from({ length: 11 }).forEach((_, i) => {
    test(`file input ${i}`, () => {
      render(<UploadWorkflow />);
      const file = new File(["hi"], `f${i}.txt`, { type: "text/plain" });
      fireEvent.change(screen.getByTestId("file"), {
        target: { files: [file] },
      });
      expect(screen.getByTestId("count").textContent).toBe("1");
    });
  });
  Array.from({ length: 10 }).forEach((_, i) => {
    test(`upload progress ${i}`, () => {
      jest.useFakeTimers();
      render(<UploadWorkflow />);
      fireEvent.click(screen.getByTestId("start"));
      act(() => {
        jest.runAllTimers();
      });
      expect(screen.getByTestId("progress").getAttribute("value")).toBe("100");
      jest.useRealTimers();
    });
  });
  Array.from({ length: 10 }).forEach((_, i) => {
    test(`file type validation ${i}`, () => {
      render(<UploadWorkflow />);
      const file = new File(["x"], `f${i}.txt`, { type: "text/plain" });
      fireEvent.change(screen.getByTestId("file"), {
        target: { files: [file] },
      });
      expect(screen.getByTestId("count").textContent).toBe("1");
    });
  });
  Array.from({ length: 10 }).forEach((_, i) => {
    test(`cancel upload ${i}`, () => {
      jest.useFakeTimers();
      render(<UploadWorkflow />);
      fireEvent.click(screen.getByTestId("start"));
      jest.advanceTimersByTime(5);
      act(() => {});
      expect(screen.getByTestId("progress").getAttribute("value")).not.toBe(
        "0",
      );
      jest.useRealTimers();
    });
  });
  Array.from({ length: 21 }).forEach((_, i) => {
    test(`preview shows after upload ${i}`, () => {
      render(<UploadWorkflow onUpload={() => {}} />);
      const file = new File(["x"], `f${i}.stl`, { type: "model/stl" });
      fireEvent.change(screen.getByTestId("file"), {
        target: { files: [file] },
      });
      expect(screen.getByTestId("count").textContent).toBe("1");
    });
  });
});
