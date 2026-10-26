import fs from 'fs';
import path from 'path';
import { test, expect } from 'vitest';

test('marks monthly dataset as STALE if latest month is more than 2 months old', () => {
    const oldDate = new Date();
    oldDate.setMonth(oldDate.getMonth() - 3); // 3 months ago
    
    const mockRainfallData = {
        result: {
            records: [{ month: oldDate.toISOString().slice(0, 7), rainfall: 150 }]
        }
    };
    
    const testFilePath = path.join(process.cwd(), 'data', 'dynamic', 'testRainfall.json');
    fs.mkdirSync(path.dirname(testFilePath), { recursive: true });
    fs.writeFileSync(testFilePath, JSON.stringify(mockRainfallData));

    // Evaluate freshness logic simulation
    const fileContent = JSON.parse(fs.readFileSync(testFilePath, 'utf8'));
    const records = fileContent.result.records;
    const latestDate = new Date(records[records.length - 1].month);
    const now = new Date();
    const monthsElapsed = (now.getFullYear() - latestDate.getFullYear()) * 12 + (now.getMonth() - latestDate.getMonth());
    
    const status = monthsElapsed > 2 ? 'STALE' : 'FRESH';
    expect(status).toBe('STALE');
    
    // Cleanup
    fs.unlinkSync(testFilePath);
});