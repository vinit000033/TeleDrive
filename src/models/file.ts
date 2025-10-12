import { Schema, model, models, Document } from "mongoose";

export interface IFile extends Document {
  originalFilename: string;
  originalFileSize: number;
  telegramMessageId: number;
  telegramFileId: string; // ✅ Telegram file_id
  isChunked?: boolean;
  uploadSessionId?: string;
  chunkIndex?: number;
  totalChunks?: number;
  telegramMessageIdForChunk?: number;
  telegramFileIdForChunk?: string;
  uploadDate: Date;
  parentFolderId?: Schema.Types.ObjectId; // Reference to Folder
  isPublic: boolean;
  publicShareToken?: string;
   totalFileSize?: number; // Add this field
}

const fileSchema = new Schema<IFile>({
  originalFilename: { type: String, required: true },
  originalFileSize: { type: Number, required: true },
  telegramMessageId: { type: Number, required: true },
  telegramFileId: { type: String, required: true },
  isChunked: { type: Boolean, default: false },
  uploadSessionId: { type: String },
  chunkIndex: { type: Number },
  totalChunks: { type: Number },
  telegramMessageIdForChunk: { type: Number },
  telegramFileIdForChunk: { type: String},
  uploadDate: { type: Date, default: Date.now },
  parentFolderId: {
    type: Schema.Types.ObjectId,
    ref: "Folder",
    default: null,
  },
  totalFileSize: { // Add the new field
    type: Number},
  isPublic: {
    type: Boolean,
    default: false,
  },
  publicShareToken: {
    type: String,
    unique: true,
    sparse: true,
  },
});

const File = models.File || model<IFile>("File", fileSchema);

export default File;
