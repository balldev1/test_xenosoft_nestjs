import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Quote, QuoteDocument } from './quote.schema';
import { Vote, VoteDocument } from '../vote/vote.schema';

@Injectable()
export class QuotesService {
  constructor(
    @InjectModel(Quote.name) private quoteModel: Model<QuoteDocument>,
    @InjectModel(Vote.name) private voteModel: Model<VoteDocument>,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    sortBy?: 'upvotes' | 'downvotes' | 'createdAt';
    order?: 'asc' | 'desc';
    search?: string;
    filter?: 'voted' | 'not_voted';
    userId?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const sortBy = query.sortBy || 'upvotes';
    const sortOrder = query.order === 'asc' ? 1 : -1;

    const filters: any = {};

    // Search by quote text
    if (query.search) {
      filters.text = { $regex: query.search, $options: 'i' };
    }

    // Filter voted/not_voted by user
    if (query.filter === 'voted') {
      filters.upvotes = { $gt: 0 };
    } else if (query.filter === 'not_voted') {
      filters.downvotes = { $gt: 0 };
    }

    const quotes = await this.quoteModel
      .find(filters)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.quoteModel.countDocuments(filters);

    return {
      data: quotes,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: { text: string; author: string }): Promise<Quote> {
    // Validate ข้อมูลพื้นฐาน
    if (!data.text || data.text.trim() === '') {
      throw new BadRequestException('Quote text is required');
    }

    // สร้างเอกสารใหม่และบันทึก
    const newQuote = new this.quoteModel({
      text: data.text,
      author: data.author || 'Unknown',
      upvotes: 0,
      downvotes: 0,
    });
    return newQuote.save();
  }

  async update(
    id: string,
    data: { text?: string; author?: string },
  ): Promise<Quote | null> {
    if (data.text !== undefined && data.text.trim() === '') {
      throw new BadRequestException('Quote text cannot be empty');
    }

    const updatedQuote = await this.quoteModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true },
    );

    if (!updatedQuote) {
      throw new BadRequestException('Quote not found');
    }

    return updatedQuote;
  }

  async upvote(quoteId: string, userId: string): Promise<Quote | null> {
    const quote: any = await this.quoteModel.findById(quoteId);
    if (!quote) throw new BadRequestException('Quote not found');

    const userObjectId = new Types.ObjectId(userId);
    const quoteObjectId = new Types.ObjectId(quote._id.toString());

    const existingVote = await this.voteModel.findOne({
      quoteId: quoteObjectId,
      userId: userObjectId,
    });

    if (existingVote) {
      if (existingVote.voteType === 'upvote') {
        // โหวตซ้ำแบบ upvote
        throw new BadRequestException('User already upvoted');
      } else {
        // เปลี่ยนจาก downvote เป็น upvote
        existingVote.voteType = 'upvote';
        await existingVote.save();

        // ลด downvotes 1 และเพิ่ม upvotes 1
        quote.downvotes = Math.max(0, quote.downvotes - 1);
        quote.upvotes += 1;
        await quote.save();

        return quote;
      }
    }

    // ยังไม่เคยโหวต ให้สร้าง vote ใหม่แบบ upvote
    const newVote = new this.voteModel({
      userId: userObjectId,
      quoteId: quoteObjectId,
      voteType: 'upvote',
    });
    await newVote.save();

    quote.upvotes += 1;
    await quote.save();

    return quote;
  }

  async downvote(quoteId: string, userId: string): Promise<Quote | null> {
    const quote: any = await this.quoteModel.findById(quoteId);
    if (!quote) throw new BadRequestException('Quote not found');

    const userObjectId = new Types.ObjectId(userId);
    const quoteObjectId = new Types.ObjectId(quote._id.toString());

    const existingVote = await this.voteModel.findOne({
      quoteId: quoteObjectId,
      userId: userObjectId,
    });

    if (existingVote) {
      if (existingVote.voteType === 'downvote') {
        // โหวตซ้ำแบบ downvote
        throw new BadRequestException('User already downvoted');
      } else {
        // เปลี่ยนจาก upvote เป็น downvote
        existingVote.voteType = 'downvote';
        await existingVote.save();

        // ลด upvotes 1 และเพิ่ม downvotes 1
        quote.upvotes = Math.max(0, quote.upvotes - 1);
        quote.downvotes += 1;
        await quote.save();

        return quote;
      }
    }

    // ยังไม่เคยโหวต ให้สร้าง vote ใหม่แบบ downvote
    const newVote = new this.voteModel({
      userId: userObjectId,
      quoteId: quoteObjectId,
      voteType: 'downvote',
    });
    await newVote.save();

    quote.downvotes += 1;
    await quote.save();

    return quote;
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    const result = await this.quoteModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new BadRequestException('Quote not found or already deleted');
    }

    // ลบโหวตที่เกี่ยวข้องทั้งหมด
    await this.voteModel.deleteMany({ quoteId: id }).exec();

    return { deleted: true };
  }
}
