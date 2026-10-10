import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'admin' | 'project_manager' | 'member' | 'viewer';

export interface IUser extends Document {
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  title?: string;
  department?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'project_manager', 'member', 'viewer'],
      default: 'member',
    },
    avatar: { type: String },
    title: { type: String, default: 'Team Member' },
    department: { type: String, default: 'Engineering' },
    isActive: { type: Boolean, default: true },
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
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);
