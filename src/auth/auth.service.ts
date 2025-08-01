import { Injectable, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(username: string, password: string) {
    const existing = await this.usersService.findByUsername(username);
    if (existing) throw new BadRequestException('User already exists');

    const hashed = await bcrypt.hash(password, 10);
    const user: any = await this.usersService.create({
      username,
      password: hashed,
    });

    const payload = { username: user.username, sub: user._id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async login(userInput: any) {
    const user: any = await this.usersService.findByUsername(
      userInput.username,
    );
    if (!user) throw new BadRequestException('User not found');

    const valid = await bcrypt.compare(userInput.password, user.password);
    if (!valid) throw new BadRequestException('Invalid credentials');

    const payload = { username: user.username, sub: user._id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async logout() {
    return { message: 'Logout successful' };
  }
}
