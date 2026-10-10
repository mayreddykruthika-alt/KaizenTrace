import mongoose, { Document, Schema } from 'mongoose';

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed';

export interface IProject extends Document {
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: Date;
  dueDate: Date;
  ownerId: mongoose.Types.ObjectId;
  memberIds: mongoose.Types.ObjectId[];
  category: string;
  isArchived: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    status: {
      type: String,
      required: true,
      enum: ['planning', 'active', 'on_hold', 'completed'],
      default: 'planning',
    },
    startDate: { type: Date, default: Date.now },
    dueDate: { type: Date, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    memberIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    category: { type: String, default: 'Product Development' },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
ProjectSchema.index({ name: 'text', description: 'text' });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ ownerId: 1 });
ProjectSchema.index({ memberIds: 1 });
ProjectSchema.index({ isArchived: 1 });
ProjectSchema.index({ dueDate: 1 });

export const Project = mongoose.model<IProject>('Project', ProjectSchema);
