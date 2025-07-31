import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;

  beforeEach(async () => {
    usersService = {
      findByUsername: jest.fn(),
      create: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mocked-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user and return access_token', async () => {
      const username = 'balldev1';
      const password = 'balldev1';

      (usersService.findByUsername as jest.Mock).mockResolvedValue(null);
      (usersService.create as jest.Mock).mockResolvedValue({
        _id: 'user-id-123',
        username,
      });

      const result = await authService.register(username, password);

      expect(result).toEqual({ access_token: 'mocked-jwt-token' });
      expect(usersService.findByUsername).toHaveBeenCalledWith(username);
      expect(usersService.create).toHaveBeenCalled();
    });

    it('should throw if user already exists', async () => {
      const username = 'balldev1';
      const password = 'balldev1';

      (usersService.findByUsername as jest.Mock).mockResolvedValue({
        _id: 'already-exist',
        username,
      });

      await expect(authService.register(username, password)).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should login and return access_token', async () => {
      const userInput = {
        username: 'balldev1',
        password: 'balldev1',
      };

      const hashed = await bcrypt.hash(userInput.password, 10);

      (usersService.findByUsername as jest.Mock).mockResolvedValue({
        _id: 'user-id-123',
        username: userInput.username,
        password: hashed,
      });

      const result = await authService.login(userInput);

      expect(result).toEqual({ access_token: 'mocked-jwt-token' });
    });

    it('should throw if password is invalid', async () => {
      const userInput = {
        username: 'balldev1',
        password: 'wrongpassword',
      };

      const hashed = await bcrypt.hash('correctpassword', 10);

      (usersService.findByUsername as jest.Mock).mockResolvedValue({
        _id: 'user-id-123',
        username: userInput.username,
        password: hashed,
      });

      await expect(authService.login(userInput)).rejects.toThrow();
    });

    it('should throw if user not found', async () => {
      (usersService.findByUsername as jest.Mock).mockResolvedValue(null);

      await expect(
        authService.login({ username: 'notfound', password: '123' }),
      ).rejects.toThrow();
    });
  });
});
