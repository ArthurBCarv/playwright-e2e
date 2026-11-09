import { expect, test } from '@playwright/test';

test.use({
  // Usa o Chromium instalado pelo Playwright tanto localmente quanto no CI.
  channel: 'chromium'
});

test.describe('Eventiza E2E', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', error => {
      console.error(`[Eventiza] Erro JavaScript: ${error.message}`);
    });
    await page.goto('https://eventiza.com.br/', {
      // O HTML pode estar visível enquanto a navegação ainda está carregando.
      // Cada cenário aguarda os elementos necessários antes de interagir.
      waitUntil: 'commit'
    });
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus && !page.isClosed()) {
      console.error('[Eventiza] Diagnóstico da página:', {
        url: page.url(),
        headings: await page.locator('h1, h2, h3').allTextContents(),
        content: (
          await page.locator('body').innerText({ timeout: 5000 })
        ).slice(0, 3000)
      });
    }
  });

  test('deve exibir nenhum resultado ao buscar evento inexistente', async ({
    page
  }) => {
    const searchInput = page.getByPlaceholder(
      'Pesquisar pelo nome do evento...'
    );
    await expect(searchInput).toBeVisible();

    // Repete o preenchimento caso ele ocorra antes da hidratação da página
    await expect(async () => {
      await searchInput.clear();
      await searchInput.fill('eventoinexistentexyz123');
      await expect(page.getByText('Nenhum resultado encontrado')).toBeVisible({
        timeout: 5000
      });
    }).toPass();
  });

  test('deve abrir a página do evento ao clicar na listagem', async ({
    page
  }) => {
    const firstEvent = page
      .getByRole('main')
      .getByRole('link', { name: /\d{4} às/ })
      .first();
    const eventName = await firstEvent
      .getByRole('heading', { level: 3 })
      .innerText();
    const eventHref = await firstEvent.getAttribute('href');
    expect(eventHref).toMatch(/^\/evento\//);
    const eventUrl = new URL(eventHref!, page.url()).href;

    await firstEvent.click();

    await expect(page).toHaveURL(eventUrl);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(eventName);
  });

  test('deve navegar para Fale conosco pelo menu', async ({ page }) => {
    await page
      .getByRole('banner')
      .getByRole('link', { name: 'Fale conosco' })
      .first()
      .click();

    await expect(page).toHaveURL(/\/fale-conosco$/);
    await expect(
      page.getByRole('heading', { name: 'Fale Conosco', level: 1 })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Sou participante/ })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Sou organizador/ })
    ).toBeVisible();
  });
});
