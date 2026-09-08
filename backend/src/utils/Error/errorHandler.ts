import { HttpException, InternalServerErrorException, BadRequestException } from "@nestjs/common";

export const handleServiceError = (error: any): never => {
    if (error instanceof HttpException) {
        throw error;
    }

    // Handle Sequelize Unique Constraint Error
    if (error.name === 'SequelizeUniqueConstraintError') {
        const message = error.errors?.map((e: any) => e.message).join(', ') || 'Unique constraint violation';
        throw new BadRequestException({
            success: false,
            message: message,
        });
    }

    // Handle Sequelize Foreign Key Constraint Error
    if (error.name === 'SequelizeForeignKeyConstraintError') {
        throw new BadRequestException({
            success: false,
            message: 'Cannot delete or update record because it is referenced by another record',
        });
    }

    console.error(error);
    throw new InternalServerErrorException({
        success: false,
        message: 'Internal server error',
    });
};
