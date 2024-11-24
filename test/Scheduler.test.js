jest.mock('../src/task/Task');
jest.mock('../src/logger/Logger', () => ({
    scheduleLogger: {
        add: jest.fn(),
        empty: jest.fn(),
        abort: jest.fn(),
        exec: jest.fn(),
        event: jest.fn(),
    },
}));

const Task = require('../src/task/Task');
const { scheduleLogger: log } = require('../src/logger/Logger');
const Scheduler = require('../src/scheduler/Scheduler');

let scheduler;

beforeEach(() => {
    jest.clearAllMocks();
    scheduler = Scheduler.getInstance(5, 500);

    scheduler.queues = {
        ready: Array.from({ length: scheduler.priorityLevels }, () => []),
        waiting: Array.from({ length: scheduler.priorityLevels }, () => []),
        suspended: Array.from({ length: scheduler.priorityLevels }, () => []),
    };
});

afterEach(() => {
    Scheduler.instance = null;
});

describe('Инициализация планировщика', () => {
    test('должен возвращать экземпляр singleton', () => {
        const instance1 = Scheduler.getInstance();
        const instance2 = Scheduler.getInstance();
        expect(instance1).toBe(instance2);
    });

    test('должен инициализировать очереди с ожидаемыми уровнями приоритета', () => {
        const scheduler = new Scheduler(5, 500);
        expect(scheduler.queues.ready).toHaveLength(scheduler.priorityLevels);
        expect(scheduler.queues.ready.every((queue) => Array.isArray(queue))).toBe(true);
    });

    test('должен выставлять значения по умолчанию при передачи в планировщик недопустимых значений', () => {
        const invalidScheduler = new Scheduler(-5, -100);
        expect(invalidScheduler.readyQueueLimit).toBe(5);
        expect(invalidScheduler.scheduleExecutionMs).toBe(500);
        expect(invalidScheduler.priorityLevels).toBe(4);
        expect(invalidScheduler.queues.ready).toHaveLength(4);
    });

    test('должен инициализировать планировщик значения по умолчанию при отсутствии вводных', () => {
        const scheduler = new Scheduler();

        expect(scheduler.readyQueueLimit).toBe(5);
        expect(scheduler.scheduleExecutionMs).toBe(500);
        expect(scheduler.priorityLevels).toBe(4);
        expect(scheduler.queues.ready).toHaveLength(4);
    });
});

describe('Добавление задач', () => {
    test('должен добавить задачу в очередь READY, если она не заполнена', () => {
        const task = new Task();
        task.priority = 2;
        task.id = 1;

        scheduler.addTask(task);

        expect(scheduler.queues.ready[2]).toContain(task);
        expect(task.activate).toHaveBeenCalled();
        expect(log.add).toHaveBeenCalledWith('Задача 1 добавлена в очередь готовности 2.');
    });

    test('должен добавить задачу в очередь SUSPENDED, если READY заполнена', () => {
        const task = new Task();
        task.priority = 0;
        task.id = 1;

        for (let i = 0; i < scheduler.readyQueueLimit; i++) {
            scheduler.queues.ready[0].push(new Task());
        }

        scheduler.addTask(task);

        expect(scheduler.queues.suspended[0]).toContain(task);
        expect(log.abort).toHaveBeenCalledWith('Очередь 0 заполнена');
    });

    test('не должен добавлять задачу с недопустимым приоритетом', () => {
        const invalidTask = new Task();
        invalidTask.priority = -1;
        scheduler.addTask(invalidTask);

        expect(scheduler.queues.ready.some((queue) => queue.includes(invalidTask))).toBe(false);
        expect(scheduler.queues.suspended.some((queue) => queue.includes(invalidTask))).toBe(false);

        expect(log.abort).toHaveBeenCalledWith(
            expect.stringContaining('имеет недопустимый приоритет -1')
        );
        expect(scheduler.isReadyQueueFull(-1)).toBe(false);
    });

    test('должен перевести SUSPENDED задачу в READY очередь если есть место', () => {
        const suspendedTask = new Task();
        suspendedTask.priority = 2;
        suspendedTask.id = 1;
        scheduler.queues.suspended[2].push(suspendedTask);

        scheduler.enqueueSuspendToReady(2);

        expect(scheduler.queues.ready[2]).toContain(suspendedTask);
        expect(scheduler.queues.suspended[2]).not.toContain(suspendedTask);
    });

    test('не должен переводить задачу из SUSPENDED в READY если нет мест', () => {
        scheduler.queues.ready[2] = Array(5).fill(new Task());
        scheduler.queues.waiting[2] = [];
        scheduler.readyQueueLimit = 5;
        const shiftedTask = new Task();
        shiftedTask.priority = 2;

        jest.spyOn(scheduler, 'isEnoughSpaceForSuspendTask');

        scheduler.evaluateMoveSuspendToReady(shiftedTask);

        expect(scheduler.isEnoughSpaceForSuspendTask).toHaveBeenCalled();
        expect(scheduler.queues.ready[2]).not.toContain(shiftedTask);
    });
});

