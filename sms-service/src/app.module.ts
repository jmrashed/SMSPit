import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MessagesModule } from './messages/messages.module';
import { StatisticsModule } from './statistics/statistics.module';
import { Message } from './messages/entities/message.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', '127.0.0.1'),
        port: config.get<number>('DB_PORT', 5432),
        database: config.get<string>('DB_DATABASE', 'smspit'),
        username: config.get<string>('DB_USERNAME', 'smspit'),
        password: config.get<string>('DB_PASSWORD', 'smspit'),
        entities: [Message],
        // Schema/migrations are owned by auth-service (Laravel) -- this
        // service must never create or alter tables on its own.
        synchronize: false,
        migrationsRun: false,
        extra: {
          max: config.get<number>('DB_POOL_SIZE', 10),
        },
      }),
    }),
    MessagesModule,
    StatisticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
