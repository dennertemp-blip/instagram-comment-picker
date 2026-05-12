const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

const app = express();

app.use(cors());
app.use(express.json());

app.post('/comments', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      error: 'URL obrigatória'
    });
  }

  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage();

  try {
    await page.goto(url, {
      waitUntil: 'networkidle'
    });

    await page.waitForTimeout(5000);

    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 3000);
      await page.waitForTimeout(1500);
    }

    const comments = await page.evaluate(() => {
      const results = [];

      const elements = document.querySelectorAll('ul ul');

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

    res.json({
      comments
    });

  } catch (err) {
    await browser.close();

    res.status(500).json({
      error: err.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('Servidor rodando');
});
