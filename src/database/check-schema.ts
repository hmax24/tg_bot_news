import type { SqlInMemory } from 'typeorm/driver/SqlInMemory';
import dataSource from './data-source';

async function checkSchema(): Promise<void> {
    try {
        await dataSource.initialize();
        const changes: SqlInMemory = await dataSource.driver.createSchemaBuilder().log();
        if (changes.upQueries.length > 0) {
            console.error('Database schema differs from entities. Do not baseline migrations until the differences are reviewed.');
            process.exitCode = 1;
            return;
        }
        console.log('Database schema matches the current entities. No changes were executed.');
    } finally {
        if (dataSource.isInitialized) {
            await dataSource.destroy();
        }
    }
}

checkSchema().catch((error: unknown): void => {
    console.error(error instanceof Error ? error.message : 'Schema check failed');
    process.exitCode = 1;
});
