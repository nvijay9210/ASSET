const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const { compressImage } = require("./ImageCompress");
const { relativePath } = require("./RelativePath");
const {
  createDocument,
  getDocumentsByField,
  deleteDocumentById,
  deleteDocumentsByTableAndId,
  getDocumentsByTableAndId,
} = require("../Model/documentModel");

const allowedExtensions = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".webp",
  ".tiff",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
];

const sanitizeFileName = (name) => {
  return name.replace(/[^a-zA-Z0-9_\-\.]/g, "_");
};

//Multiple Image upload
const uploadFileMiddleware = (options) => {
  const { folderName, fileFields, createValidationFn, updateValidationFn } =
    options;

  return async (req, res, next) => {
    console.log(req.files);
    try {
      if (!folderName || !Array.isArray(fileFields)) {
        return res
          .status(400)
          .json({ message: "Invalid upload configuration" });
      }

      const ensureFolderExists = async (folderPath) => {
        try {
          await fsp.mkdir(folderPath, { recursive: true });
        } catch (err) {
          throw new Error("Failed to create directory");
        }
      };

      const saveFile = async (buffer, outputPath, fileName) => {
        await ensureFolderExists(outputPath);
        const filePath = path.join(outputPath, fileName);
        await fsp.writeFile(filePath, buffer);
        return relativePath(filePath);
      };

      const uploadedFiles = {};
      const tenant_id = req.body.tenant_id || req.params.tenant_id;
      if (!tenant_id)
        return res.status(400).json({ message: "Missing tenant ID" });

      let id = 0;
      switch (folderName) {
        case "Asset":
          id = req.params.asset_images;
          break;
        default:
          break;
      }

      const settings = parseInt(req.query.settings || "0");
      if (settings !== 1) {
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
        `tenant_${sanitizeFileName(tenant_id.toString())}`,
        sanitizeFileName(folderName)
      );

      console.log(fileFields);

      const requestfiles = normalizeFileUploads(req.files);

      for (const fileField of fileFields) {
        const files = (requestfiles[fileField.fieldName] || []).flatMap((obj) =>
          Object.values(obj)
        ); // flatten [ { file_url: file }, ... ]

        if (files.length === 0) continue;

        const savedPaths = [];

        for (let file of files) {
          try {
            const extension = path.extname(file.originalname).toLowerCase();
            const mimeType = file.mimetype;

            if (!allowedExtensions.includes(extension)) {
              return res.status(400).json({
                message: `File type not allowed for ${fileField.fieldName}`,
              });
            }

            const maxSizeBytes = fileField.maxSizeMB * 1024 * 1024;
            if (file.size > maxSizeBytes) {
              return res.status(400).json({
                message: `${fileField.fieldName.replace(
                  /_/g,
                  " "
                )} must be less than ${fileField.maxSizeMB}MB`,
              });
            }

            const isImage = [
              ".jpg",
              ".jpeg",
              ".png",
              ".gif",
              ".bmp",
              ".webp",
              ".tiff",
            ].includes(extension);
            const subFolder =
              fileField.subFolder || (isImage ? "photo" : "document");
            const fieldPath = path.join(
              baseTenantPath,
              sanitizeFileName(subFolder)
            );
            const bufferToSave = isImage
              ? await compressImage(file.buffer, 100)
              : file.buffer;

            const fileName = sanitizeFileName(
              `${path.parse(file.originalname).name}_${Date.now()}_${Math.floor(
                Math.random() * 10000
              )}${extension}`
            );
            const savedPath = await saveFile(bufferToSave, fieldPath, fileName);

            savedPaths.push(savedPath);
          } catch (err) {
            console.error(
              `❌ Error saving ${fileField.fieldName}:`,
              err.message
            );
          }
        }

        req.body[fileField.fieldName] = fileField.multiple
          ? savedPaths
          : savedPaths[0];
        uploadedFiles[fileField.fieldName] = fileField.multiple
          ? savedPaths
          : savedPaths[0];
        console.log(uploadedFiles);
        if (id) {
          const deletedFileIds = req.body.deletedFileIds || [];

          await updateDocumentsDiffBased({
            table_name: folderName,
            table_id: id,
            field_name: fileField.fieldName,
            newFiles: savedPaths,
            deletedFileIds, // 👈 Pass it here
            updated_by: req.body.updated_by,
          });
        }
      }

      next();
    } catch (error) {
      console.error("Error uploading files:", error.message);
      return res
        .status(500)
        .json({ message: "Internal Server Error during file upload" });
    }
  };
};

