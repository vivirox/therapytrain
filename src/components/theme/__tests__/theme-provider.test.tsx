import { render, screen, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { ThemeProvider, useTheme } from "../theme-provider";

const TestComponent = () => {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme("dark")}>Set Dark</button>
      <button onClick={() => setTheme("light")}>Set Light</button>
      <button onClick={() => setTheme("system")}>Set System</button>
    </div>
  );
};

describe("ThemeProvider", () => {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
  };

  const matchMediaMock = vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

  beforeEach(() => {
    vi.stubGlobal("localStorage", localStorageMock);
    vi.stubGlobal("matchMedia", matchMediaMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.removeAttribute("data-theme");
  });

  it("uses default theme when no storage value exists", () => {
    localStorageMock.getItem.mockReturnValue(null);
    render(
      <ThemeProvider defaultTheme="light">
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(document.documentElement.classList.contains("light")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("uses theme from storage when available", () => {
    localStorageMock.getItem.mockReturnValue("dark");
    render(
      <ThemeProvider defaultTheme="light">
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("updates theme when setTheme is called", async () => {
    localStorageMock.getItem.mockReturnValue("light");
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await act(async () => {
      screen.getByText("Set Dark").click();
    });

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorageMock.setItem).toHaveBeenCalledWith("ui-theme", "dark");
  });

  it("handles system theme correctly", async () => {
    localStorageMock.getItem.mockReturnValue(null);
    matchMediaMock.mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    render(
      <ThemeProvider defaultTheme="system">
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("system");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("system");
  });

  it("updates theme when system preference changes", async () => {
    localStorageMock.getItem.mockReturnValue("system");
    let mediaQueryCallback: (() => void) | null = null;
    const addEventListener = vi.fn((event, callback) => {
      if (event === "change") {
        mediaQueryCallback = callback;
      }
    });

    matchMediaMock.mockImplementation(() => ({
      matches: false,
      addEventListener,
      removeEventListener: vi.fn(),
    }));

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(document.documentElement.classList.contains("light")).toBe(true);

    // Simulate system theme change
    matchMediaMock.mockImplementation(() => ({
      matches: true,
      addEventListener,
      removeEventListener: vi.fn(),
    }));

    await act(async () => {
      if (mediaQueryCallback) mediaQueryCallback();
    });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("throws error when useTheme is used outside provider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow(
      "useTheme must be used within a ThemeProvider"
    );
    consoleError.mockRestore();
  });
}); 