const fs = require("fs");
const path = require("path");
const { compressImage } = require("./ImageCompress");
const { relativePath } = require("./RelativePath");
const {
  createDocument,
  getDocumentsByField,
  deleteDocumentById,
  getDocumentsByTableAndId,
  deleteDocumentsByTableAndId,
} = require("../Model/documentModel");

const uploadFileMiddleware = (options) => {
  const {
    folderName,
    fileFields,
    createValidationFn,
    updateValidationFn,
  } = options;

  return async (req, res, next) => {
    try {
      const ensureFolderExists = (folderPath) => {
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }
      };

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
        case "Asset":
          id = req.params.asset_id;
          break;
        case "AssetAllocation":
          id = req.params.asset_allocation_id;
          break;
      }

      const settings = req.query.settings || 0;
      if (settings != 1) {
        if (id) {
          await updateValidationFn(id, req.body, tenant_id);
        } else {
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
        const files = req.files?.filter((file) => file.fieldname === fileField.fieldName) || [];
        if (files.length > 0) {
          const savedPaths = [];

          for (const file of files) {
            const maxSizeBytes = fileField.maxSizeMB * 1024 * 1024;
            if (file.size > maxSizeBytes) {
              return res.status(400).json({
                message: `${fileField.fieldName.replace(/_/g, " ")} must be less than ${fileField.maxSizeMB}MB`,
              });
            }

            const extension = path.extname(file.originalname).toLowerCase();
            const dynamicSubFolder = imageExtensions.includes(extension) ? "photo" : "document";
            const fieldTenantPath = path.join(baseTenantPath, fileField.subFolder || dynamicSubFolder);

            const bufferToSave = imageExtensions.includes(extension)
              ? await compressImage(file.buffer, 100)
              : file.buffer;

            const fileName = `${path.parse(file.originalname).name}_${Date.now()}_${Math.floor(Math.random() * 10000)}${extension}`;
            const savedPath = await saveFile(bufferToSave, fieldTenantPath, fileName);

            savedPaths.push(savedPath);
          }

          req.body[fileField.fieldName] = fileField.multiple ? savedPaths : savedPaths[0];
          uploadedFiles[fileField.fieldName] = fileField.multiple ? savedPaths : savedPaths[0];
        }
      }

      next();
    } catch (error) {
      console.error("Error uploading files:", error.message);
      return res.status(500).json({ message: error.message });
    }
  };
};

const deleteUploadedFiles = async (filePaths) => {
  if (!filePaths) return;
  const deleteTasks = [];
  if (Array.isArray(filePaths)) {
    for (const item of filePaths) {
      if (typeof item === "string") {
        deleteTasks.push(deleteFileIfExists(item));
      } else if (typeof item === "object" && item.image) {
        deleteTasks.push(deleteFileIfExists(item.image));
      }
    }
  } else if (typeof filePaths === "string") {
    deleteTasks.push(deleteFileIfExists(filePaths));
  }
  await Promise.all(deleteTasks);
  return true;
};

const deleteFileIfExists = (filePath) => {
  if (!filePath || typeof filePath !== "string") return;
  const normalizedPath = filePath.replace(/^\/+/g, "").replace(/\\/g, "/");
  if (!normalizedPath.startsWith("uploads/")) return;
  const fullPath = path.join(__dirname, "..", normalizedPath);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
      console.log("✅ Deleted:", fullPath);
    } catch (err) {
      console.error("❌ Failed to delete:", fullPath, err);
    }
  }
};

const updateDocumentsDiffBased = async ({
  table_name,
  table_id,
  field_name,
  newFiles = [],
  created_by,
  updated_by,
}) => {
  if (!Array.isArray(newFiles)) newFiles = [];

  const existingDocs = await getDocumentsByField(table_name, table_id, field_name);

  // Helper to get base name (before timestamp) from file_url
  const getBaseName = (fileUrl = "") => {
    const filename = path.basename(fileUrl || "");
    return filename.split("_")[0]; // e.g., 'testimonials-5'
  };

  const existingUrls = new Set(existingDocs.map(doc => getBaseName(doc.file_url)));

  const toInsert = newFiles.filter(file => {
    const fileUrl = typeof file === "string" ? file : file.file_url;
    if (!fileUrl) return false;

    const newBase = getBaseName(fileUrl);
    return !existingUrls.has(newBase);
  });

  const newBaseUrls = new Set(
    newFiles
      .map(f => getBaseName(typeof f === "string" ? f : f.file_url))
      .filter(Boolean)
  );

  const toDelete = existingDocs.filter(doc => {
    const base = getBaseName(doc.file_url);
    return !newBaseUrls.has(base);
  });

  // Delete removed files
  await Promise.all(toDelete.map(async (doc) => {
    await deleteDocumentById(doc.document_id);
    await deleteUploadedFiles(doc.file_url);
  }));

  // Insert new ones
  await Promise.all(
    toInsert.map(file =>
      createDocument(
        table_name,
        table_id,
        field_name,
        typeof file === "string" ? file : file.file_url,
        created_by || updated_by
      )
    )
  );
};

const saveDocuments = async ({
  table_name,
  table_id,
  field_name,
  files,
  created_by,
}) => {
  if (!files) return;

  // Normalize to array
  const fileArray = Array.isArray(files) ? files : [files];

  // Filter only valid file URLs
  const validFiles = fileArray.filter(file =>
    typeof file === "string" || (file && typeof file.file_url === "string")
  );

  if (validFiles.length === 0) return;

  await Promise.all(
    validFiles.map(file =>
      createDocument(
        table_name,
        table_id,
        field_name,
        typeof file === "string" ? file : file.file_url,
        created_by
      )
    )
  );
};

const handleFileCleanupByTable = async (table_name, table_id) => {
  try {
    const documents = await getDocumentsByTableAndId(table_name, table_id);
    if (!documents || documents.length === 0) return;

    const filePaths = documents.map((doc) => doc.file_url);

    // Delete physical files
    await deleteUploadedFiles(filePaths);

    // Delete document records
    await deleteDocumentsByTableAndId(table_name, table_id);
  } catch (error) {
    console.warn(`⚠️ Failed to clean up files for ${table_name} ID ${table_id}:`, error.message);
  }
};



module.exports = {
  uploadFileMiddleware,
  deleteUploadedFiles,
  updateDocumentsDiffBased,
  saveDocuments,
  handleFileCleanupByTable
};
