// Playwright-E2E-Test: Szenario 1 von Hand nachgespielt (Vertrieb → Säge → Kommissionierung → Verladung → Montage)
// Ausführen: npx playwright test e2e-szenario1.spec.js   (BASE_URL auf die Vercel-Adresse setzen)
import { test, expect } from '@playwright/test';
const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function tapAll(page, sel){ for(let i=0;i<80;i++){ const el=page.locator(sel).first(); if(await el.count()===0) break; await el.click(); } }

test('Szenario 1: ein Auftrag läuft durch alle Stationen', async ({ page }) => {
  await page.goto(BASE); await page.evaluate(()=>localStorage.clear()); await page.reload();
  // Vertrieb: Auftrag bestätigen
  await page.click('button[data-scen="1"]');
  await expect(page.locator('.lock.open')).toBeVisible();          // ATP bestanden
  await page.click('#btnCalc');
  await expect(page.locator('h1')).toHaveText('Rezeptur');
  // Säge (Tablet): alle Stangen scannen und buchen
  await page.click('button[data-view="werkstatt"]'); await page.click('button[data-station="saege"]');
  for(let i=0;i<40;i++){ if(await page.locator('button[data-tact="scan"]').count()===0) break; await page.click('button[data-tact="scan"]'); await page.click('button[data-tact="done"]'); }
  await expect(page.locator('.tbig.ok')).toContainText('Alles geschnitten');
  // Kommissionierung (Tablet)
  await page.click('button[data-station="komm"]'); await tapAll(page,'button[data-pick-t]:not(.on)');
  await expect(page.locator('.tbig.ok').last()).toContainText('versandbereit');
  // Verladung: ohne Z9 muss das Tor gesperrt bleiben
  await page.click('button[data-station="verl"]');
  const keys=await page.locator('button[data-load-t]').evaluateAll(els=>els.map(e=>e.dataset.loadT));
  for(const k of keys.filter(k=>!k.endsWith('|z9'))) await page.click(`button[data-load-t="${k}"]`);
  await expect(page.locator('button[data-tact="depart"]')).toBeDisabled();
  await page.click('button[data-load-t$="|z9"]'); await page.click('button[data-tact="depart"]');
  await expect(page.locator('.tbig.ok')).toContainText('Abgefahren');
  // Montage: Checkliste, Unterschrift, Abnahme
  await page.click('button[data-station="mont"]'); await tapAll(page,'button[data-mont-t]:not(.on)');
  await page.click('button[data-tact="sign"]'); await page.click('button[data-tact="abnahme"]');
  await expect(page.locator('.tbig.ok').last()).toContainText('Abgenommen');
  // Status muss "Montiert" sein, Bestand muss abgebucht sein
  const status=await page.evaluate(()=>statusOf(cur()));
  expect(status).toBe(7);
  const stangen500=await page.evaluate(()=>S.stock['7576-7016-500']);
  expect(stangen500).toBe(2); // 7 im Seed − 5 Träger
});

test('Szenario 5: ohne Material keine Bestätigung', async ({ page }) => {
  await page.goto(BASE); await page.evaluate(()=>localStorage.clear()); await page.reload();
  await page.click('button[data-scen="5"]');
  await expect(page.locator('#btnCalc')).toBeDisabled();
  await page.click('button[data-view="bestand"]'); await page.click('#btnOrder');
  await page.click('button[data-view="werkstatt"]'); await page.click('button[data-station="we"]'); await page.click('button[data-tact="book"]');
  await page.click('button[data-view="auftrag"]');
  await expect(page.locator('#btnCalc')).toBeEnabled();
});
