import cloudinary from "./cloudinary.js";
import fs from "fs";

export const uploadImageToCloudinary = async (filePath, folder = "alerts") => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
    });

    // Xóa file local sau khi upload thành công
    fs.unlinkSync(filePath);

    return result.secure_url; // trả về URL để lưu vào DB
  } catch (error) {
    console.error("Upload to Cloudinary failed:", error);
    throw new Error("Failed to upload image");
  }
};
