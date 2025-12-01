import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import path from "path";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

// ✅ Check Cloudinary Connection
export const isCloudinaryConnected = async () => {
  try {
    const response = await cloudinary.api.ping();
    return response.status === "ok";
  } catch (error) {
    console.log("Cloudinary error, isCloudinaryConnected error:", error.message);
    return false;
  }
};

// ✅ Upload File
export const upload = async (file, folderName) => {
  try {
    const ext = path.extname(file).toLowerCase();

    let resourceType = "image";

    if (
      [
        ".pdf", ".doc", ".docx",
        ".xls", ".xlsx",
        ".ppt", ".pptx",
        ".txt"
      ].includes(ext)
    ) {
      resourceType = "raw";
    } else if ([".mp4", ".mov", ".avi", ".mkv", ".webm"].includes(ext)) {
      resourceType = "video";
    }

    const options = {
      folder: folderName,
      public_id: `${Date.now()}`,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: false,
    };

    if (resourceType === "raw") {
      options.flags = "attachment";
    }

    const result = await cloudinary.uploader.upload(file, options);
    return result;

  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};

// ✅ Delete File From Cloudinary
export const deleteFromCloudinary = async (fileUrl) => {
  try {
    if (!fileUrl) return;

    const parts = fileUrl.split("/");
    const filename = parts.pop(); // e.g. "1700000000000.png"

    const folder = parts.slice(parts.indexOf("upload") + 1).join("/"); 
    const publicId = `${folder}/${filename.split(".")[0]}`;

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image", 
    });

    return result;

  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw error;
  }
};

export default {
  isCloudinaryConnected,
  upload,
  deleteFromCloudinary,
};
