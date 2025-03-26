import { test, expect } from '@playwright/test';

test.describe('I94 Data Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Switch to the Date Range tab
    const dateRangeTab = page.getByRole('tab', { name: 'Date Ranges' });
    await dateRangeTab.waitFor({ state: 'visible' });
    await dateRangeTab.click();
  });

  test('should import valid I94 data correctly', async ({ page }) => {
    // Open import dialog
    const importButton = page.getByRole('button', { name: 'Import from I-94' });
    await importButton.waitFor({ state: 'visible' });
    await importButton.click();

    // Fill in valid I94 data with realistic travel history
    const validI94Data = `1	2024-12-31	Arrival	TST
2	2024-12-30	Departure	TST
3	2024-11-20	Arrival	TST
4	2024-09-15	Arrival	TST
5	2024-03-10	Departure	TST
6	2024-01-10	Arrival	TST
7	2023-12-20	Departure	TST
8	2023-09-15	Arrival	TST
9	2023-09-10	Departure	TST
10	2023-09-10	Arrival	TST
11	2023-06-30	Departure	TST
12	2022-08-31	Arrival	TST
13	2022-08-20	Departure	TST
14	2021-09-15	Arrival	TST`;

    const textarea = page.getByRole('textbox');
    await textarea.waitFor({ state: 'visible' });
    await textarea.fill(validI94Data);

    // Confirm import
    const importConfirmButton = page.getByRole('button', { name: 'Import' });
    await importConfirmButton.waitFor({ state: 'visible' });
    await importConfirmButton.click();

    // Wait for the data to be imported
    await page.waitForSelector('text=2024-12-31');
    await page.waitForSelector('text=2021-09-15');

    // Verify the data was imported
    await expect(page.getByText('2024-12-31')).toBeVisible();
    await expect(page.getByText('2021-09-15')).toBeVisible();
  });

  test('should show error for invalid I94 data format', async ({ page }) => {
    // Open import dialog
    const importButton = page.getByRole('button', { name: 'Import from I-94' });
    await importButton.waitFor({ state: 'visible' });
    await importButton.click();

    // Fill in invalid I94 data
    const invalidI94Data = `Invalid Format
Missing required fields`;

    const textarea = page.getByRole('textbox');
    await textarea.waitFor({ state: 'visible' });
    await textarea.fill(invalidI94Data);

    // Try to import
    const importConfirmButton = page.getByRole('button', { name: 'Import' });
    await importConfirmButton.waitFor({ state: 'visible' });
    await importConfirmButton.click();

    // Verify error message
    await expect(page.getByText('No valid travel periods found in the data. Please check the format and try again.')).toBeVisible();
  });

  test('should handle missing departure dates correctly', async ({ page }) => {
    // Open import dialog
    const importButton = page.getByRole('button', { name: 'Import from I-94' });
    await importButton.waitFor({ state: 'visible' });
    await importButton.click();

    // Fill in I94 data with one pair of consecutive arrivals
    const i94DataWithMissingDepartures = `1	2024-12-31	Arrival	TST
2	2024-12-30	Departure	TST
3	2024-11-20	Arrival	TST
4	2024-09-15	Arrival	TST
5	2024-03-10	Departure	TST
6	2024-01-10	Arrival	TST
7	2023-12-20	Departure	TST
8	2023-09-15	Arrival	TST
9	2023-09-10	Departure	TST
10	2023-09-10	Arrival	TST
11	2023-06-30	Departure	TST
12	2022-08-31	Arrival	TST
13	2022-08-20	Departure	TST
14	2021-09-15	Arrival	TST`;

    const textarea = page.getByRole('textbox');
    await textarea.waitFor({ state: 'visible' });
    await textarea.fill(i94DataWithMissingDepartures);

    // Try to import
    const importConfirmButton = page.getByRole('button', { name: 'Import' });
    await importConfirmButton.waitFor({ state: 'visible' });
    await importConfirmButton.click();

    // Verify warning message
    const warningMessage = page.getByText(/Found two consecutive arrivals without a departure in between: 2024-09-15 and 2024-11-20/);
    await expect(warningMessage).toBeVisible();
  });
}); 