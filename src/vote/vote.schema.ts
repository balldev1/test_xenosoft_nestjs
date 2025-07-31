import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VoteDocument = Vote & Document;

@Schema({ timestamps: true })
export class Vote {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Quote', required: true })
  quoteId: Types.ObjectId;

  @Prop({ enum: ['upvote', 'downvote'], required: true })
  voteType: string;
}

export const VoteSchema = SchemaFactory.createForClass(Vote);
