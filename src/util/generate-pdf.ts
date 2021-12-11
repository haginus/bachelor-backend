import puppeteer, { PDFOptions } from "puppeteer";

export async function generatePdf(htmlContent: string, options: PDFOptions): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: ['--disable-dev-shm-usage', '--no-sandbox'],
  });
  const page = await browser.newPage();

  await page.setContent(htmlContent);

  return page.pdf(options);
}