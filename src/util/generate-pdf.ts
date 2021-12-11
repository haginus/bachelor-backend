import puppeteer, { PDFOptions } from "puppeteer";

export async function generatePdf(htmlContent: string, options: PDFOptions): Promise<Buffer> {
  const browser = await puppeteer.launch({
    //executablePath: 'google-chrome-stable',
    args: ['--disable-dev-shm-usage', '--no-sandbox'],
  });
  console.log(`Puppeteer launched.1`)
  const page = await browser.newPage();
  console.log('New page')

  await page.setContent(htmlContent);

  return page.pdf(options);
}

export default {
  generatePdf
}