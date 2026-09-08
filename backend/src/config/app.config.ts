import type { CookieOptions } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const isProduction = process.env.NODE_ENV === 'production';

export const corsOptions = {
    origin: true,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'Origin',
        'X-Requested-With',
    ],
};

/** Auth cookie — secure + SameSite=None only in production (HTTPS). */
export function authCookieOptions(): CookieOptions {
    return {
        httpOnly: true,
        maxAge: 60 * 60 * 1000,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
    };
}

export const socketCorsOptions = {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true,
};

/** Local file upload paths and public URL prefix. */
export const uploadsConfig = {
    rootDir: process.env.UPLOADS_DIR?.trim() || 'uploads',
    publicPrefix: process.env.UPLOADS_PREFIX?.trim() || '/uploads/',
    grievanceSubdir: 'grievance',
};

export function getUploadsRootPath(): string {
    return join(process.cwd(), uploadsConfig.rootDir);
}

export function getGrievanceUploadsPath(): string {
    return join(getUploadsRootPath(), uploadsConfig.grievanceSubdir);
}

/** Create upload directories if they do not exist. */
export function ensureUploadDirs(): void {
    const grievancePath = getGrievanceUploadsPath();
    if (!existsSync(grievancePath)) {
        mkdirSync(grievancePath, { recursive: true });
    }
}

/** Build a public URL for a stored grievance file. */
export function getGrievanceFileUrl(filename: string): string {
    const base = (process.env.BACKEND_URL || '').replace(/\/$/, '');
    const prefix = uploadsConfig.publicPrefix.replace(/^\/|\/$/g, '');
    return `${base}/${prefix}/${uploadsConfig.grievanceSubdir}/${filename}`;
}

export const locationJsonUrl =
    process.env.LOCATION_JSON_URL?.trim() || 'http://13.200.126.131/india_state_list.json';
