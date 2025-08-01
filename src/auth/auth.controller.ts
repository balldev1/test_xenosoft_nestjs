import { Res, Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.username, dto.password);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    // เซ็ต cookie
    res.cookie('jwt', result.access_token, {
      httpOnly: true,
      // secure: process.env.NODE_ENV === 'production',
      secure: false,
      maxAge: 24 * 60 * 60 * 1000, // 1 วัน
      sameSite: 'lax',
    });
    // return { message: 'Login successful' };
    return { message: 'Login successful' };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    // ลบ cookie jwt โดยเซ็ตค่าว่างและ expire ทันที
    res.cookie('jwt', '', {
      httpOnly: true,
      secure: false,
      expires: new Date(0),
      sameSite: 'lax',
    });
    return { message: 'Logout successful' };
  }
}
