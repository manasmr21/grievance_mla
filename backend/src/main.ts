import dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import {
  corsOptions,
  ensureUploadDirs,
  getUploadsRootPath,
  uploadsConfig,
} from './config/app.config';

const PORT = process.env.PORT;

async function bootstrap() {

  ensureUploadDirs();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(getUploadsRootPath(), {
    prefix: uploadsConfig.publicPrefix,
  });
  app.enableCors(corsOptions);

  app.use(cookieParser(process.env.COOKIE_SECRETE));

  // Swagger Config
  const config = new DocumentBuilder()
    .setTitle('Grievance Management API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  // Create Swagger Document
  const document = SwaggerModule.createDocument(
    app,
    config,
  );

  // Swagger Route
  SwaggerModule.setup(
    'api/docs',
    app,
    document,
  );


  await app.listen(PORT ?? 8080, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
    console.log(`Swagger Documentation is running on http://localhost:${PORT}/api/docs`)
  });
}
void bootstrap();

// trigger restart 3
