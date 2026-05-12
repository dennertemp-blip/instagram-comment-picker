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

    const page = await browser.newPage();

    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForTimeout(5000);

    for (let i = 0; i < 6; i++) {
      await page.mouse.wheel(0, 3000);
      await page.waitForTimeout(1200);
    }

    const comments = await page.evaluate(() => {
      const results = [];

      const elements =
        document.querySelectorAll('ul ul');

      elements.forEach(el => {
        const username =
          el.querySelector('h3')?.innerText;

        const text =
          el.querySelector('span')?.innerText;

        if (username && text) {
          results.push({
            username,
            text
          });
        }
      });

      return results;
    });

    await browser.close();

    return res.json({
      comments
    });

  } catch (err) {

    if (browser) {
      await browser.close();
    }

    console.error(err);

    return res.status(500).json({
      error: err.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
