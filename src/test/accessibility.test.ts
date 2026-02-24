import { describe, it, expect } from "vitest";
import * as matchers from "vitest-axe/matchers";
import { axe } from "vitest-axe";

// Extend expect with axe matchers
expect.extend(matchers);

// Augment vitest types
declare module "vitest" {
  interface Assertion<T = any> {
    toHaveNoViolations(): T;
  }
}

/**
 * Accessibility Testing with axe-core
 *
 * Uses vitest-axe to run real WCAG 2.1 AA checks against rendered HTML.
 * Tests fail when WCAG 2.1 AA violations are detected.
 */

describe("Accessibility – axe-core WCAG 2.1 AA", () => {
  it("should pass axe checks on a valid accessible page structure", async () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <main>
        <h1>Welkom bij Huis van het Arabisch</h1>
        <nav aria-label="Hoofdnavigatie">
          <a href="/dashboard">Dashboard</a>
          <a href="/self-study">Zelfstudie</a>
        </nav>
        <section aria-labelledby="courses-heading">
          <h2 id="courses-heading">Cursussen</h2>
          <p>Bekijk onze beschikbare cursussen.</p>
          <button type="button">Inschrijven</button>
        </section>
        <form aria-label="Zoekformulier">
          <label for="search-input">Zoeken</label>
          <input id="search-input" type="text" />
          <button type="submit">Zoek</button>
        </form>
      </main>
    `;
    document.body.appendChild(container);

    const results = await axe(container);
    expect(results).toHaveNoViolations();

    document.body.removeChild(container);
  });

  it("should detect missing button name (WCAG violation)", async () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <main>
        <h1>Test Page</h1>
        <button type="button"></button>
      </main>
    `;
    document.body.appendChild(container);

    const results = await axe(container);
    const buttonViolation = results.violations.find(
      (v) => v.id === "button-name"
    );
    expect(buttonViolation).toBeDefined();

    document.body.removeChild(container);
  });

  it("should detect missing form label (WCAG violation)", async () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <main>
        <h1>Test Page</h1>
        <input type="text" />
      </main>
    `;
    document.body.appendChild(container);

    const results = await axe(container);
    const labelViolation = results.violations.find(
      (v) => v.id === "label"
    );
    expect(labelViolation).toBeDefined();

    document.body.removeChild(container);
  });

  it("should pass axe checks on a properly labeled form", async () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <main>
        <h1>Registreren</h1>
        <form aria-label="Registratieformulier">
          <div>
            <label for="name">Naam</label>
            <input id="name" type="text" required aria-required="true" />
          </div>
          <div>
            <label for="email">E-mail</label>
            <input id="email" type="email" required aria-required="true" />
          </div>
          <button type="submit">Account aanmaken</button>
        </form>
      </main>
    `;
    document.body.appendChild(container);

    const results = await axe(container);
    expect(results).toHaveNoViolations();

    document.body.removeChild(container);
  });
});

// Axe-core configuration export for E2E / external use
export const axeConfig = {
  rules: {
    "color-contrast": { enabled: true },
    "heading-order": { enabled: true },
    "label": { enabled: true },
    "link-name": { enabled: true },
    "button-name": { enabled: true },
    "image-alt": { enabled: true },
    "form-field-multiple-labels": { enabled: true },
    "duplicate-id": { enabled: true },
    "landmark-one-main": { enabled: true },
    "page-has-heading-one": { enabled: true },
  },
  tags: ["wcag2a", "wcag2aa", "wcag21aa"],
};
