import {
  Req,
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { QuotesService } from './quotes.service';

//bearer token
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAll(
    @Req() req: Request,
    @Query()
    query: {
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: 'upvotes' | 'downvotes' | 'createdAt';
      order?: 'asc' | 'desc';
      filter?: 'voted' | 'not_voted';
    },
  ) {
    const userId = (req as any).user?.userId;
    return this.quotesService.findAll({
      ...query,
      userId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() body: { text: string; author: string }) {
    return this.quotesService.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/upvote')
  async upvote(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    return this.quotesService.upvote(id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/downvote')
  async downvote(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    return this.quotesService.downvote(id, userId);
  }
}
