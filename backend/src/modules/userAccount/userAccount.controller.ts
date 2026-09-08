import { Controller, Post, Get, Put, Delete, Body, Req, Param, UseGuards, Res, Query } from "@nestjs/common";
import { UserAccountService } from "./userAccount.service";
import { LoginDto, UserDto, UpdateUserAccountDto, ForgotPasswordDto, ResetPasswordDto } from "./dto/user.dto";
import { AuthGuard } from "../../auth/jwt.guard";
import { verifyAdmin } from "../../auth/verifyRoles";
import { ApiTags, ApiOperation, ApiBody } from "@nestjs/swagger";
import type { Response } from "express";

@ApiTags('User Accounts')
@Controller('user-account')
export class UserAccountController {
    constructor(private readonly userAccountService: UserAccountService) { }

    @Get()
    @UseGuards(AuthGuard)
    async getAllUsers(
        @Req() req: any,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('role') role?: string,
        @Query('status') status?: string,
        @Query('search') search?: string,
        @Query('activeTab') activeTab?: string,
        @Query('sortField') sortField?: string,
        @Query('sortOrder') sortOrder?: string,
    ) {
        await verifyAdmin(req.user);
        return await this.userAccountService.findAll(page, limit, role, status, search, activeTab, sortField, sortOrder);
    }

    @Get('verify')
    @UseGuards(AuthGuard)
    async verifyUser(@Req() req: any) {
        return await this.userAccountService.verify(req);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get user account by ID' })
    async findOne(@Param('id') id: string) {
        return await this.userAccountService.findById(id);
    }

    @Post('register')
    async registerUser(@Body() dto: UserDto, @Req() req: any) {
        return await this.userAccountService.register(dto, req?.user);
    }

    @Post('login')
    async loginUser(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
        return await this.userAccountService.login(dto, res);
    }

    @Post('logout')
    async logoutUser(@Res({ passthrough: true }) res: Response) {
        res.clearCookie('user', {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
        });
        return {
            success: true,
            message: "User logged out successfully"
        };
    }

    @Post('forgot-password')
    @ApiOperation({ summary: 'Request password reset token link' })
    @ApiBody({ type: ForgotPasswordDto })
    async forgotPassword(@Body() dto: ForgotPasswordDto) {
        return await this.userAccountService.forgotPassword(dto.email);
    }

    @Post('reset-password')
    @ApiOperation({ summary: 'Reset password using valid token' })
    @ApiBody({ type: ResetPasswordDto })
    async resetPassword(@Body() dto: ResetPasswordDto) {
        return await this.userAccountService.resetPassword(dto.token, dto.password);
    }



    @Put('update/:id')
    @UseGuards(AuthGuard)
    async updateUser(@Param('id') id: string, @Body() dto: UpdateUserAccountDto, @Req() req: any) {
        await verifyAdmin(req.user);
        return await this.userAccountService.update(id, dto, req?.user);
    }

    @Delete('delete/:id')
    @UseGuards(AuthGuard)
    async deleteUser(@Param('id') id: string, @Req() req: any) {
        await verifyAdmin(req.user);
        return await this.userAccountService.delete(id, req?.user);
    }
}
