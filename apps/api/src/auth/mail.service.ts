import { Injectable, Logger } from '@nestjs/common';

/**
 * Stub d'envoi d'e-mail : aucun fournisseur n'est spécifié dans claude.md et
 * aucune clé n'est configurée. Le lien est loggé pour rester utilisable en
 * développement ; l'interface est prête à être branchée sur un vrai
 * fournisseur (Resend, SES, ...) sans changer le reste du code d'auth.
 *
 * claude.md §11 interdit tout email ou token dans les logs. Ce log de
 * confort n'est donc émis qu'en dehors de la production, et l'email est
 * masqué (le lien lui-même — qui contient le token — reste nécessaire pour
 * tester le flux localement sans serveur SMTP).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const link = `${process.env.WEB_ORIGIN ?? 'http://localhost:5173'}/verification-email?token=${token}`;
    this.logDevOnly(`Email de vérification pour ${maskEmail(email)} : ${link}`);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const link = `${process.env.WEB_ORIGIN ?? 'http://localhost:5173'}/reinitialisation-mot-de-passe?token=${token}`;
    this.logDevOnly(`Email de réinitialisation pour ${maskEmail(email)} : ${link}`);
  }

  private logDevOnly(message: string): void {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[dev] ${message}`);
    }
  }
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return '***';
  return `${localPart.slice(0, 2)}***@${domain}`;
}
