
import { MailerOptions, TemplateAdapter } from '@nestjs-modules/mailer';
import { render } from '@react-email/render';
import inlineCSS from 'inline-css';
import * as path from 'path';

export class ReactEmailAdapter implements TemplateAdapter {

  compile(mail: any, callback: (err?: any, body?: string) => any, options: MailerOptions): void {
    const templateExt = path.extname(mail.data.template) || '.js';
    const templateName = path.basename(mail.data.template, templateExt);
    const templateDir =
      options.template?.dir ?? path.dirname(mail.data.template);

    this.renderTemplate(path.join(templateDir, templateName + templateExt), mail.data.context)
      .then((html) => {
        mail.data.html = html;
        return callback();
      })
      .catch(callback);
  }

  async renderTemplate(templatePath: string, context: Record<string, any>): Promise<string> {
    const { default: { default: EmailComponent } } = await import(templatePath);
    const rendered = await render(EmailComponent(context));

    return inlineCSS(rendered, { url: ' ' });
  }
}