import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (fileLocalPath) => {
    try {
        if (!fileLocalPath) return null;

        const response = await cloudinary.uploader.upload(fileLocalPath, {
            resource_type: "auto",
        });

        fs.unlinkSync(fileLocalPath);
        console.log("File is uploaded on cloudinary ", response);
        return response;
    } catch (error) {
        fs.unlinkSync(fileLocalPath);
        return null;
    }
};

export { uploadOnCloudinary };
