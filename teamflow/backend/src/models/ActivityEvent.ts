import mongoose, { Document, Schema } from 'mongoose';

export type ActivityAction =
  | 'project_created'
  | 'project_updated'
  | 'project_archived'
  | 'task_created'
  | 'task_updated'
  | 'task_status_changed'
  | 'task_assigned'
  | 'task_deleted'
  | 'user_role_changed'
  | 'user_status_changed'
  | 'comment_added';

export type EntityType = 'project' | 'task' | 'user';

export interface IActivityEvent extends Document {
  actorId: mongoose.Types.ObjectId;
  actorName: string;
  actorEmail?: string;
  action: ActivityAction;
  entityType: EntityType;
  entityId: string;
  entityTitle: string;
  projectId?: mongoose.Types.ObjectId;
  projectName?: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  requestId?: string;
  createdAt: Date;
}

const ActivityEventSchema = new Schema<IActivityEvent>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorName: { type: String, required: true },
    actorEmail: { type: String },
    action: { type: String, required: true },
    entityType: { type: String, required: true, enum: ['project', 'task', 'user'] },
    entityId: { type: String, required: true },
    entityTitle: { type: String, required: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
    projectName: { type: String },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    requestId: { type: String },
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
ActivityEventSchema.index({ createdAt: -1 });
ActivityEventSchema.index({ actorId: 1, createdAt: -1 });
ActivityEventSchema.index({ projectId: 1, createdAt: -1 });
ActivityEventSchema.index({ entityType: 1, entityId: 1 });
ActivityEventSchema.index({ requestId: 1 });

export const ActivityEvent = mongoose.model<IActivityEvent>('ActivityEvent', ActivityEventSchema);
