jest.mock('../../src/scheduler/Scheduler.js');
jest.mock('../../src/task/Task.js');

const Scheduler = require('../../src/scheduler/Scheduler.js');
const Task = require('../../src/task/Task.js');

describe('Ручной планировщик', () => {
    let schedulerMock, taskMock;

    beforeEach(() => {
        jest.clearAllMocks();

        schedulerMock = {
            addTask: jest.fn(),
            start: jest.fn(),
        };
        Scheduler.mockImplementation(() => schedulerMock);

        taskMock = jest.fn();
        Task.mockImplementation(() => taskMock);
    });

    test('должен создать планировщик с ограничением и заполнить очередь READY', () => {
        const schedulerInstance = new Scheduler(2);

        const task1 = new Task(1);
        const task2 = new Task(2, true);
        const task3 = new Task(1, false, 700, 3000, 1500);
        const task4 = new Task(1, true, 700, 3000, 1500);

        expect(Scheduler).toHaveBeenCalledWith(2);
        expect(Task).toHaveBeenCalledTimes(4);

        schedulerInstance.addTask(task1);
        schedulerInstance.addTask(task2);
        schedulerInstance.addTask(task3);
        schedulerInstance.addTask(task4);

        expect(schedulerMock.addTask).toHaveBeenCalledWith(task1);
        expect(schedulerMock.addTask).toHaveBeenCalledWith(task2);
        expect(schedulerMock.addTask).toHaveBeenCalledWith(task3);
        expect(schedulerMock.addTask).toHaveBeenCalledWith(task4);
    });
});
