import { Test, TestingModule } from '@nestjs/testing';
import { QuotesService } from '../../src/quotes/quotes.service';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('QuotesService', () => {
  let service: QuotesService;

  const mockQuoteId = new Types.ObjectId().toHexString();
  const mockUserId = new Types.ObjectId().toHexString();

  const mockQuoteDoc = {
    _id: mockQuoteId,
    text: 'Test create',
    author: 'Tester',
    upvotes: 0,
    downvotes: 0,
    save: jest.fn().mockResolvedValue(true),
  };

  // Mock class สำหรับ QuoteModel (constructor + static methods)
  class QuoteModelMockClass {
    _id?: string;
    text?: string;
    author?: string;
    upvotes?: number;
    downvotes?: number;
    constructor(data?: Partial<typeof mockQuoteDoc>) {
      if (data) Object.assign(this, data);
    }

    async save() {
      return this;
    }

    static findById = jest.fn();
    static find = jest.fn();
    static countDocuments = jest.fn();
  }

  // ใช้ jest.Mocked<typeof QuoteModelMockClass> เพื่อให้ static methods ถูกมองเห็น
  const QuoteModelMock = jest
    .fn()
    .mockImplementation(
      (data) => new QuoteModelMockClass(data),
    ) as unknown as jest.Mocked<typeof QuoteModelMockClass>;

  // โอน static methods จากคลาสไปยัง mock function
  QuoteModelMock.findById = QuoteModelMockClass.findById;
  QuoteModelMock.find = QuoteModelMockClass.find;
  QuoteModelMock.countDocuments = QuoteModelMockClass.countDocuments;

  // Mock class สำหรับ VoteModel (constructor + static findOne)
  class VoteModelMockClass {
    userId?: any;
    quoteId?: any;
    voteType?: string;

    save = jest.fn().mockResolvedValue(true);

    constructor(data?: Partial<VoteModelMockClass>) {
      if (data) Object.assign(this, data);
    }
  }

  const VoteModelMock = jest
    .fn()
    .mockImplementation((data) => new VoteModelMockClass(data));
  // เพิ่ม static method findOne แยกต่างหาก
  (VoteModelMock as any).findOne = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotesService,
        { provide: getModelToken('Quote'), useValue: QuoteModelMock },
        { provide: getModelToken('Vote'), useValue: VoteModelMock },
      ],
    }).compile();

    service = module.get<QuotesService>(QuotesService);
  });

  describe('findAll', () => {
    it('should return paginated quotes', async () => {
      QuoteModelMock.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockQuoteDoc]),
      });
      QuoteModelMock.countDocuments.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result).toEqual({
        data: [mockQuoteDoc],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
      expect(QuoteModelMock.find).toHaveBeenCalled();
      expect(QuoteModelMock.countDocuments).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create and save a new quote', async () => {
      const saveSpy = jest
        .spyOn(QuoteModelMockClass.prototype, 'save')
        .mockResolvedValue(mockQuoteDoc);

      const data = { text: 'Test create', author: 'Author' };
      const result = await service.create(data);

      expect(result.text).toBe(data.text);
      expect(saveSpy).toHaveBeenCalled();
    });

    it('should throw BadRequestException if text is empty', async () => {
      await expect(service.create({ text: '', author: 'A' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('upvote', () => {
    it('should throw if quote not found', async () => {
      QuoteModelMock.findById.mockResolvedValue(null);
      await expect(service.upvote(mockQuoteId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if user already upvoted', async () => {
      QuoteModelMock.findById.mockResolvedValue({
        ...mockQuoteDoc,
        save: jest.fn(),
      });
      (VoteModelMock as any).findOne.mockResolvedValue({ voteType: 'upvote' });

      await expect(service.upvote(mockQuoteId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should change downvote to upvote and update counts', async () => {
      const saveQuote = jest.fn().mockResolvedValue(true);
      QuoteModelMock.findById.mockResolvedValue({
        ...mockQuoteDoc,
        upvotes: 2,
        downvotes: 1,
        save: saveQuote,
      });
      (VoteModelMock as any).findOne.mockResolvedValue({
        voteType: 'downvote',
        save: jest.fn().mockResolvedValue(true),
      });

      const result: any = await service.upvote(mockQuoteId, mockUserId);

      expect(result.upvotes).toBe(3);
      expect(result.downvotes).toBe(0);
      expect(saveQuote).toHaveBeenCalled();
    });

    it('should create new upvote vote and increment upvotes', async () => {
      const saveQuote = jest.fn().mockResolvedValue(true);
      QuoteModelMock.findById.mockResolvedValue({
        ...mockQuoteDoc,
        upvotes: 0,
        save: saveQuote,
      });
      (VoteModelMock as any).findOne.mockResolvedValue(null);

      const newVoteInstance = {
        save: jest.fn().mockResolvedValue(true),
      };
      VoteModelMock.mockImplementation(() => newVoteInstance);

      const result: any = await service.upvote(mockQuoteId, mockUserId);

      expect(VoteModelMock).toHaveBeenCalledWith({
        userId: expect.any(Object),
        quoteId: expect.any(Object),
        voteType: 'upvote',
      });
      expect(newVoteInstance.save).toHaveBeenCalled();
      expect(saveQuote).toHaveBeenCalled();
      expect(result.upvotes).toBe(1);
    });
  });

  describe('downvote', () => {
    it('should throw if quote not found', async () => {
      QuoteModelMock.findById.mockResolvedValue(null);
      await expect(service.downvote(mockQuoteId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if user already downvoted', async () => {
      QuoteModelMock.findById.mockResolvedValue({
        ...mockQuoteDoc,
        save: jest.fn(),
      });
      (VoteModelMock as any).findOne.mockResolvedValue({
        voteType: 'downvote',
      });

      await expect(service.downvote(mockQuoteId, mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should change upvote to downvote and update counts', async () => {
      const saveQuote = jest.fn().mockResolvedValue(true);
      QuoteModelMock.findById.mockResolvedValue({
        ...mockQuoteDoc,
        upvotes: 1,
        downvotes: 0,
        save: saveQuote,
      });
      (VoteModelMock as any).findOne.mockResolvedValue({
        voteType: 'upvote',
        save: jest.fn().mockResolvedValue(true),
      });

      const result: any = await service.downvote(mockQuoteId, mockUserId);

      expect(result.upvotes).toBe(0);
      expect(result.downvotes).toBe(1);
      expect(saveQuote).toHaveBeenCalled();
    });

    it('should create new downvote vote and increment downvotes', async () => {
      const saveQuote = jest.fn().mockResolvedValue(true);
      QuoteModelMock.findById.mockResolvedValue({
        ...mockQuoteDoc,
        downvotes: 0,
        save: saveQuote,
      });
      (VoteModelMock as any).findOne.mockResolvedValue(null);

      const newVoteInstance = {
        save: jest.fn().mockResolvedValue(true),
      };
      VoteModelMock.mockImplementation(() => newVoteInstance);

      const result: any = await service.downvote(mockQuoteId, mockUserId);

      expect(VoteModelMock).toHaveBeenCalledWith({
        userId: expect.any(Object),
        quoteId: expect.any(Object),
        voteType: 'downvote',
      });
      expect(newVoteInstance.save).toHaveBeenCalled();
      expect(saveQuote).toHaveBeenCalled();
      expect(result.downvotes).toBe(1);
    });
  });
});
