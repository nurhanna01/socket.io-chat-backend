import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from 'src/entities/users.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';
import { LoginDto } from './dto/login.dto';
import { error } from 'console';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private logger = new Logger('Auth Service - Logger');
  constructor(
    @InjectRepository(Users) private userRepo: Repository<Users>,
    private jwtService : JwtService
) {}

  async register(payload: RegisterDto) {
    try {
      const saltRounds = Number(process.env.BCRYPT_SALTROUNDS);
      const pass = await bcrypt.hash(payload.password, saltRounds);
      const data = this.userRepo.create({
        username: payload.username,
        password: pass,
      });
      await this.userRepo.save(data);
      this.logger.log(`user ${payload.username} success registered account`);
      return;
    } catch (error: any) {
      this.logger.error(
        `user ${payload.username} failed register account, error : ${error}`,
      );
      if (error.code == 'ER_DUP_ENTRY') {
        throw new BadRequestException('username already exist');
      }
      throw new InternalServerErrorException();
    }
  }

  async login(payload: LoginDto) {
    try {
      const getUser = await this.userRepo.findOne({
        where: { username: payload.username },
      });
      console.log('getUser=>', getUser);
      if (!getUser) {
        throw new NotFoundException('user not found');
      }
      const compare = await bcrypt.compare(payload.password, getUser.password);
      if (compare) {
        const token = this.jwtService.sign({
            id:getUser.id,
            username: getUser.username
        })
        return `Bearer ${token}`;
      } else {
        throw new BadRequestException('invalid password');
      }
    } catch (error) {
      this.logger.error(
        `user ${payload.username} failed logged in, error : ${error}`,
      );
      throw error
    }
  }
}
