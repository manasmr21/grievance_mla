import { Injectable } from '@nestjs/common';
import { v2 as Cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
    async uploadImage(
        file: any,
        organization: string,
        folder: string,
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            Cloudinary.uploader
                .upload_stream(
                    {
                        resource_type: 'auto',
                        folder: `${organization}/${folder}`,
                    },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    },
                )
                .end(file.buffer);
        });
    }
    async getImages(folder: string, organizationId: string) {
        return Cloudinary.api.resources({
            resource_type: 'image',
            type: 'upload',
            prefix: `${organizationId}/${folder}`,
            max_results: 24,
        });
    }

    async deleteImage(publicId: string): Promise<any> {
        return await Cloudinary.uploader.destroy(publicId);
    }
}
