import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './config/database.config';
import { ChatModule } from './chat/chat.module';
console.log('app module');
@Module({
  imports: [TypeOrmModule.forRoot(typeOrmConfig), ChatModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
