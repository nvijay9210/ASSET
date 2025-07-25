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

      for (const fileField of fileFields) {
        // Generic file handling (single or multiple)
        const files =
          req.files?.filter((file) => file.fieldname === fileField.fieldName) ||
          [];

        if (files.length > 0) {
          const savedPaths = [];

          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const maxSizeBytes = fileField.maxSizeMB * 1024 * 1024;
            if (file.size > maxSizeBytes) {
              return res.status(400).json({
                message: `${fileField.fieldName.replace(
                  /_/g,
                  " "
                )} must be less than ${fileField.maxSizeMB}MB`,
              });
            }

            const extension = path.extname(file.originalname).toLowerCase();
            const dynamicSubFolder = imageExtensions.includes(extension)
              ? "photo"
              : "document";
            const fieldTenantPath = path.join(baseTenantPath, dynamicSubFolder);

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

            savedPaths.push(savedPath); // Only push the string path
          }

          // Always store as array of strings
          req.body[fileField.fieldName] = savedPaths;
          uploadedFiles[fileField.fieldName] = savedPaths;
        }
      }

      next();
    } catch (error) {
      console.error("Error uploading files:", error.message);
      return res.status(500).json({ message: error.message });
    }
  };
};

module.exports = { uploadFileMiddleware };
