import { diskStorage } from "multer";
import { extname } from "path";
import { getGrievanceUploadsPath } from "../../config/app.config";

export const multerConfig = {

    storage: diskStorage({
        destination: getGrievanceUploadsPath(),
        filename: (req, file, callback) => {
            const uniqueName = `${Date.now()}-${Math.round(
                Math.random() * 1e9,
            )}${extname(file.originalname)}`;
            callback(null, uniqueName);
        }
    })
    ,
    limits: {
        fileSize: 20 * 1024 * 1024
    },

    fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'application/pdf'
        ];

        if (
            !allowedMimeTypes.includes(file.mimetype)
        ) {
            return callback(new Error('File type is not allowed'));
        }
        callback(null, true);
    }

}