//singleFile
const uploadFileMiddleware2 = (options) => {
  const { folderName, fileFields, createValidationFn, updateValidationFn } =
    options;
  return async (req, res, next) => {
    try {
      if (!folderName || !Array.isArray(fileFields)) {
        return res
          .status(400)
          .json({ message: "Invalid upload configuration" });
      }
      const tenant_id =
        req.body.tenant_id || req.params.tenant_id || req.query.tenant_id;
      if (!tenant_id) {
        return res.status(400).json({ message: "Missing tenant ID" });
      }
      let id = 0;
      switch (folderName) {
        case "Asset":
          id = req.params.asset_id;
          break;
        default:
          break;
      }
      const settings = parseInt(req.query.settings || "0", 10);
      if (settings !== 1) {
        if (id) {
          await updateValidationFn(id, req.body, tenant_id);
        } else {
          await createValidationFn(req.body);
        }
      }
      // ✅ Ensure folderName is valid
      if (!folderName) {
        return res.status(400).json({ message: "Missing folderName" });
      }
      const baseTenantPath = path.join(
        path.dirname(__dirname),
        "uploads",
        `tenant_${sanitizeFileName(tenant_id)}`,
        sanitizeFileName(folderName)
      );
      // ✅ Normalize req.files: convert array to object by fieldname
      let requestfiles = {};
      for (const file of req.files || []) {
        if (!requestfiles[file.fieldname]) {
          requestfiles[file.fieldname] = [];
        }
        requestfiles[file.fieldname].push(file);
      }
      // ✅ Only use indexed normalization for updates
      if (id) {
        requestfiles = normalizeFileUploads(req.files);
      }
      for (const fileField of fileFields) {
        const fieldFiles = requestfiles[fileField.fieldName] || [];
        const savedPaths = [];
        for (const file of fieldFiles) {
          if (!file || !file.originalname || !file.buffer) continue;
          const extension = path.extname(file.originalname).toLowerCase();
          if (!allowedExtensions.includes(extension)) {
            return res.status(400).json({
              message: `File type not allowed for ${fileField.fieldName}`,
            });
          }
          const maxSizeBytes = (fileField.maxSizeMB || 2) * 1024 * 1024;
          if (file.size > maxSizeBytes) {
            return res.status(400).json({
              message: `${fileField.fieldName} must be less than ${fileField.maxSizeMB}MB`,
            });
          }
          const isImage = [
            ".jpg",
            ".jpeg",
            ".png",
            ".gif",
            ".bmp",
            ".webp",
            ".tiff",
          ].includes(extension);
          const subFolder =
            fileField.subFolder || (isImage ? "photo" : "document");
          const fieldPath = path.join(
            baseTenantPath,
            sanitizeFileName(subFolder)
          );
          const bufferToSave = isImage
            ? await compressImage(file.buffer, 80) // Reduced quality
            : file.buffer;
          const fileName = `${sanitizeFileName(
            path.parse(file.originalname).name
          )}_${Date.now()}_${Math.floor(Math.random() * 10000)}${extension}`;
          try {
            await fsp.mkdir(fieldPath, { recursive: true });
            const filePath = path.join(fieldPath, fileName);
            await fsp.writeFile(filePath, bufferToSave);
            savedPaths.push(await relativePath(filePath));
          } catch (err) {
            console.trace(
              `❌ Error saving ${fileField.fieldName}:`,
              err.message
            );
            return res
              .status(500)
              .json({ message: `Failed to save ${fileField.fieldName}` });
          }
        }
        req.body[fileField.fieldName] = fileField.multiple
          ? savedPaths
          : savedPaths[0];
        if (id && savedPaths.length > 0) {
          const deletedFileIds = Array.isArray(req.body.deletedFileIds)
            ? req.body.deletedFileIds
            : [];

          await updateDocumentsDiffBased({
            table_name: folderName,
            table_id: id,
            field_name: fileField.fieldName,
            newFiles: savedPaths,
            deletedFileIds,
            updated_by: req.body.updated_by || req.body.created_by,
          });
        }
      }

      next();
    } catch (error) {
      console.error("Upload Error:", error);
      return res.status(500).json({ message: "File upload failed" });
    }
  };
};

const normalizeFileUploads = (files) => {
  const normalized = {};

  for (const file of files || []) {
    const match = file.fieldname.match(/^([^\[]+)\[(\d+)\]\[([^\]]+)\]$/);
    if (match) {
      const [, baseField, index, key] = match;

      if (!normalized[baseField]) normalized[baseField] = [];
      if (!normalized[baseField][index]) normalized[baseField][index] = {};

      normalized[baseField][index][key] = file;
    } else {
      if (!normalized[file.fieldname]) normalized[file.fieldname] = [];
      normalized[file.fieldname].push(file);
    }
  }

  return normalized;
};

