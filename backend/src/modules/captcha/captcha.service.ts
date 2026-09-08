import { HttpException, Injectable } from "@nestjs/common";
import svgCaptcha from "svg-captcha"
import { handleServiceError } from "src/utils/Error/errorHandler";
import * as crypto from "crypto";

@Injectable()
export class CaptchaService {
    private captchaStore = new Map<string, { text: string; expiresAt: number }>();

    generate() {
        try {
            const captcha = svgCaptcha.createMathExpr({
                mathMin: 1,
                mathMax: 9,
                mathOperator: '+',
                noise: 2,
                color: true,
                background: "#f4f4f4",
                width: 120,
                height: 40,
            });

            const captchaId = crypto.randomUUID();
            const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiration
            this.captchaStore.set(captchaId, { text: captcha.text, expiresAt });

            // Cleanup expired captchas
            if (this.captchaStore.size > 1000) {
                const now = Date.now();
                for (const [id, data] of this.captchaStore.entries()) {
                    if (data.expiresAt < now) {
                        this.captchaStore.delete(id);
                    }
                }
            }

            return {
                success: true,
                message: 'Captcha generated successfully',
                data: {
                    image: captcha.data,
                    captchaId,
                }
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }

    verify(userInput: { code: string, captchaId: string }) {
        try {
            const { code, captchaId } = userInput;

            if (!code) {
                throw new HttpException('Captcha code is required', 400);
            }
            if (!captchaId) {
                throw new HttpException('Captcha ID is required', 400);
            }

            const storedData = this.captchaStore.get(captchaId);
            if (!storedData) {
                throw new HttpException('Captcha expired or invalid', 400);
            }

            this.captchaStore.delete(captchaId); // One-time use

            if (Date.now() > storedData.expiresAt) {
                throw new HttpException('Captcha expired', 400);
            }

            const isValid = String(storedData.text).trim() === String(code).trim();

            if (!isValid) {
                throw new HttpException('Invalid captcha', 400);
            }

            return {
                success: true,
                message: 'Captcha verified successfully',
            };
        } catch (error) {
            return handleServiceError(error);
        }
    }
}