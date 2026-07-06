import { act, render, screen } from "@testing-library/react";
import BookCover from "../BookCover";

/**
 * Controllable stand-in for the DOM `Image` constructor. BookCover creates
 * one per `coverImage` change and drives state off its onload/onerror
 * handlers — these tests fire those handlers manually to simulate fast,
 * slow, and broken loads without depending on real network timing.
 */
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  src = "";
}

let instances: MockImage[] = [];

beforeEach(() => {
  jest.useFakeTimers();
  instances = [];
  global.Image = jest.fn().mockImplementation(() => {
    const img = new MockImage();
    instances.push(img);
    return img;
  }) as unknown as typeof Image;
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function latestImage(): MockImage {
  const img = instances[instances.length - 1];
  if (!img) throw new Error("No Image() instance was created");
  return img;
}

describe("BookCover image loading", () => {
  test("valid fast image shows the illustrated cover", () => {
    render(
      <BookCover title="Test Story" onStart={jest.fn()} coverImage="https://example.com/cover.jpg" />
    );

    act(() => {
      latestImage().onload?.();
    });

    expect(screen.getByTestId("book-cover-poster")).toHaveAttribute("data-cover-state", "illustrated");
    expect(screen.getByTestId("book-cover-image")).toHaveAttribute("data-image-loaded", "true");
  });

  test("a slow but valid image does not permanently fall back to the plain cover", () => {
    render(
      <BookCover title="Test Story" onStart={jest.fn()} coverImage="https://example.com/slow-cover.jpg" />
    );

    // Still "loading" at this point — should already be showing the
    // illustrated-hero background (not the plain noise-texture cover).
    expect(screen.getByTestId("book-cover-poster")).toHaveAttribute("data-cover-state", "illustrated");

    // Blow past the old 4s "declare failure" window.
    act(() => {
      jest.advanceTimersByTime(4000);
    });

    // The timeout must not mark this as failed.
    expect(screen.getByTestId("book-cover-poster")).toHaveAttribute("data-cover-state", "illustrated");

    // The real image finishes loading late — onload must still be honored.
    act(() => {
      latestImage().onload?.();
    });

    expect(screen.getByTestId("book-cover-poster")).toHaveAttribute("data-cover-state", "illustrated");
    expect(screen.getByTestId("book-cover-image")).toHaveAttribute("data-image-loaded", "true");
  });

  test("a broken image URL still falls back to the plain cover", () => {
    render(
      <BookCover title="Test Story" onStart={jest.fn()} coverImage="https://example.com/broken.jpg" />
    );

    act(() => {
      latestImage().onerror?.();
    });

    expect(screen.getByTestId("book-cover-poster")).toHaveAttribute("data-cover-state", "plain");
    expect(screen.queryByTestId("book-cover-image")).not.toBeInTheDocument();
  });

  test("the timeout firing before any real event never declares failure on its own", () => {
    render(
      <BookCover title="Test Story" onStart={jest.fn()} coverImage="https://example.com/hung.jpg" />
    );

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    // No onload/onerror ever fired — must still be treated as the
    // illustrated cover, never the plain fallback.
    expect(screen.getByTestId("book-cover-poster")).toHaveAttribute("data-cover-state", "illustrated");
  });

  test("switching to a new coverImage resets loading/error state", () => {
    const { rerender } = render(
      <BookCover title="Test Story" onStart={jest.fn()} coverImage="https://example.com/first.jpg" />
    );

    act(() => {
      latestImage().onerror?.();
    });
    expect(screen.getByTestId("book-cover-poster")).toHaveAttribute("data-cover-state", "plain");

    rerender(
      <BookCover title="Test Story" onStart={jest.fn()} coverImage="https://example.com/second.jpg" />
    );

    // New coverImage must not inherit the previous failure.
    expect(screen.getByTestId("book-cover-poster")).toHaveAttribute("data-cover-state", "illustrated");
    expect(screen.getByTestId("book-cover-image")).toHaveAttribute("data-image-loaded", "false");

    act(() => {
      latestImage().onload?.();
    });
    expect(screen.getByTestId("book-cover-image")).toHaveAttribute("data-image-loaded", "true");
  });

  test("a stale onload from a superseded image does not affect the new image's state", () => {
    const { rerender } = render(
      <BookCover title="Test Story" onStart={jest.fn()} coverImage="https://example.com/first.jpg" />
    );
    const firstImage = latestImage();

    rerender(
      <BookCover title="Test Story" onStart={jest.fn()} coverImage="https://example.com/second.jpg" />
    );

    // The first Image's onerror fires late (after the prop changed) — the
    // effect cleanup's `cancelled` flag must prevent this stale callback
    // from touching state for the new image.
    act(() => {
      firstImage.onerror?.();
    });

    expect(screen.getByTestId("book-cover-poster")).toHaveAttribute("data-cover-state", "illustrated");
  });

  test("no coverImage renders the plain cover immediately with no Image() created", () => {
    render(<BookCover title="Test Story" onStart={jest.fn()} />);

    expect(screen.getByTestId("book-cover-poster")).toHaveAttribute("data-cover-state", "plain");
    expect(instances).toHaveLength(0);
  });
});
