// test/Task.test.js

jest.mock('../src/logger/Logger', () => ({
    taskLogger: {
        state: jest.fn(),
    },
}));

const { taskLogger: log } = require('../src/logger/Logger');
const Task = require('../src/task/Task');

describe('Task', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Task.static_id = 1; // Reset static ID for consistency in tests
    });

    test('should initialize task with default values', () => {
        const task = new Task(2);

        expect(task.id).toBe(1);
        expect(task.priority).toBe(2);
        expect(task.state).toBe(Task.States.SUSPENDED);
        expect(task.previousState).toBeNull();
    });

    test('should initialize received task correctly', () => {
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

    test('should correctly transit states when condition is met', () => {
        const task = new Task(2);
        task.activate();

        expect(task.state).toBe(Task.States.READY);
        expect(task.previousState).toBe(Task.States.SUSPENDED);
        expect(log.state).toHaveBeenCalledWith(expect.stringContaining('перешла из suspended в ready'));
    });

    test('should not transit state if condition is not met', () => {
        const task = new Task(2);
        task.transitToStateIf(Task.States.RUNNING, false);

        expect(task.state).toBe(Task.States.SUSPENDED);
        expect(log.state).not.toHaveBeenCalled();
    });

    test('should terminate task correctly', () => {
        const task = new Task(2);
        task.activate();
        task.start();
        task.terminate();

        expect(task.state).toBe(Task.States.SUSPENDED);
        expect(log.state).toHaveBeenCalledWith(expect.stringContaining('перешла из running в suspended'));
    });

    test('should correctly transition to WAITING state when extended task is running', () => {
        const task = new Task(2, true); // Extended task
        task.activate();
        task.start();
        task.wait();
    
        expect(task.state).toBe(Task.States.WAITING);
        expect(task.previousState).toBe(Task.States.RUNNING);
        expect(log.state).toHaveBeenCalledWith(expect.stringContaining('перешла из running в waiting'));
    });
    
    test('should not transition to WAITING if task is not extended', () => {
        const task = new Task(2, false); // Non-extended task
        task.activate();
        task.start();
        task.wait();
    
        expect(task.state).toBe(Task.States.RUNNING);
        expect(log.state).not.toHaveBeenCalledWith(expect.stringContaining('перешла из running в waiting'));
    });
    
    test('should not transition to WAITING state if task is not extended', () => {
        const task = new Task(2, false); // Non-extended task
        task.activate();
        task.start();
        task.wait(); // Conditions not met
    
        expect(task.state).toBe(Task.States.RUNNING);
        expect(log.state).not.toHaveBeenCalledWith(expect.stringContaining('перешла из running в waiting'));
    });
    
    test('should not transition to WAITING state if task is not extended', () => {
        const task = new Task(2, false); 
        task.activate();
        task.start();
    
        log.state.mockClear();
    
        task.wait();
    
        expect(task.state).toBe(Task.States.RUNNING);
        expect(log.state).not.toHaveBeenCalledWith(
            expect.stringContaining('перешла из running в waiting')
        );
    });

    test('should transition task from WAITING to READY state', () => {
        const task = new Task(2);
        task.state = Task.States.WAITING; // Set initial state
    
        task.release();
    
        expect(task.state).toBe(Task.States.READY);
        expect(log.state).toHaveBeenCalledWith(expect.stringContaining('перешла из waiting в ready'));
    });
    
    test('should transition task from RUNNING to READY state', () => {
        const task = new Task(2);
        task.state = Task.States.RUNNING; // Set initial state
    
        task.preempt();
    
        expect(task.state).toBe(Task.States.READY);
        expect(log.state).toHaveBeenCalledWith(expect.stringContaining('перешла из running в ready'));
    });
    
    
});
