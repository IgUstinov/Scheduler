// Scheduler.test.js
const Task = require('../src/Task');
const Scheduler = require('../src/Scheduler');

test('Scheduler selects tasks based on priority', () => {
    const scheduler = new Scheduler();
    const taskLow = new Task(0);
    const taskHigh = new Task(3);
    const taskMid = new Task(1);

    scheduler.addTask(taskLow);
    scheduler.addTask(taskMid);
    scheduler.addTask(taskHigh);

    expect(scheduler.getNextTask()).toBe(taskHigh);
    expect(scheduler.getNextTask()).toBe(taskMid);
    expect(scheduler.getNextTask()).toBe(taskLow);
});
