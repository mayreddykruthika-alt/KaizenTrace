import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
  | 'task_assigned'
  | 'deadline_approaching'
  | 'task_overdue'
  | 'task_completed'
  | 'comment_added';

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  type: NotificationType;
  message: string;
  relatedEntityType: 'task' | 'project';
  relatedEntityId: string;
  relatedEntityTitle: string;
  readAt?: Date;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      required: true,
      enum: ['task_assigned', 'deadline_approaching', 'task_overdue', 'task_completed', 'comment_added'],
    },
    message: { type: String, required: true },
    relatedEntityType: { type: String, required: true, enum: ['task', 'project'] },
    relatedEntityId: { type: String, required: true },
    relatedEntityTitle: { type: String, required: true },
    readAt: { type: Date },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
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
NotificationSchema.index({ recipientId: 1, readAt: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ relatedEntityId: 1, type: 1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
