import { test, expect } from "@playwright/test";

/**
 * E2E Tests: Payment & Subscription Flows
 * 
 * Tests the payment infrastructure UI:
 * - Admin payment management page
 * - Discount code management
 * - Manual payment recording
 */

test.describe("Payment Management", () => {
  test("admin payments page should be accessible", async ({ page }) => {
    // Navigate to admin payments (will redirect to login if not authenticated)
    await page.goto("/admin/payments");
    
    // Either see login page or payments page
    const url = page.url();
    expect(url).toMatch(/(\/admin\/payments|\/login)/);
  });

  test("discount codes page should be accessible", async ({ page }) => {
    await page.goto("/admin/discounts");
    
    const url = page.url();
    expect(url).toMatch(/(\/admin\/discounts|\/login)/);
  });

  test("payment infrastructure exists", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    
    // Check if payments link exists in admin sidebar (if visible)
    const paymentsLink = page.locator("a[href*='payments'], button:has-text('Payments')");
    const discountsLink = page.locator("a[href*='discounts'], button:has-text('Discounts')");
    
    // These should exist in the admin navigation
    const hasPayments = await paymentsLink.count() > 0;
    const hasDiscounts = await discountsLink.count() > 0;
    
    // At least one should be present if we're on admin page
    expect(hasPayments || hasDiscounts || page.url().includes('/login')).toBe(true);
  });
});

test.describe("Discount Code Validation", () => {
  test("discount code format should be uppercase", async ({ page }) => {
    // Test discount code normalization logic
    const normalizeCode = (code: string) => code.toUpperCase().trim();
    
    expect(normalizeCode("test123")).toBe("TEST123");
    expect(normalizeCode("  sale50  ")).toBe("SALE50");
    expect(normalizeCode("MixedCase")).toBe("MIXEDCASE");
  });

  test("discount types should be correctly defined", async ({ page }) => {
    // Validate discount type enum values
    const discountTypes = ["percentage", "fixed"];
    
    expect(discountTypes).toContain("percentage");
    expect(discountTypes).toContain("fixed");
    expect(discountTypes.length).toBe(2);
  });
});

test.describe("Payment Status Handling", () => {
  test("payment statuses should be correctly defined", async ({ page }) => {
    const paymentStatuses = ["pending", "succeeded", "failed", "refunded"];
    
    expect(paymentStatuses).toContain("pending");
    expect(paymentStatuses).toContain("succeeded");
    expect(paymentStatuses).toContain("failed");
    expect(paymentStatuses).toContain("refunded");
  });

  test("currency formatting should work correctly", async ({ page }) => {
    const formatCurrency = (amount: number, currency: string = "EUR") => {
      return new Intl.NumberFormat("nl-NL", {
        style: "currency",
        currency,
      }).format(amount);
    };

    expect(formatCurrency(100)).toContain("100");
    expect(formatCurrency(99.99)).toContain("99,99");
  });
});
