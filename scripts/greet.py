#!/usr/bin/env python3

"""Simple greeting script."""

import sys


def greet(name: str) -> str:
    return f"Hello, {name}!"


if __name__ == "__main__":
    name = sys.argv[1] if len(sys.argv) > 1 else "World"
    print(greet(name))
