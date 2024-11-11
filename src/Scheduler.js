// Scheduler.js
const Task = require('./Task');

class Scheduler {
    constructor() {
        this.queues = Array.from({ length: 4 }, () => []);
    }

    addTask(task) {
        this.queues[task.priority].push(task);
    }

    getNextTask() {
        for (let i = this.queues.length - 1; i >= 0; i--) {
            if (this.queues[i].length > 0) {
                return this.queues[i].shift();
            }
        }
        return null;
    }
}

module.exports = Scheduler;
