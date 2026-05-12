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

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 90000
    });

    await page.waitForTimeout(7000);

    try {
      const button =
        await page.$('text=Agora não');

      if (button) {
        await button.click();
      }
    } catch (e) {}

    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 3000);
      await page.waitForTimeout(1500);
    }

    const comments = await page.evaluate(() => {

      const results = [];

      const elements =
        document.querySelectorAll('article ul');

      elements.forEach(el => {

        const username =
          el.querySelector('h3')?.innerText;

        const spans =
          el.querySelectorAll('span');

        let text = '';

        spans.forEach(span => {

          if (
            span.innerText &&
            span.innerText.length > text.length
          ) {
            text = span.innerText;
          }
        });

        if (
          username &&
          text &&
          text !== username
        ) {
          results.push({
            username,
            text
          });
        }
      });

      return results;
    });

    console.log(comments);

    await browser.close();

    return res.json({
      comments
    });

  } catch (err) {

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
