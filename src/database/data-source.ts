import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { createDatabaseConfig } from './database.config';

if (existsSync('.env')) {
  loadEnvFile('.env');
}

const configService: ConfigService = new ConfigService();
const dataSource: DataSource = new DataSource(
  createDatabaseConfig(configService),
);

export default dataSource;
