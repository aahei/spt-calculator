import { test, expect } from '@playwright/test';

test.describe('Manual Input Calculation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Select tax year 2024
    const yearSelect = page.getByRole('combobox', { name: 'Tax Year:' });
    await yearSelect.waitFor({ state: 'visible' });
    await yearSelect.click();
    
    const yearOption = page.getByRole('option', { name: '2024' });
    await yearOption.waitFor({ state: 'visible' });
    await yearOption.click();
  });

  test('should calculate SPT correctly for a passing case', async ({ page }) => {
    // Wait for the form to be visible
    await page.waitForSelector('form');
    
    // Fill in the manual input form
    await page.getByLabel('Days in 2024 (366 days max)').waitFor({ state: 'visible' });
    await page.getByLabel('Days in 2024 (366 days max)').fill('244');
    
    await page.getByLabel('Days in 2023 (365 days max)').waitFor({ state: 'visible' });
    await page.getByLabel('Days in 2023 (365 days max)').fill('0');
    
    await page.getByLabel('Days in 2022 (365 days max)').waitFor({ state: 'visible' });
    await page.getByLabel('Days in 2022 (365 days max)').fill('0');

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
    await expect(page.getByText('244 days')).toBeVisible();
    await expect(page.getByText('First Prior Year (2023):')).toBeVisible();
    await expect(page.getByText('0 days × 1/3 = 0.00 days')).toBeVisible();
    await expect(page.getByText('Second Prior Year (2022):')).toBeVisible();
    await expect(page.getByText('0 days × 1/6 = 0.00 days')).toBeVisible();
    await expect(page.getByText('Total Days:')).toBeVisible();
    await expect(page.getByText('244.00 days')).toBeVisible();
    await expect(page.getByText('Requirements to meet the test:')).toBeVisible();
    await expect(page.getByText('At least 31 days in the current year: ✓')).toBeVisible();
    await expect(page.getByText('At least 183 total calculated days: ✓')).toBeVisible();
  });
}); 