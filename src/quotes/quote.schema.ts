import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QuoteDocument = Quote & Document;

@Schema()
export class Quote {
  @Prop({ required: true })
  text: string;

  @Prop()
  author: string;

  @Prop({ default: 0 })
  upvotes: number;

  @Prop({ default: 0 })
  downvotes: number;
}

export const QuoteSchema = SchemaFactory.createForClass(Quote);
