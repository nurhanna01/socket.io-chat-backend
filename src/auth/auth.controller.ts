import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtGuard } from './jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('register')
  async register(@Body() createDto: RegisterDto): Promise<{ message: string }> {
    try {
      await this.authService.register(createDto);
      return {
        message: 'success',
      };
    } catch (error) {
      throw error;
    }
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    try {
      const token = await this.authService.login(loginDto);
    return {
        message: 'success',
        token: token
      };
    } catch (error) {
      throw error;
    }
  }
}
