import { Body, Controller, Get, Post } from "@nestjs/common";
import { CaptchaService } from "./captcha.service";

@Controller("captcha")
export class CaptchaController{

    constructor(
        private captchaService: CaptchaService
    ){}

    @Get("generate")
    async getCaptcha(){
        return await this.captchaService.generate();
    }

    @Post("verify")
    async verifyCaptcha(@Body() userInput:{ code: string, captchaId: string }){
        return await this.captchaService.verify(userInput)
    }

}
