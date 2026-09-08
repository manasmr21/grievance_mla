import {
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Request } from 'express';
import { UserAccount } from '../modules/userAccount/models/user.model';
import dotenv from 'dotenv';
import { InjectModel } from '@nestjs/sequelize';
dotenv.config();

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        @InjectModel(UserAccount)
        private userModel: typeof UserAccount,
    ) {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new NotFoundException('JWT_SECRET is not configured');
        }
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request): string | null => req?.cookies?.user || null,
            ]),
            secretOrKey: secret,
        });
    }

    async validate(jwtPayload: { id: string }) {
        const userId = jwtPayload.id;

        const user = await this.userModel.findOne({
            where: { id: userId },
            attributes: ['id', 'role_id', 'email', 'account_status'],
        });

        if (!user) {
            throw new UnauthorizedException('User no longer exists');
        }

        return user;
    }
}
