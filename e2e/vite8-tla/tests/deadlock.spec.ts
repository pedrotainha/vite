import { test, expect } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * TLA Deadlock fix verification — @module-federation/vite + Vite 8 (rolldown)
 *
 * These tests assert the CORRECT behaviour after the fix:
 * - hostInit MUST be inlined as `await import()`, not an external <script src="">
 * - The app MUST mount even when remoteEntry or MF runtime chunks are blocked
 * - The app MUST mount under normal conditions
 *
 * On `main` (unfixed) these tests FAIL — proving the bug.
 * On the fix branch these tests PASS — proving the fix works.
 */

const DIST_DIR = path.resolve(import.meta.dirname, '../../../examples/vite8-tla/tla-host/dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');

test.describe('TLA Deadlock fix: @module-federation/vite + Vite 8', () => {
  test('hostInit must be inlined as await import(), not an external script', async () => {
    expect(fs.existsSync(ASSETS_DIR)).toBe(true);

    const indexHtml = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf-8');
    const jsFiles = fs.readdirSync(ASSETS_DIR).filter((f) => f.endsWith('.js'));

    // hostInit MUST be inlined — an external <script src="hostInit.js"> is fire-and-forget,
    // the browser does NOT await the module's TLA, causing a deadlock.
    const externalHostInit = indexHtml.match(/<script[^>]*src="([^"]*hostInit[^"]*)"[^>]*>/);
    const inlineHostInit = indexHtml.match(/<script[^>]*>await import\([^)]*hostInit[^)]*\)/);

    expect(externalHostInit, 'hostInit must NOT be an external script (fire-and-forget)').toBeFalsy();
    expect(inlineHostInit, 'hostInit must be an inline await import()').toBeTruthy();

    // hostInit chunk must exist and contain TLA
    const hostInitFile = jsFiles.find((f) => f.includes('hostInit'));
    expect(hostInitFile).toBeTruthy();
    const hostInitContent = fs.readFileSync(path.join(ASSETS_DIR, hostInitFile!), 'utf-8');
    expect(/\bawait\b/.test(hostInitContent), 'hostInit must contain TLA').toBe(true);
  });

  test('app must still mount when remoteEntry is blocked', async ({ page }) => {
    // Block remoteEntry — with the fix, hostInit is awaited inline so the app
    // should handle this gracefully instead of deadlocking forever.
    await page.route('**/remoteEntry*', async (route) => {
      await route.abort('blockedbyclient');
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5_000);

    // With the fix, React should mount — the app is not permanently hung
    const appTitle = page.getByTestId('app-title');
    await expect(appTitle).toBeVisible({ timeout: 5_000 });
  });

  test('app must still mount when MF runtime chunk is blocked', async ({ page }) => {
    // Block the MF runtime chunk
    await page.route('**/virtual_mf-REMOTE_ENTRY_ID*', async (route) => {
      await route.abort('blockedbyclient');
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5_000);

    // With the fix, React should mount
    const appTitle = page.getByTestId('app-title');
    await expect(appTitle).toBeVisible({ timeout: 5_000 });
  });

});
