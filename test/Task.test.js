jest.mock('../src/logger/Logger', () => ({
    taskLogger: {
        state: jest.fn(),
    },
}));

const { taskLogger: log } = require('../src/logger/Logger');
const Task = require('../src/task/Task');

beforeEach(() => {
    jest.clearAllMocks();
    Task.static_id = 1;
});

describe('Создание задач', () => {
    test('должен создавать задачу с значениями по умолчанию', () => {
        const task = new Task(2);

        expect(task.id).toBe(1);
        expect(task.priority).toBe(2);
        expect(task.isExtended).toBe(false);
        expect(task.state).toBe(Task.States.SUSPENDED);
        expect(task.previousState).toBeNull();
    });

    test('должен создавать задачу на основе полученной', () => {
        const receivedTask = {
            priority: 1,
            isExtended: true,
            taskExecutionMs: 500,
            taskCompletionMs: 2000,
            taskWaitingMs: 1000,
        };
        const task = Task.initReceivedTask(receivedTask);

        expect(task.priority).toBe(1);
        expect(task.isExtended).toBe(true);
        expect(task.taskExecutionMs).toBe(500);
        expect(task.taskCompletionMs).toBe(2000);
    });
});

describe('Изменение состояния задачи', () => {
    test('должен переводить задачу из состояния SUSPENDED в состояние READY', () => {
        const task = new Task(2);
        task.activate();

        expect(task.state).toBe(Task.States.READY);
        expect(task.previousState).toBe(Task.States.SUSPENDED);
        expect(log.state).toHaveBeenCalledWith(
            expect.stringContaining('перешла из suspended в ready')
        );
    });

    test('не должен менять состояние задачи при несоблюдении условий', () => {
        const task = new Task(2);
        task.transitToStateIf(Task.States.RUNNING, false);

        expect(task.state).toBe(Task.States.SUSPENDED);
        expect(log.state).not.toHaveBeenCalled();
    });

    test('должен переводить задачу в состояние SUSPENDED', () => {
        const task = new Task(2);
        task.activate();
        task.start();
        task.terminate();

        expect(task.state).toBe(Task.States.SUSPENDED);
        expect(log.state).toHaveBeenCalledWith(
            expect.stringContaining('перешла из running в suspended')
        );
    });

    test('должен переводить расширенную задачу в состояние WAITING', () => {
        const task = new Task(2, true);
        task.activate();
        task.start();
        task.wait();

        expect(task.state).toBe(Task.States.WAITING);
        expect(task.previousState).toBe(Task.States.RUNNING);
        expect(log.state).toHaveBeenCalledWith(
            expect.stringContaining('перешла из running в waiting')
        );
    });

    test('не должен переводить НЕ расширенную задачу в состояние WAITING', () => {
        const task = new Task(2, false);
        task.activate();
        task.start();
        task.wait();

        expect(task.state).toBe(Task.States.RUNNING);
        expect(log.state).not.toHaveBeenCalledWith(
            expect.stringContaining('перешла из running в waiting')
        );
    });

    test('должен переводить задачу из состояния WAITING в состояние READY', () => {
        const task = new Task(2);
        task.state = Task.States.WAITING;

        task.release();

        expect(task.state).toBe(Task.States.READY);
        expect(log.state).toHaveBeenCalledWith(
            expect.stringContaining('перешла из waiting в ready')
        );
    });

    test('должен переводить задачу из состояния RUNNING в состояние READY', () => {
        const task = new Task(2);
        task.state = Task.States.RUNNING;

        task.preempt();

        expect(task.state).toBe(Task.States.READY);
        expect(log.state).toHaveBeenCalledWith(
            expect.stringContaining('перешла из running в ready')
        );
    });
});
