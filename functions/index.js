const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {getStorage} = require("firebase-admin/storage");
const sharp = require("sharp");
const path = require("path");
const os = require("os");
const fs = require("fs");

// Initialize the Firebase Admin SDK
admin.initializeApp();

exports.resizeAchievementImage =
functions.storage.object().onFinalize(async (object) => {
  const bucket = getStorage().bucket(object.bucket);
  const filePath = object.name; // The full path to the uploaded file
  const contentType = object.contentType;

  // 1. Exit if this is not an image or is not in the 'achievements' folder.
  if (!contentType || !contentType.startsWith("image/") || !filePath ||
   !filePath.startsWith("achievements/")) {
    return functions.logger.log("This is not a relevant image. Exiting.");
  }

  // 2. Exit if the image is already a thumbnail to prevent an infinite loop.
  if (path.basename(filePath).startsWith("thumb_")) {
    return functions.logger.log("Already a thumbnail. Exiting.");
  }

  const fileName = path.basename(filePath);
  const tempFilePath = path.join(os.tmpdir(), fileName);
  try {
    // 3. Download the original file to a temporary directory on the server.
    await bucket.file(filePath).download({destination: tempFilePath});
    functions.logger.log("Image downloaded locally to", tempFilePath);

    // 4. Generate a thumbnail using the 'sharp' library.
    const thumbFileName = `thumb_${fileName}`;
    const thumbFilePath = path.join(os.tmpdir(), thumbFileName);
    // Resize to 400px width, maintaining aspect ratio
    await sharp(tempFilePath).resize({width: 400}).toFile(thumbFilePath);

    // 5. Upload the new thumbnail back to the same directory in Cloud Storage.
    const destination = path.join(path.dirname(filePath), thumbFileName);
    await bucket.upload(thumbFilePath, {
      destination: destination,
      metadata: {contentType: "image/jpeg"}, // Save thumbnail as JPEG
    });

    // 6. Clean up the temporary files from the server.
    fs.unlinkSync(tempFilePath);
    fs.unlinkSync(thumbFilePath);

    functions.logger.log("Thumbnail created and uploaded to", destination);
    return null;
  } catch (error) {
    functions.logger.error("Error resizing image:", error);
    // Clean up temp files even if there's an error
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    return null;
  }
});
