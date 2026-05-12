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

    // tenta fechar popup/login wall
    try {

      const buttons = await page.$$('button');

      for (const button of buttons) {

        const text = await button.innerText();

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
      console.log('Nenhum popup encontrado');
    }

    // scroll para carregar comentários
    for (let i = 0; i < 10; i++) {

      await page.mouse.wheel(0, 4000);

      await page.waitForTimeout(2000);

      console.log(`Scroll ${i + 1}`);
    }

    // DEBUG HTML
    const html = await page.content();

    console.log('Página carregada');

    console.log(html.substring(0, 5000));

    // captura textos possíveis
    const comments = await page.evaluate(() => {

      const results = [];

      const spans = document.querySelectorAll('span');

      spans.forEach(span => {

        const text = span.innerText?.trim();

        if (
          text &&
          text.length > 3 &&
          text.length < 300 &&
          !text.includes('Curtir') &&
          !text.includes('Reply') &&
          !text.includes('Responder') &&
          !text.includes('Seguir') &&
          !text.includes('Following') &&
          !text.includes('Instagram') &&
          !text.includes('Meta') &&
          !text.includes('Threads')
        ) {

          results.push({
            username: 'usuario',
            text
          });
        }
      });

      // remove duplicados
      const unique = results.filter(
        (item, index, self) =>
          index === self.findIndex(
            t => t.text === item.text
          )
      );

      return unique;
    });

    console.log('Comentários encontrados:');

    console.log(comments);

    await browser.close();

    return res.json({
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(
    `Servidor rodando na porta ${PORT}`
  );
});