describe('Выполнение задач', () => {
    test('должен начать выполнение задачи', () => {
        const task = new Task();
        task.priority = 3;
        task.id = 1;

        scheduler.queues.ready[3].push(task);

        scheduler.scheduleExecution();

        expect(task.start).toHaveBeenCalled();
        expect(log.exec).toHaveBeenCalledWith('Задача 1 с приоритетом 3 начала выполнение.');
    });

    test('должен выполнять запущенную задачу, если такая имеется', () => {
        const runningTask = new Task();
        scheduler.runningTask = runningTask;

        jest.spyOn(scheduler, 'executeRunningTask');

        scheduler.scheduleExecution();

        expect(scheduler.executeRunningTask).toHaveBeenCalled();
    });

    test('должен вывести сообщение при отсутствии задач', () => {
        scheduler.scheduleExecution();
        expect(log.empty).toHaveBeenCalledWith('Нет задач для выполнения');
    });

    test('должен прервать выполнение менее приоритетной задачи при наличии более приоритетной', () => {
        const runningTask = new Task();
        const highPriorityTask = new Task();

        runningTask.priority = 1;
        highPriorityTask.priority = 3;

        scheduler.runningTask = runningTask;
        scheduler.queues.ready[3].push(highPriorityTask);

        scheduler.handlePreemption();

        expect(runningTask.preempt).toHaveBeenCalled();
        expect(log.abort).toHaveBeenCalledWith(expect.stringContaining('прерывает задачу'));
    });

    test('должен продолжать выполнение более приоритетной задачи при наличии менее приоритетной', () => {
        const runningTask = new Task();
        runningTask.priority = 1;

        const lowerPriorityTask = new Task();
        lowerPriorityTask.priority = 0;

        scheduler.runningTask = runningTask;
        scheduler.queues.ready[0].push(lowerPriorityTask);

        scheduler.handlePreemption();

        expect(lowerPriorityTask.activate).not.toHaveBeenCalled();
        expect(log.abort).not.toHaveBeenCalledWith(expect.stringContaining('прерывает задачу'));
    });

    test('должен поставить выполнение новой задачи без прерывания, при отсутствии выполняющейся задачи', () => {
        scheduler.runningTask = null;
        const highPriorityTask = new Task();
        highPriorityTask.priority = 3;
        scheduler.queues.ready[3].push(highPriorityTask);

        scheduler.handlePreemption();

        expect(scheduler.runningTask).toBe(highPriorityTask);
        expect(scheduler.queues.ready[3]).not.toContain(highPriorityTask);
        expect(log.abort).not.toHaveBeenCalledWith(expect.stringContaining('прерывает задачу'));
    });

    test('должен интервально выводить сообщение о выполнении задачи', () => {
        const runningTask = new Task();
        runningTask.taskExecutionMs = 1000;
        runningTask.id = 1;
        scheduler.runningTask = runningTask;

        jest.useFakeTimers();

        scheduler.initializeInterval();

        jest.advanceTimersByTime(1000);

        expect(log.exec).toHaveBeenCalledWith('Задача 1 выполняется...');
        jest.useRealTimers();
    });

    test('должен завершить выполнение задачи после завершения таймера', () => {
        const runningTask = new Task();
        runningTask.taskCompletionMs = 2000;
        scheduler.runningTask = runningTask;

        jest.spyOn(scheduler, 'terminateRunningTask');
        jest.useFakeTimers();

        scheduler.initializeCompletionTimeout();

        jest.advanceTimersByTime(2000);

        expect(scheduler.terminateRunningTask).toHaveBeenCalled();
        expect(scheduler.runningTask).toBeNull();
        jest.useRealTimers();
    });

    test('не должен вызывать завершение задачи если ничего не выполняется', () => {
        const runningTask = new Task();
        runningTask.taskCompletionMs = 2000;
        scheduler.runningTask = runningTask;

        jest.spyOn(scheduler, 'terminateRunningTask');
        jest.useFakeTimers();

        scheduler.initializeCompletionTimeout();
        scheduler.runningTask = null;

        jest.advanceTimersByTime(2000);

        expect(scheduler.terminateRunningTask).not.toHaveBeenCalled();
        jest.useRealTimers();
    });

    test('должен переводить задачу из режима ожидания по окончанию таймера', () => {
        const runningTask = new Task();
        runningTask.priority = 2;
        runningTask.isExtended = true;
        runningTask.taskWaitingMs = 1500;
        scheduler.runningTask = runningTask;

        jest.spyOn(scheduler, 'releaseTask');
        jest.useFakeTimers();

        scheduler.initializeWaitingTimeout();

        jest.advanceTimersByTime(1500);

        expect(scheduler.releaseTask).toHaveBeenCalledWith(runningTask);
        jest.useRealTimers();
    });

    test('должен интервально пытаться выполнять задачи', () => {
        jest.spyOn(scheduler, 'scheduleExecution');
        jest.useFakeTimers();

        scheduler.start();

        jest.advanceTimersByTime(500);

        expect(scheduler.scheduleExecution).toHaveBeenCalled();
        jest.useRealTimers();
    });
});

