import cloudinary from "./cloudinary.js";

export async function uploadVideo(filePath, folder = "fire_alerts") {
  return cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: "video",
    use_filename: true,
    unique_filename: true,
  });
}
