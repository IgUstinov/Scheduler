// TaskGenerator.js
const Task = require('./Task');

class TaskGenerator {
    static generateTask(priority, isExtended = false) {
        return new Task(priority, isExtended);
    }

    static generateMultipleTasks(count, maxPriority = 3) {
        const tasks = [];
        for (let i = 0; i < count; i++) {
            const priority = Math.floor(Math.random() * (maxPriority + 1));
            const isExtended = Math.random() > 0.5;
            tasks.push(new Task(priority, isExtended));
        }
        return tasks;
    }
}

module.exports = TaskGenerator;
