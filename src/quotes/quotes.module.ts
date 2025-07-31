import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';

import { Quote, QuoteSchema } from './quote.schema';
import { Vote, VoteSchema } from '../vote/vote.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quote.name, schema: QuoteSchema },
      { name: Vote.name, schema: VoteSchema },
    ]),
  ],
  providers: [QuotesService],
  controllers: [QuotesController],
})
export class QuotesModule {}
