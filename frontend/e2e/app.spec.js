import { test, expect } from '@playwright/test';

test.describe('NLQDB E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('login flow', async ({ page }) => {
    // Should show login page
    await expect(page.locator('h1')).toContainText('NLQDB');
    
    // Fill login form
    await page.fill('input[type="email"]', 'analyst@example.com');
    await page.fill('input[type="password"]', 'analyst123');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should redirect to chat
    await expect(page).toHaveURL(/.*chat/);
    await expect(page.locator('h1')).toContainText('Ask a Question');
  });

  test('natural language query flow', async ({ page }) => {
    // Login first
    await page.fill('input[type="email"]', 'analyst@example.com');
    await page.fill('input[type="password"]', 'analyst123');
    await page.click('button[type="submit"]');
    
    // Wait for chat page
    await page.waitForURL(/.*chat/);
    
    // Type query
    await page.fill('input[placeholder*="Show me"]', 'Show customers from New York');
    
    // Translate
    await page.click('button:has-text("Translate")');
    
    // Wait for translation result
    await expect(page.locator('text=Generated Query')).toBeVisible();
    
    // Execute query
    await page.click('button:has-text("Execute Query")');
    
    // Wait for results
    await expect(page.locator('text=Results')).toBeVisible();
  });

  test('tables navigation', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', 'analyst@example.com');
    await page.fill('input[type="password"]', 'analyst123');
    await page.click('button[type="submit"]');
    
    // Navigate to tables
    await page.click('a:has-text("Tables")');
    await expect(page).toHaveURL(/.*tables/);
    
    // Should show collections
    await expect(page.locator('text=Collections')).toBeVisible();
    
    // Click on a collection
    await page.click('button:has-text("customers")');
    
    // Should show preview
    await expect(page.locator('text=Sample Data')).toBeVisible();
  });
});
