import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { plainTextToHtmlFragment } from '../chunk.utils';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;
    private readonly logger = new Logger(MailService.name);

    constructor() {
        const user = process.env.mail;
        const pass = process.env.password;
        const sendDelayMs = Number(process.env.MAIL_CAMPAIGN_SEND_DELAY_MS) || 1500;

        this.transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            pool: true,
            maxConnections: 1,
            maxMessages: 100,
            rateLimit: 1,
            rateDelta: sendDelayMs,
            auth: {
                user: user,
                pass: pass,
            },
            tls: {
                rejectUnauthorized: false,
            },
        });

        this.transporter.verify((error: any) => {
            if (error) {
                this.logger.error(`Mail transporter verification failed: ${error.message}`);
            } else {
                this.logger.log(`Mail transporter ready — logged in as ${user}`);
            }
        });
    }

    buildPortalMailHtml(subject: string, contentHtml: string): string {
        const year = new Date().getFullYear();
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${subject}</title>
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    body {
                        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        background-color: #f8fafc;
                        color: #334155;
                        margin: 0;
                        padding: 0;
                        -webkit-font-smoothing: antialiased;
                        -moz-osx-font-smoothing: grayscale;
                    }
                    .wrapper {
                        background-color: #f8fafc;
                        width: 100% !important;
                        margin: 0;
                        padding: 40px 0;
                    }
                    .container {
                        max-width: 580px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        border-radius: 16px;
                        overflow: hidden;
                        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
                        border: 1px solid #e2e8f0;
                    }
                    .header {
                        background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
                        padding: 40px 32px;
                        text-align: center;
                        border-bottom: 4px solid #3b82f6;
                    }
                    .header-logo {
                        background-color: rgba(255, 255, 255, 0.15);
                        border-radius: 12px;
                        padding: 8px 16px;
                        display: inline-block;
                        margin-bottom: 16px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }
                    .header-logo span {
                        color: #ffffff;
                        font-weight: 700;
                        font-size: 16px;
                        letter-spacing: 1px;
                        text-transform: uppercase;
                    }
                    .header h1 {
                        color: #ffffff;
                        margin: 0;
                        font-size: 24px;
                        font-weight: 700;
                        letter-spacing: -0.5px;
                    }
                    .header p {
                        color: #bfdbfe;
                        margin: 8px 0 0 0;
                        font-size: 14px;
                        font-weight: 400;
                    }
                    .content {
                        padding: 40px 32px;
                        line-height: 1.7;
                        font-size: 15px;
                        color: #334155;
                    }
                    .content p {
                        margin: 0 0 20px 0;
                    }
                    .content p:last-child {
                        margin-bottom: 0;
                    }
                    .content strong {
                        color: #0f172a;
                        font-weight: 600;
                    }
                    .content a {
                        color: #2563eb;
                        text-decoration: none;
                        font-weight: 600;
                    }
                    .content a:hover {
                        text-decoration: underline;
                    }
                    .footer {
                        background-color: #f8fafc;
                        padding: 32px 32px;
                        text-align: center;
                        font-size: 12px;
                        color: #64748b;
                        border-top: 1px solid #e2e8f0;
                    }
                    .footer p {
                        margin: 0 0 8px 0;
                    }
                    .footer p:last-child {
                        margin: 0;
                    }
                </style>
            </head>
            <body>
                <div class="wrapper">
                    <div class="container">
                        <div class="header">
                            <div class="header-logo">
                                <span>Grievance Portal</span>
                            </div>
                            <h1>Institutional Grievance System</h1>
                            <p>Automated Portal Notification</p>
                        </div>
                        <div class="content">
                            ${contentHtml}
                        </div>
                        <div class="footer">
                            <p>This is an automated notification from the Grievance Management System.</p>
                            <p>Please do not reply directly to this email.</p>
                            <p style="margin-top: 16px; font-weight: 500;">&copy; ${year} Institutional Grievance System. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    async sendMailService(to: string, subject: string, message: string) {
        const htmlBody = this.buildPortalMailHtml(subject, message);

        try {
            const result = await this.transporter.sendMail({
                from: `"Grievance Portal" <${process.env.mail}>`,
                to,
                subject,
                html: htmlBody,
            });
            this.logger.debug(`Mail sent to ${to} — MessageId: ${result.messageId}`);
            return result;
        } catch (error: any) {
            const smtpResponse = error?.response ?? '';
            this.logger.error(`Failed to send mail to ${to}: ${error?.message ?? error}`);
            if (smtpResponse) {
                this.logger.error(`SMTP Response: ${smtpResponse}`);
            }
            throw error;
        }
    }

    async sendCampaignMail(to: string, subject: string, plainMessage: string) {
        const contentHtml = plainTextToHtmlFragment(plainMessage);
        const htmlBody = this.buildPortalMailHtml(subject, contentHtml);

        try {
            const result = await this.transporter.sendMail({
                from: `"Grievance Portal" <${process.env.mail}>`,
                to,
                subject,
                html: htmlBody,
                text: plainMessage,
            });
            this.logger.debug(`Campaign mail sent to ${to} — MessageId: ${result.messageId}`);
            return result;
        } catch (error: any) {
            const smtpResponse = error?.response ?? '';
            this.logger.error(`Failed to send campaign mail to ${to}: ${error?.message ?? error}`);
            if (smtpResponse) {
                this.logger.error(`SMTP Response: ${smtpResponse}`);
            }
            throw error;
        }
    }
}
