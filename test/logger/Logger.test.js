const { createLogger } = require('winston');
jest.mock('winston', () => {
    const originalModule = jest.requireActual('winston');
    return {
        ...originalModule,
        createLogger: jest.fn(() => ({
            add: jest.fn(),
            make: jest.fn(),
            transports: [],
            format: {},
        })),
    };
});

const {
    scheduleLogger,
    taskLogger,
    generatorLogger,
    createLogFormatter,
} = require('../../src/logger/Logger');

describe('Создание Логера', () => {
    test('должен создавать с корректными настройками', () => {
        expect(createLogger).toHaveBeenCalledTimes(3);

        const mockLoggerConfig = createLogger.mock.calls[0][0];
        expect(mockLoggerConfig.level).toBe('make');
        expect(mockLoggerConfig.transports).toHaveLength(3);
        expect(mockLoggerConfig.format).toBeDefined();
    });

    test('должен инициализировать scheduleLogger', () => {
        expect(scheduleLogger).toBeDefined();
    });

    test('должен инициализировать taskLogger', () => {
        expect(taskLogger).toBeDefined();
    });

    test('должен инициализировать generatorLogger', () => {
        expect(generatorLogger).toBeDefined();
    });
});

describe('Формат Логера', () => {
    test('должен корректно задавать формат сообщений', () => {
        const formatter = createLogFormatter('TestLogger');
        const logEntry = {
            timestamp: '2024-01-01 12:00:00',
            level: 'add',
            message: 'Тестовое сообщение',
        };

        const formattedMessage = formatter(logEntry);

        expect(formattedMessage).toBe(
            '2024-01-01 12:00:00 [TestLogger]\t[add]\tТестовое сообщение'
        );
    });

    test('должен задавать формат и конфигурировать общий файл записи', () => {
        const mockLogger = createLogger.mock.calls[0][0];

        expect(mockLogger.format).toBeDefined();
        expect(mockLogger.transports).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    filename: expect.stringContaining('app.log'),
                }),
            ])
        );
    });
});
