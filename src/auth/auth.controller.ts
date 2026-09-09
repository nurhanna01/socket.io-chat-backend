import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

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
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto) {
    try {
      const {token, user} = await this.authService.login(loginDto);
      return {
        message: 'success',
        token,
        user
      };
    } catch (error) {
      throw error;
    }
  }
}
