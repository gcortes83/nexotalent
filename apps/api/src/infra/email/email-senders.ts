import nodemailer from 'nodemailer';
import type { EmailMessage } from '../../modules/notifications/domain/notification.js';
import type { EmailSender } from '../../ports.js';

export interface OutboxEmail extends EmailMessage {
  sentAt: string;
}

/**
 * EMAIL_PROVIDER=log (desarrollo y tests): no envía nada; guarda los últimos correos en memoria
 * (visibles en GET /v1/dev/emails con DEMO_AUTH=true) y escribe una línea de log sin el cuerpo.
 */
export function createLogEmailSender(log: (msg: string) => void = () => {}): EmailSender & { outbox: () => OutboxEmail[] } {
  const sent: OutboxEmail[] = [];
  return {
    send: async (m) => {
      sent.unshift({ ...m, sentAt: new Date().toISOString() });
      sent.length = Math.min(sent.length, 100);
      log(`✉ email simulado: "${m.subject}"`);
    },
    outbox: () => structuredClone(sent),
  };
}

/** EMAIL_PROVIDER=smtp: en local/Docker apunta a Mailpit (http://localhost:8025 para ver los correos). */
export function createSmtpEmailSender(smtpUrl: string, from: string): EmailSender {
  const transport = nodemailer.createTransport(smtpUrl);
  return {
    send: async (m) => {
      await transport.sendMail({ from, to: m.to, subject: m.subject, text: m.text });
    },
  };
}
