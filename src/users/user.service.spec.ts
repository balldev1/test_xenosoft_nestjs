import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User } from './user.schema';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    username: 'testuser',
    password: 'hashedpassword',
  };

  class UserModelMockClass {
    _id?: string;
    username?: string;
    password?: string;

    constructor(data?: Partial<typeof mockUser>) {
      if (data) Object.assign(this, data);
    }

    static findOne = jest.fn();

    async save() {
      return this;
    }
  }

  // สร้าง jest.fn() ที่ใช้ UserModelMockClass เป็น implementation
  const UserModelMock = jest
    .fn()
    .mockImplementation((data) => new UserModelMockClass(data)) as any;
  UserModelMock.findOne = UserModelMockClass.findOne;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: UserModelMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findByUsername', () => {
    it('should return user if found', async () => {
      UserModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      const user = await service.findByUsername('testuser');

      expect(user).toEqual(mockUser);
      expect(UserModelMock.findOne).toHaveBeenCalledWith({
        username: 'testuser',
      });
    });

    it('should return null if user not found', async () => {
      UserModelMock.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const user = await service.findByUsername('nonexistent');

      expect(user).toBeNull();
      expect(UserModelMock.findOne).toHaveBeenCalledWith({
        username: 'nonexistent',
      });
    });
  });

  describe('create', () => {
    it('should create and save a new user', async () => {
      const data = { username: 'newuser', password: 'password123' };
      const savedInstance = new UserModelMockClass(data);
      savedInstance._id = 'newid';

      const saveSpy = jest
        .spyOn(UserModelMockClass.prototype, 'save')
        .mockResolvedValue(savedInstance);

      const result: any = await service.create(data);

      expect(saveSpy).toHaveBeenCalled();
      expect(result).toMatchObject(data);
      expect(result._id).toBe('newid');
    });
  });
});
