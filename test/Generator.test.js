const Generator = require('../src/generator/Generator');
const Task = require('../src/task/Task');
const { generatorLogger: log } = require('../src/logger/Logger');

jest.mock('../src/task/Task');
jest.mock('../src/logger/Logger', () => ({
    generatorLogger: {
        make: jest.fn(),
        abort: jest.fn(),
    },
}));

let generator;

beforeEach(() => {
    jest.clearAllMocks();
    Generator.instance = null;
    generator = new Generator(3000, 1000, 3000, 1500);
});

describe('Инициализация генератора', () => {
    test('должен возвращать экземпляр singleton', () => {
        const instance1 = Generator.getInstance();
        const instance2 = Generator.getInstance(2000);

        expect(instance1).toBe(instance2);
        expect(instance1.taskGenerationMs).toBe(3000);
    });

    test('должен создать число от 0 до заданного в getNumberFromOneTo', () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.5);

        const number = generator.getNumberFromOneTo(10);

        expect(number).toBe(5);
    });
});

describe('Создание задач', () => {
    test('должен создать расширенную задачу используя генератор', () => {
        jest.spyOn(generator, 'getNumberFromOneTo').mockImplementation((num) => num - 1);
        jest.spyOn(Math, 'random').mockReturnValue(0.6);

        const task = generator.taskGenerator();

        expect(Task).toHaveBeenCalledWith(3, true, 999, 2999, 1499);
        expect(task).toBeInstanceOf(Task);
        expect(log.make).toHaveBeenCalledWith(expect.stringContaining('Создана задача'));
    });

    test('должен создать НЕ расширенную задачу используя генератор', () => {
        jest.spyOn(generator, 'getNumberFromOneTo').mockImplementation((num) => num - 1);
        jest.spyOn(Math, 'random').mockReturnValue(0.4);

        const task = generator.taskGenerator();

        expect(Task).toHaveBeenCalledWith(3, false, 999, 2999, null);
        expect(task).toBeInstanceOf(Task);
        expect(log.make).toHaveBeenCalledWith(expect.stringContaining('основная'));
    });

    test('должен создавать задачи и затем отправлять их используя WebSocket', () => {
        const ws = { send: jest.fn() };
        const mockTask = { id: 1, priority: 2 };
        jest.spyOn(generator, 'taskGenerator').mockReturnValue(mockTask);

        generator.start(ws);

        expect(ws.send).toHaveBeenCalledWith(JSON.stringify(mockTask));
        expect(generator.taskGenerator).toHaveBeenCalled();
    });
});

describe('Вывод сообщений', () => {
    test('должен выводить сообщения используя уровень логирования abort', () => {
        generator.logAbort('Test message');
        expect(log.abort).toHaveBeenCalledWith('Test message');
    });

    test('должен выводить сообщение о создании расширенной задачи используя уровень логирования make', () => {
        const task = new Task();
        task.isExtended = true;
        generator.logMake(task);
        expect(log.make).toHaveBeenCalledWith(expect.stringContaining('расширенная'));
    });
});
