// models/Folder.ts
import { Schema, model, models, Document } from 'mongoose';

export interface IFolder extends Document {
  name: string;
  parentId?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const folderSchema = new Schema<IFolder>({
  name: { type: String, required: true },
  parentId: { type: Schema.Types.ObjectId, ref: 'Folder', default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const Folder = models.Folder || model<IFolder>('Folder', folderSchema);
export default Folder;