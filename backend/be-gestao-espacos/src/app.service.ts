import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

type HealthStatus = {
  database: 'down' | 'up';
  status: 'down' | 'ok';
  timestamp: string;
};

@Injectable()
export class AppService {
  constructor(private readonly dataSource: DataSource) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getHealth(): Promise<HealthStatus> {
    try {
      await this.dataSource.query('SELECT 1');
      return {
        database: 'up',
        status: 'ok',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        database: 'down',
        status: 'down',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
