const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.send('API ONLINE');
});

app.post('/comments', async (req, res) => {

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      error: 'URL obrigatória'
    });
  }

  let browser;

  try {

    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    const page = await browser.newPage({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });

    await page.setViewportSize({
      width: 1366,
      height: 768
    });

    console.log('Abrindo URL:', url);

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 90000
    });

    await page.waitForTimeout(7000);

    // fecha popup/login wall
    try {

      const popupButtons = await page.$$(
        'button, div[role="button"]'
      );

      for (const button of popupButtons) {

        const text =
          await button.innerText();

        if (
          text.includes('Agora não') ||
          text.includes('Not now')
        ) {

          await button.click();

          console.log('Popup fechado');

          break;
        }
      }

    } catch (e) {

      console.log(
        'Nenhum popup encontrado'
      );
    }

    // carrega mais comentários
    for (let i = 0; i < 120; i++) {

      try {

        const buttons = await page.$$(
          'button, div[role="button"]'
        );

        console.log(
          'Botões encontrados:',
          buttons.length
        );

        let clicked = false;

        for (const button of buttons) {

          try {

            const text =
              await button.innerText();

            console.log(
              'Texto botão:',
              text
            );

            if (
              text.includes(
                'Ver mais comentários'
              ) ||
              text.includes(
                'View more comments'
              ) ||
              text.includes(
                'Load more comments'
              ) ||
              text.includes(
                'View all comments'
              ) ||
              text.includes(
                'Mais comentários'
              ) ||
              text.includes(
                'See more comments'
              )
            ) {

              console.log(
                'Carregando mais comentários'
              );

              await button.click();

              clicked = true;

              await page.waitForTimeout(3000);

              break;
            }

          } catch (e) {}
        }

        // scroll ajuda no lazy loading
        await page.mouse.wheel(0, 7000);

        await page.waitForTimeout(2000);

        if (!clicked) {

          console.log(
            'Nenhum botão encontrado nesse ciclo'
          );
        }

      } catch (e) {

        console.log(
          'Erro ao carregar comentários',
          e
        );
      }
    }

    console.log(
      'Total spans:',
      await page.locator('span').count()
    );

    // DEBUG HTML
    const html = await page.content();

    console.log('Página carregada');

    console.log(
      html.substring(0, 5000)
    );

    // captura comentários reais
    const comments = await page.evaluate(() => {

      const results = [];

      const commentBlocks =
        document.querySelectorAll('ul ul');

      commentBlocks.forEach(block => {

        try {

          const usernameElement =
            block.querySelector('h3');

          const spans =
            block.querySelectorAll('span');

          const username =
            usernameElement
              ?.innerText
              ?.trim();

          let commentText = '';

          spans.forEach(span => {

            const text =
              span.innerText?.trim();

            if (
              text &&
              text !== username &&
              text.length >
                commentText.length
            ) {

              commentText = text;
            }
          });

          if (
            username &&
            commentText &&
            commentText.length > 1
          ) {

            results.push({
              username,
              text: commentText
            });
          }

        } catch (e) {}
      });

      // remove duplicados
      const unique = results.filter(
        (item, index, self) =>
          index === self.findIndex(
            t =>
              t.username ===
                item.username &&
              t.text === item.text
          )
      );

      return unique;
    });

    console.log(
      'Comentários encontrados:'
    );

    console.log(comments);

    await browser.close();

    return res.json({
      total: comments.length,
      comments
    });

  } catch (err) {

    console.error('ERRO GERAL:');

    console.error(err);

    if (browser) {
      await browser.close();
    }

    return res.status(500).json({
      error: err.message
    });
  }
});

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(
    `Servidor rodando na porta ${PORT}`
  );
});
