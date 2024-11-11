// Task.test.js
const Task = require('../src/Task');

test('Task state transitions', () => {
    const task = new Task(2, true);

    // Activate
    task.activate();
    expect(task.state).toBe(Task.States.READY);

    // Start
    task.start();
    expect(task.state).toBe(Task.States.RUNNING);

    // Wait (only for extended tasks)
    task.wait();
    expect(task.state).toBe(Task.States.WAITING);

    // Release
    task.release();
    expect(task.state).toBe(Task.States.READY);

    // Preempt
    task.start();
    task.preempt();
    expect(task.state).toBe(Task.States.READY);

    // Terminate
    task.start();
    task.terminate();
    expect(task.state).toBe(Task.States.SUSPENDED);
});