const deleteUploadedFiles = async (filePaths) => {
  if (!filePaths) return;

  const deleteTasks = [];

  const normalizeSafePath = (filePath) => {
    const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, "");
    return safePath.startsWith("uploads/") ? safePath : null;
  };

  const tryDelete = async (filePath) => {
    try {
      const normalized = normalizeSafePath(filePath);
      if (!normalized) return;

      const fullPath = path.join(__dirname, "..", normalized);
      if (fs.existsSync(fullPath)) {
        await fsp.unlink(fullPath);
        console.log("✅ Deleted:", fullPath);
      }
    } catch (err) {
      console.error("❌ Failed to delete:", filePath, err.message);
    }
  };

  if (Array.isArray(filePaths)) {
    for (const item of filePaths) {
      if (typeof item === "string") {
        deleteTasks.push(tryDelete(item));
      } else if (typeof item === "object" && item.image) {
        deleteTasks.push(tryDelete(item.image));
      }
    }
  } else if (typeof filePaths === "string") {
    deleteTasks.push(tryDelete(filePaths));
  }

  await Promise.all(deleteTasks);
};

const updateDocumentsDiffBased = async ({
  table_name,
  table_id,
  field_name,
  newFiles = [],
  deletedFileIds = [], // 👈 add this
  created_by,
  updated_by,
}) => {
  console.log({
    table_name,
    table_id,
    field_name,
    newFiles,
    deletedFileIds,
    created_by,
    updated_by,
  });
  if (!Array.isArray(newFiles)) newFiles = [];

  const existingDocs = await getDocumentsByField(
    table_name,
    table_id,
    field_name
  );

  // Use full filename (not just base) for comparison
  const getFileName = (fileUrl = "") => path.basename(fileUrl || "");

  const existingFileNames = new Set(
    existingDocs.map((doc) => getFileName(doc.file_url))
  );

  const toInsert = newFiles.filter((file) => {
    const fileUrl = typeof file === "string" ? file : file.file_url;
    return fileUrl && !existingFileNames.has(getFileName(fileUrl));
  });

  const newFileNames = new Set(
    newFiles
      .map((f) => getFileName(typeof f === "string" ? f : f.file_url))
      .filter(Boolean)
  );

  if (Array.isArray(deletedFileIds) && deletedFileIds.length > 0) {
    const toDelete = existingDocs.filter((doc) =>
      deletedFileIds.includes(String(doc.document_id))
    );

    await Promise.all(
      toDelete.map(async (doc) => {
        await deleteDocumentById(doc.document_id);
        await deleteUploadedFiles(doc.file_url);
      })
    );
  }

  await Promise.all(
    toInsert.map((file) =>
      createDocument(
        table_name.toLowerCase(),
        table_id,
        field_name,
        typeof file === "string" ? file : file.file_url,
        created_by || updated_by
      )
    )
  );
};

const updateSingleDocument2 = async ({
  table_name,
  table_id,
  field_name,
  newFile,
  deleteOld,
  created_by,
  updated_by,
}) => {
  try {
    if (deleteOld) {
      // Delete old record from DB
      await deleteDocumentsByTableAndId(table_name, table_id, field_name);

      // Optionally delete old file from disk
      // const oldDocs = await getDocumentsByTableAndId(table_name, table_id);
      // oldDocs.forEach(doc => fs.unlinkSync(doc.file_path));
    }

    if (newFile) {
      // Save the new file in DB
      await createDocument(
        table_name,
        table_id,
        field_name,
        newFile,
        created_by
      );
    }

    return { success: true, message: "Document updated successfully" };
  } catch (error) {
    console.error("Error in updateDiff:", error);
    throw error;
  }
};

const saveDocuments = async ({
  table_name,
  table_id,
  field_name,
  files,
  created_by,
}) => {
  if (!files) return;

  const fileArray = Array.isArray(files) ? files : [files];
  const validFiles = fileArray.filter((file) => {
    const url = typeof file === "string" ? file : file?.file_url;
    const isValid = typeof url === "string" && url.trim() !== "";
    if (!isValid) {
      console.warn("⚠️ Invalid file skipped in saveDocuments:", file);
    }
    return isValid;
  });

  if (validFiles.length === 0) return;

  await Promise.all(
    validFiles.map((file) => {
      const fileUrl = typeof file === "string" ? file : file.file_url;
      return createDocument(
        table_name,
        table_id,
        field_name,
        fileUrl,
        created_by
      );
    })
  );
};

const handleFileCleanupByTable = async (table_name, table_id) => {
  try {
    const documents = await getDocumentsByTableAndId(table_name, table_id);
    if (!documents || documents.length === 0) return;

    const filePaths = documents.map((doc) => doc.file_url);

    // Delete files from the file system
    await deleteUploadedFiles(filePaths);

    // Delete file records from the DB
    for (const doc of documents) {
      await deleteDocumentById(doc.id);
    }
  } catch (error) {
    console.warn(
      `⚠️ Failed to clean up files for ${table_name} ID ${table_id}:`,
      error.message
    );
  }
};

module.exports = {
  uploadFileMiddleware,
  deleteUploadedFiles,
  updateDocumentsDiffBased,
  saveDocuments,
  handleFileCleanupByTable,
  uploadFileMiddleware2,
  updateSingleDocument2,
};
