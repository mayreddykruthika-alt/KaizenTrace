import mongoose, { Document, Schema } from 'mongoose';

export type JobStatus = 'running' | 'completed' | 'failed';

export interface IJobRun extends Document {
  jobType: string;
  status: JobStatus;
  startedAt: Date;
  finishedAt?: Date;
  processedCount: number;
  failedCount: number;
  errorSummary?: string;
  requestId?: string;
}

const JobRunSchema = new Schema<IJobRun>(
  {
    jobType: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ['running', 'completed', 'failed'],
      default: 'running',
    },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date },
    processedCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    errorSummary: { type: String },
    requestId: { type: String },
  },
  {
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
JobRunSchema.index({ jobType: 1, startedAt: -1 });
JobRunSchema.index({ status: 1 });

export const JobRun = mongoose.model<IJobRun>('JobRun', JobRunSchema);
