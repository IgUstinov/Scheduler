// TaskGenerator.test.js
const TaskGenerator = require('../src/TaskGenerator');
const Task = require('../src/Task');

test('TaskGenerator creates tasks with specified properties', () => {
    const task = TaskGenerator.generateTask(2, true);
    expect(task.priority).toBe(2);
    expect(task.isExtended).toBe(true);
});

test('TaskGenerator generates multiple tasks', () => {
    const tasks = TaskGenerator.generateMultipleTasks(5, 3);
    expect(tasks).toHaveLength(5);
    tasks.forEach(task => {
        expect(task.priority).toBeGreaterThanOrEqual(0);
        expect(task.priority).toBeLessThanOrEqual(3);
    });
});
