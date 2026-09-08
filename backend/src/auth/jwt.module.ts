import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserAccount } from '../modules/userAccount/models/user.model';
import * as dotenv from 'dotenv';

dotenv.config();

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        SequelizeModule.forFeature([UserAccount]),
        JwtModule.register({
            secret: process.env.JWT_SECRET,
            signOptions: { expiresIn: process.env.JWT_EXPIRES_IN as any },
        }),
    ],
    providers: [JwtStrategy],
    exports: [JwtModule, PassportModule],
})
export class JwtAuthModule { }
