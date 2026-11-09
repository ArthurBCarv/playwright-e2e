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
      waitUntil: 'domcontentloaded'
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

  test('deve limpar a busca e ocultar a mensagem de nenhum resultado', async ({
    page
  }) => {
    const searchInput = page.getByPlaceholder(
      'Pesquisar pelo nome do evento...'
    );
    const eventLinks = page
      .getByRole('main')
      .getByRole('link', { name: /\d{4} às/ });
    const emptyState = page.getByText('Nenhum resultado encontrado');

    await expect(eventLinks.first()).toBeVisible();

    // Aguarda a busca funcionar mesmo se a página ainda estiver hidratando.
    await expect(async () => {
      await searchInput.clear();
      await searchInput.fill('eventoinexistentexyz123');
      await expect(emptyState).toBeVisible({ timeout: 5000 });
    }).toPass();

    await searchInput.clear();

    await expect(searchInput).toHaveValue('');
    await expect(emptyState).toBeHidden();
    await expect(eventLinks.first()).toBeVisible();
  });

  test('deve navegar para Fale conosco pelo menu', async ({ page }) => {
    await page
      .getByRole('banner')
      .getByRole('link', { name: 'Fale conosco' })
      .filter({ visible: true })
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