describe('Работа с таймерами', () => {
    test('должен инициализировать таймеры, если есть выполняющаяся задача', () => {
        const task = new Task();
        task.id = 1;
        task.priority = 1;
        scheduler.runningTask = task;

        scheduler.initializeTimers();

        expect(log.exec).toHaveBeenCalledWith(
            `Задача 1 с приоритетом ${task.priority} начала выполнение.`
        );
        expect(scheduler.taskExecutionInterval).not.toBeNull();
        expect(scheduler.taskCompletionTimeout).not.toBeNull();
    });

    test('не должен инициализировать таймеры, если нет выполняющейся задачи', () => {
        scheduler.runningTask = null;

        scheduler.executeTask();
        scheduler.initializeTimers();

        expect(scheduler.taskExecutionInterval).toBeNull();
        expect(scheduler.taskCompletionTimeout).toBeNull();
    });

    test('не должен инициализировать таймеры, если они уже инициализированы', () => {
        const task = new Task();
        task.id = 1;
        task.priority = 1;
        scheduler.runningTask = task;

        jest.useFakeTimers();
        scheduler.taskExecutionInterval = setInterval(() => {}, 1000);
        scheduler.taskCompletionTimeout = setTimeout(() => {}, 1000);

        scheduler.executeTask();
        scheduler.initializeTimers();

        expect(scheduler.taskExecutionInterval).not.toBeNull();
        expect(scheduler.taskCompletionTimeout).not.toBeNull();
        jest.useRealTimers();
    });

    test('должен перевести задачу в режим ожидания', () => {
        const runningTask = new Task();
        runningTask.id = 1;
        runningTask.priority = 1;
        runningTask.isExtended = true;
        scheduler.runningTask = runningTask;

        jest.spyOn(scheduler, 'initializeWaitingTimeout');
        jest.spyOn(Math, 'random').mockReturnValue(0.5);

        scheduler.initializeTimeout();
        expect(scheduler.initializeWaitingTimeout).toHaveBeenCalled();

        Math.random.mockRestore();
    });

    test('должен очищать таймеры', () => {
        jest.useFakeTimers();
        scheduler.taskExecutionInterval = setInterval(() => {}, 1000);
        scheduler.taskCompletionTimeout = setTimeout(() => {}, 1000);

        scheduler.clearTimers();

        expect(scheduler.taskExecutionInterval).toBeNull();
        expect(scheduler.taskCompletionTimeout).toBeNull();
        jest.useRealTimers();
    });
});
