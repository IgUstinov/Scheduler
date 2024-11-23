const Task = require('../task/Task.js');
const { generatorLogger: log } = require('../logger/Logger.js')

class Generator {

    static instance = null;

    static getInstance(taskGenerationMs) {
        if (!Generator.instance) {
            Generator.instance = new Generator(taskGenerationMs);
        }
        return Generator.instance;
    }

    constructor(
        taskGenerationMs = 3000, 
        maxTaskExecutionMs = 1000, 
        maxTaskCompletionMs = 3000, 
        maxTaskWaitingMs = 1500
    ) {
        this.taskGenerationMs = taskGenerationMs;

        this.maxTaskExecutionMs = maxTaskExecutionMs;
        this.maxTaskCompletionMs = maxTaskCompletionMs;
        this.maxTaskWaitingMs = maxTaskWaitingMs;

        this.maxTaskPriority = 4
    }

    taskGenerator() {
        const priority = this.getNumberFromOneTo(this.maxTaskPriority); 
        const isExtended = Math.random() > 0.5; 
        const taskExecutionMs = this.getNumberFromOneTo(this.maxTaskExecutionMs);
        const taskCompletionMs = this.getNumberFromOneTo(this.maxTaskCompletionMs);
        const taskWaitingMs = isExtended ? this.getNumberFromOneTo(this.maxTaskWaitingMs) : null;
        const task = new Task(priority, isExtended, taskExecutionMs, taskCompletionMs, taskWaitingMs);

        this.logMake(task);
        return task;
    }

    getNumberFromOneTo(number) {
        return Math.floor(Math.random() * number);
    }

    logMake(task) {
        log.make(
            `Создана задача ${task.id} приоритет ${task.priority} ${this.isExtended ? 'расширенная' : 'основная'} интервал уведомлений ${task.taskExecutionMs} время выполнения ${task.taskCompletionMs} ${this.isExtended ? `время ожидания ${task.taskWaitingMs}` : ''}`
        );
    }

    logAbort(message) {
        log.abort(message);
    }

    start(ws) {
        ws.send(JSON.stringify(this.taskGenerator())); 
    }
}

module.exports = Generator;