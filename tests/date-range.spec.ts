import { test, expect } from '@playwright/test';

test.describe('Date Range Input Calculation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Switch to the Date Range tab
    const dateRangeTab = page.getByRole('tab', { name: 'Date Ranges' });
    await dateRangeTab.waitFor({ state: 'visible' });
    await dateRangeTab.click();
  });

  test('should calculate SPT correctly for a single date range', async ({ page }) => {
    // Wait for the form to be visible
    await page.waitForSelector('form');
    
    // Add a new date range
    const addButton = page.getByRole('button', { name: 'Add Period' });
    await addButton.waitFor({ state: 'visible' });
    await addButton.click();

    // Fill in the dates
    await page.getByLabel('Arrival Date').waitFor({ state: 'visible' });
    await page.getByLabel('Arrival Date').fill('2024-01-01');
    
    await page.getByLabel('Departure Date').waitFor({ state: 'visible' });
    await page.getByLabel('Departure Date').fill('2024-12-31');

    // Add the period
    await addButton.waitFor({ state: 'visible' });
    await addButton.click();

    // Submit the form
    const calculateButton = page.getByRole('button', { name: 'Calculate' });
    await calculateButton.waitFor({ state: 'visible' });
    await calculateButton.click();

    // Wait for results to appear
    await page.waitForSelector('text=You meet the Substantial Presence Test');
    
    // Verify the results
    await expect(page.getByText('You meet the Substantial Presence Test')).toBeVisible();
    await expect(page.getByText('Based on your input, you are considered a U.S. resident for tax purposes for 2024.')).toBeVisible();
    await expect(page.getByText('Calculation Breakdown')).toBeVisible();
    await expect(page.getByText('Current Year (2024):')).toBeVisible();
    await expect(page.getByText('366 days')).toBeVisible();
    await expect(page.getByText('First Prior Year (2023):')).toBeVisible();
    await expect(page.getByText('0 days × 1/3 = 0.00 days')).toBeVisible();
    await expect(page.getByText('Second Prior Year (2022):')).toBeVisible();
    await expect(page.getByText('0 days × 1/6 = 0.00 days')).toBeVisible();
    await expect(page.getByText('Total Days:')).toBeVisible();
    await expect(page.getByText('366.00 days')).toBeVisible();
    await expect(page.getByText('Requirements to meet the test:')).toBeVisible();
    await expect(page.getByText('At least 31 days in the current year: ✓')).toBeVisible();
    await expect(page.getByText('At least 183 total calculated days: ✓')).toBeVisible();
  });

  test('should handle multiple date ranges correctly', async ({ page }) => {
    // Wait for the form to be visible
    await page.waitForSelector('form');
    
    // Add first date range
    const addButton = page.getByRole('button', { name: 'Add Period' });
    await addButton.waitFor({ state: 'visible' });
    await addButton.click();

    await page.getByLabel('Arrival Date').waitFor({ state: 'visible' });
    await page.getByLabel('Arrival Date').fill('2024-01-01');
    
    await page.getByLabel('Departure Date').waitFor({ state: 'visible' });
    await page.getByLabel('Departure Date').fill('2024-06-30');

    await addButton.waitFor({ state: 'visible' });
    await addButton.click();

    // Add second date range
    await addButton.waitFor({ state: 'visible' });
    await addButton.click();

    await page.getByLabel('Arrival Date').waitFor({ state: 'visible' });
    await page.getByLabel('Arrival Date').fill('2024-07-01');
    
    await page.getByLabel('Departure Date').waitFor({ state: 'visible' });
    await page.getByLabel('Departure Date').fill('2024-12-31');

    await addButton.waitFor({ state: 'visible' });
    await addButton.click();

    // Submit the form
    const calculateButton = page.getByRole('button', { name: 'Calculate' });
    await calculateButton.waitFor({ state: 'visible' });
    await calculateButton.click();

    // Wait for results to appear
    await page.waitForSelector('text=You meet the Substantial Presence Test');
    
    // Verify the results
    await expect(page.getByText('You meet the Substantial Presence Test')).toBeVisible();
    await expect(page.getByText('Based on your input, you are considered a U.S. resident for tax purposes for 2024.')).toBeVisible();
    await expect(page.getByText('Calculation Breakdown')).toBeVisible();
    await expect(page.getByText('Current Year (2024):')).toBeVisible();
    await expect(page.getByText('366 days')).toBeVisible();
    await expect(page.getByText('First Prior Year (2023):')).toBeVisible();
    await expect(page.getByText('0 days × 1/3 = 0.00 days')).toBeVisible();
    await expect(page.getByText('Second Prior Year (2022):')).toBeVisible();
    await expect(page.getByText('0 days × 1/6 = 0.00 days')).toBeVisible();
    await expect(page.getByText('Total Days:')).toBeVisible();
    await expect(page.getByText('366.00 days')).toBeVisible();
    await expect(page.getByText('Requirements to meet the test:')).toBeVisible();
    await expect(page.getByText('At least 31 days in the current year: ✓')).toBeVisible();
    await expect(page.getByText('At least 183 total calculated days: ✓')).toBeVisible();
  });

  test('should show error for overlapping date ranges', async ({ page }) => {
    // Wait for the form to be visible
    await page.waitForSelector('form');
    
    // Add first date range
    const addButton = page.getByRole('button', { name: 'Add Period' });
    await addButton.waitFor({ state: 'visible' });
    await addButton.click();

    await page.getByLabel('Arrival Date').waitFor({ state: 'visible' });
    await page.getByLabel('Arrival Date').fill('2024-01-01');
    
    await page.getByLabel('Departure Date').waitFor({ state: 'visible' });
    await page.getByLabel('Departure Date').fill('2024-12-31');

    await addButton.waitFor({ state: 'visible' });
    await addButton.click();

    // Try to add overlapping date range
    await addButton.waitFor({ state: 'visible' });
    await addButton.click();

    await page.getByLabel('Arrival Date').waitFor({ state: 'visible' });
    await page.getByLabel('Arrival Date').fill('2024-06-01');
    
    await page.getByLabel('Departure Date').waitFor({ state: 'visible' });
    await page.getByLabel('Departure Date').fill('2024-07-31');

    await addButton.waitFor({ state: 'visible' });
    await addButton.click();

    // Verify error message
    await expect(page.getByText('This period overlaps with an existing period. Travel periods cannot overlap.')).toBeVisible();
  });

  test('should show error for invalid date combinations', async ({ page }) => {
    // Wait for the form to be visible
    await page.waitForSelector('form');
    
    // Try to add a period with both no arrival and no departure
    const addButton = page.getByRole('button', { name: 'Add Period' });
    await addButton.waitFor({ state: 'visible' });
    await addButton.click();

    await page.getByLabel('No arrival').waitFor({ state: 'visible' });
    await page.getByLabel('No arrival').check();
    
    await page.getByLabel('No departure').waitFor({ state: 'visible' });
    await page.getByLabel('No departure').check();

    await addButton.waitFor({ state: 'visible' });
    await addButton.click();

    // Verify error message
    await expect(page.getByText("Cannot have both 'No arrival' and 'No departure'")).toBeVisible();
  });
}); 