import { Global, Module } from '@nestjs/common';
import { MailService } from './sendMails';

@Global()
@Module({
    providers: [MailService],
    exports: [MailService],
})
export class MailModule { }
