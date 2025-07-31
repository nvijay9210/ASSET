const fs = require("fs");
const path = require("path");
const { compressImage } = require("./ImageCompress");
const { relativePath } = require("./RelativePath");

const uploadFileMiddleware = (options) => {
  const {
    folderName,
    fileFields, // [{ fieldName, subFolder, maxSizeMB, multiple }]
    createValidationFn,
    updateValidationFn,
  } = options;

  return async (req, res, next) => {
    try {
      // Ensure folder exists
      const ensureFolderExists = (folderPath) => {
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }
      };

      // Save file to disk and return relative path
      const saveFile = async (buffer, outputPath, fileName) => {
        ensureFolderExists(outputPath);
        const filePath = path.join(outputPath, fileName);
        fs.writeFileSync(filePath, buffer);
        return relativePath(filePath);
      };

      const uploadedFiles = {};
      const tenant_id = req.body.tenant_id || req.params.tenant_id;
      let id = 0;

      switch (folderName) {
        case "Notification":
          id = req.params.notification_id;
          break;
        case "Expense":
          id = req.params.expense_id;
          break;
        case "Supplier_products":
          id = req.params.supplier_product_id;
          break;
        case "Supplier":
          id = req.params.supplier_id;
          break;
        case "Reception":
          id = req.params.reception_id;
          break;
        case "Asset":
          id = req.params.asset_id;
          break;
        case "Treatment":
          id = req.params.treatment_id;
          break;
        case "Patient":
          id = req.params.patient_id;
          break;
        case "Dentist":
          id = req.params.dentist_id;
          break;
        case "Clinic":
          id = req.params.clinic_id;
          break;
        case "Tenant":
          id = req.params.tenant_id;
          break;
      }

      const settings = req.query.settings || 0;
      if (settings != 1) {
        if (id) {
          console.log("update");
          await updateValidationFn(id, req.body, tenant_id);
        } else {
          console.log("create");
          await createValidationFn(req.body);
        }
      }

      const baseTenantPath = path.join(
        path.dirname(__dirname),
        "uploads",
        `tenant_${tenant_id}`,
        folderName
      );

      const imageExtensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".bmp",
        ".webp",
        ".tiff",
      ];

      console.log(fileFields);

      for (const fileField of fileFields) {
        // ✅ Special case: asset_images with indexed handling
        if (fileField.fieldName === "asset_images") {
          const assetImages = [];
          let idx = 0;

          while (true) {
            const fileFieldName = `asset_images${idx}`;
            const file = req.files?.find((f) => f.fieldname === fileFieldName);
            const existingImagePath = req.body[fileFieldName];
            if (!file && !existingImagePath) break;

            if (file) {
              const maxSizeBytes = fileField.maxSizeMB * 1024 * 1024;
              if (file.size > maxSizeBytes) {
                return res.status(400).json({
                  message: `Asset image must be less than ${fileField.maxSizeMB}MB`,
                });
              }

              const extension = path.extname(file.originalname).toLowerCase();
              const dynamicSubFolder = imageExtensions.includes(extension)
                ? "photo"
                : "document";
              const fieldTenantPath = path.join(
                baseTenantPath,
                dynamicSubFolder
              );

              const bufferToSave = imageExtensions.includes(extension)
                ? await compressImage(file.buffer, 100)
                : file.buffer;

              const fileName = `${
                path.parse(file.originalname).name
              }_${Date.now()}_${Math.floor(Math.random() * 10000)}${extension}`;
              const savedPath = await saveFile(
                bufferToSave,
                fieldTenantPath,
                fileName
              );
              assetImages.push(savedPath);
            } else if (existingImagePath) {
              assetImages.push(existingImagePath);
            }

            idx++;
          }

          req.body.asset_images = assetImages;
          uploadedFiles.asset_images = assetImages;
          continue; // skip to next fileField
        }

        // ✅ Add logging here (after all files processed)
        console.log(
          `${req.method} ${req.originalUrl} - Files uploaded:`,
          uploadedFiles
        );

        next();
      }
    } catch (error) {
      console.error("Error uploading files:", error.message);
      return res.status(500).json({ message: error.message });
    }
  };
};

module.exports = { uploadFileMiddleware };
