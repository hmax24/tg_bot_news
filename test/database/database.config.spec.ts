import { ConfigService } from '@nestjs/config';
import { createDatabaseConfig } from '../../src/database/database.config';
import type { DataSourceOptions } from 'typeorm';
import { NewsBroadcast } from '../../src/news-broadcast/news-broadcast.entity';
import {NewsArticleContent} from "../../src/news-article-content/news-article-content.entity";
import { NewsArticleIndex } from '../../src/news-indexing/news-article-index.entity';
import { NewsIngestion } from '../../src/ingestion/news-ingestion.entity';

function config(port: string = '5432'): ConfigService {
  const service: ConfigService = new ConfigService({
    DB_HOST: 'localhost',
    DB_PORT: port,
    DB_USERNAME: 'test',
    DB_PASSWORD: 'test-only',
    DB_DATABASE: 'test',
  });
  return service;
}

describe('Database configuration', (): void => {
  beforeEach((): void => {
    const environment: NodeJS.ProcessEnv = { ...process.env };

    delete environment.DB_HOST;
    delete environment.DB_PORT;
    delete environment.DB_USERNAME;
    delete environment.DB_PASSWORD;
    delete environment.DB_DATABASE;

    jest.replaceProperty(process, 'env', environment);
  });

  afterEach((): void => {
    jest.restoreAllMocks();
  });

  it('uses environment settings and never changes schema on startup', (): void => {
    const options: DataSourceOptions = createDatabaseConfig(config());
    expect(options).toMatchObject({
      type: 'postgres',
      username: 'test',
      database: 'test',
      synchronize: false,
      migrationsRun: false,
    });
    expect(options.entities).toHaveLength(8);
    expect(options.entities).toContain(NewsIngestion);
    expect(options.entities).toContain(NewsArticleIndex);
    expect(options.entities).toContain(NewsArticleContent);
    expect(options.entities).toContain(NewsBroadcast);
  });

  it.each(['0', '65536', '-1', 'abc', '5432.5'])(
    'rejects invalid port %s',
    (port: string): void => {
      expect((): DataSourceOptions =>
        createDatabaseConfig(config(port)),
      ).toThrow('DB_PORT');
    },
  );

  it('requires explicit credentials', (): void => {
    const service: ConfigService = new ConfigService({ DB_HOST: 'localhost' });
    expect((): DataSourceOptions => createDatabaseConfig(service)).toThrow(
      'DB_USERNAME',
    );
  });
});
