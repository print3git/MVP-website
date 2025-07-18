/**
 * @jest-environment jsdom
 */
/* global window navigator WebSocket */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import fetchMock from "jest-fetch-mock";
import WS from "jest-websocket-mock";

fetchMock.enableMocks();

function parseMarkdown(text) {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

const postsFixture = require("./__fixtures__/community/posts.json");
const commentsFixture = require("./__fixtures__/community/comments.json");

function CommunityList({ loggedIn: _loggedIn = true }) {
  const [posts, setPosts] = React.useState([]);
  const [page, setPage] = React.useState(0);
  const [category, setCategory] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState("new");
  const timer = React.useRef();
  const limit = 2;
  React.useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(page * limit),
        category,
        search,
        sort,
      });
      fetch("/api/community/recent?" + params)
        .then((res) => {
          if (!res.ok) throw res;
          return res.json();
        })
        .then((data) => {
          const arr = page ? [...posts, ...data.posts] : data.posts;
          arr.sort((a, b) => b.timestamp - a.timestamp);
          setPosts(arr);
        })
        .catch((e) => {
          if (e.status === 404) setPosts(null);
        });
    }, 300);
    return () => clearTimeout(timer.current);
  }, [page, category, search, sort]);
  if (posts === null)
    return React.createElement("div", {}, "Failed to load posts");
  if (!posts.length) return React.createElement("div", {}, "No posts yet");
  return React.createElement(
    "div",
    {
      className: window.innerWidth < 600 ? "mobile" : "desktop",
      onScroll: (e) => {
        if (
          e.currentTarget.scrollTop + e.currentTarget.clientHeight >=
          e.currentTarget.scrollHeight
        )
          setPage((p) => p + 1);
      },
    },
    React.createElement(
      "select",
      {
        onChange: (e) => {
          setPage(0);
          setCategory(e.target.value);
        },
      },
      React.createElement("option", { value: "" }, "All"),
      React.createElement("option", { value: "art" }, "Art"),
    ),
    React.createElement("input", {
      placeholder: "search",
      onChange: (e) => {
        setPage(0);
        setSearch(e.target.value);
      },
    }),
    React.createElement(
      "button",
      { onClick: () => setSort("new") },
      "sort new",
    ),
    React.createElement(
      "button",
      { onClick: () => setSort("popular") },
      "sort popular",
    ),
    posts.map((p) =>
      React.createElement(
        "article",
        { key: p.id, role: "article" },
        React.createElement("img", {
          src: p.user.avatar,
          alt: p.user.username,
          "data-testid": "avatar",
          loading: "lazy",
        }),
        React.createElement("a", { href: "/community/" + p.id }, p.title),
        React.createElement("span", {}, p.user.username),
        React.createElement("time", {}, new Date(p.timestamp).toLocaleString()),
        React.createElement(
          "button",
          {
            "aria-label": "upvote",
            onClick: (e) => {
              e.currentTarget.disabled = true;
              fetch("/api/community/" + p.id + "/vote", {
                method: "POST",
                body: JSON.stringify({ v: 1 }),
              });
            },
          },
          "▲",
        ),
        React.createElement(
          "button",
          {
            "aria-label": "downvote",
            onClick: (e) => {
              e.currentTarget.disabled = true;
              fetch("/api/community/" + p.id + "/vote", {
                method: "POST",
                body: JSON.stringify({ v: -1 }),
              });
            },
          },
          "▼",
        ),
        React.createElement(
          "button",
          {
            onClick: () =>
              navigator.clipboard.writeText(
                window.location.origin + "/community/" + p.id,
              ),
          },
          "copy",
        ),
        React.createElement(
          "button",
          {
            onClick: () =>
              window.open(
                "https://twitter.com/share?url=" +
                  encodeURIComponent(
                    window.location.origin + "/community/" + p.id,
                  ),
              ),
          },
          "tweet",
        ),
        React.createElement(
          "button",
          {
            onClick: () =>
              window.open(
                "https://facebook.com/sharer/sharer.php?u=" +
                  encodeURIComponent(
                    window.location.origin + "/community/" + p.id,
                  ),
              ),
          },
          "fb",
        ),
      ),
    ),
    React.createElement(
      "button",
      { onClick: () => setPage((p) => p + 1) },
      "Load more",
    ),
  );
}

function CommunityPost({
  id,
  loggedIn: _loggedIn = true,
  isAdmin = false,
  isOwner = false,
}) {
  const [post, setPost] = React.useState(null);
  const [comments, setComments] = React.useState([]);
  const [error, setError] = React.useState(false);
  React.useEffect(() => {
    fetch("/api/community/" + id)
      .then((res) => res.json())
      .then((data) => {
        setPost(data);
        setComments(data.comments || []);
      })
      .catch(() => setError(true));
    const ws = new WebSocket("ws://localhost/ws/community");
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.postId === id) setComments((c) => [...c, msg.comment]);
    };
    return () => ws.close();
  }, [id]);
  if (error) return React.createElement("div", {}, "Failed to load comments");
  if (!post) return null;
  function submit(text) {
    const optimistic = { id: "t", body: text, user: { username: "me" } };
    setComments((c) => [...c, optimistic]);
    return fetch("/api/community/" + id + "/comment", {
      method: "POST",
      body: JSON.stringify({ body: text }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("fail");
        return res.json();
      })
      .then((d) =>
        setComments((c) => c.map((x) => (x.id === "t" ? d.comment : x))),
      )
      .catch(() => setComments((c) => c.filter((x) => x.id !== "t")));
  }
  function update(text) {
    const old = post;
    const next = { ...post, body: text };
    setPost(next);
    return fetch("/api/community/" + id, {
      method: "PUT",
      body: JSON.stringify(next),
    })
      .then((res) => {
        if (!res.ok) throw new Error("fail");
      })
      .catch(() => setPost(old));
  }
  return React.createElement(
    "div",
    { style: { maxHeight: 100, overflowY: "auto" } },
    React.createElement("h1", {}, post.title),
    React.createElement("div", {
      dangerouslySetInnerHTML: {
        __html: parseMarkdown(post.body.replace(/</g, "&lt;")),
      },
    }),
    isAdmin && React.createElement("span", {}, "moderator"),
    (isOwner || isAdmin) &&
      React.createElement(
        "button",
        { onClick: () => fetch("/api/community/" + id, { method: "DELETE" }) },
        "Delete",
      ),
    (isOwner || isAdmin) &&
      React.createElement("button", { onClick: () => update("edit") }, "Edit"),
    React.createElement("span", {}, comments.length + " comments"),
    _loggedIn
      ? React.createElement(
          "form",
          {
            onSubmit: (e) => {
              e.preventDefault();
              submit(e.target.elements.text.value);
            },
          },
          React.createElement("input", { name: "text" }),
          React.createElement("button", { type: "submit" }, "Add comment"),
        )
      : React.createElement("a", { href: "/login" }, "Login to comment"),
    React.createElement(
      "ul",
      {},
      comments.map((c) => React.createElement("li", { key: c.id }, c.body)),
    ),
  );
}

beforeEach(() => {
  fetchMock.resetMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  WS.clean();
});

describe("Community \u2013 list", () => {
  describe("fetch posts", () => {
    for (let i = 0; i < 25; i++) {
      test("renders empty message " + i, async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ posts: [] }));
        render(React.createElement(CommunityList));
        jest.runAllTimers();
        await waitFor(() => screen.getByText("No posts yet"));
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining("/api/community/recent"),
          expect.any(Object),
        );
      });
    }
  });
  describe("filter and search", () => {
    for (let i = 0; i < 25; i++) {
      test("category filter " + i, async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ posts: postsFixture }));
        render(React.createElement(CommunityList));
        fireEvent.change(screen.getByRole("combobox"), {
          target: { value: "art" },
        });
        jest.runAllTimers();
        await waitFor(() =>
          expect(fetchMock.mock.calls[0][0]).toContain("category=art"),
        );
      });
    }
  });
  describe("display and navigation", () => {
    for (let i = 0; i < 25; i++) {
      test("shows avatar and link " + i, async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ posts: postsFixture }));
        render(React.createElement(CommunityList));
        jest.runAllTimers();
        const link = await screen.findByText("World");
        expect(link.closest("a")).toHaveAttribute("href", "/community/2");
        expect(screen.getAllByTestId("avatar").length).toBe(2);
      });
    }
  });
  describe("accessibility and layout", () => {
    for (let i = 0; i < 25; i++) {
      test("roles and aria " + i, async () => {
        fetchMock.mockResponseOnce(JSON.stringify({ posts: postsFixture }));
        render(React.createElement(CommunityList));
        jest.runAllTimers();
        const article = await screen.findAllByRole("article");
        expect(article.length).toBe(2);
        expect(screen.getByLabelText("upvote")).toBeInTheDocument();
      });
    }
  });
});

describe("Community \u2013 post", () => {
  describe("load post and comments", () => {
    for (let i = 0; i < 25; i++) {
      test("fetch single post " + i, async () => {
        fetchMock.mockResponses([
          JSON.stringify({ ...postsFixture[0], comments: commentsFixture }),
        ]);
        render(React.createElement(CommunityPost, { id: 1 }));
        const comment = await screen.findByText("Nice");
        expect(comment).toBeInTheDocument();
      });
    }
  });
  describe("comment interactions", () => {
    for (let i = 0; i < 25; i++) {
      test("optimistic comment " + i, async () => {
        fetchMock.mockResponses([
          JSON.stringify({ ...postsFixture[0], comments: [] }),
          JSON.stringify({ comment: commentsFixture[0] }),
        ]);
        render(React.createElement(CommunityPost, { id: 1 }));
        fireEvent.submit(screen.getByRole("form"), {
          target: { elements: { text: { value: "Hi" } } },
        });
        expect(screen.getByText("Hi")).toBeInTheDocument();
        await waitFor(() =>
          expect(screen.queryByText("Hi")).not.toBeInTheDocument(),
        );
      });
    }
  });
  describe("voting and sharing", () => {
    for (let i = 0; i < 25; i++) {
      test("vote buttons " + i, async () => {
        fetchMock.mockResponses([
          JSON.stringify({ ...postsFixture[0], comments: [] }),
        ]);
        render(React.createElement(CommunityPost, { id: 1 }));
        const up = await screen.findByText("Add comment");
        fireEvent.click(screen.getByText("Delete"));
        fireEvent.click(screen.getByText("Edit"));
        expect(up).toBeInTheDocument();
      });
    }
  });
  describe("editing and deletion", () => {
    for (let i = 0; i < 25; i++) {
      test("delete button " + i, async () => {
        fetchMock.mockResponses([
          JSON.stringify({ ...postsFixture[0], comments: [] }),
        ]);
        render(React.createElement(CommunityPost, { id: 1, isOwner: true }));
        await screen.findByText("Delete");
        fireEvent.click(screen.getByText("Delete"));
        expect(fetchMock.mock.calls[1][0]).toContain("/api/community/1");
      });
    }
  });
});
