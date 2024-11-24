const Task = require('../task/Task.js');
const { generatorLogger: log } = require('../logger/Logger.js');

/**
 * Генерирует задачи и отправляет их через WebSocket.
 */
class Generator {
    /** @type {Generator|null} Singleton экземпляр генератора. */
    static instance = null;

    /**
     * Возвращает Singleton экземпляр генератора.
     * @param {number} taskGenerationMs - Временной интервал (мс) между генерациями задач.
     * @returns {Generator} Экземпляр генератора.
     */
    static getInstance(taskGenerationMs) {
        if (!Generator.instance) {
            Generator.instance = new Generator(taskGenerationMs);
        }
        return Generator.instance;
    }

    /**
     * Конструктор генератора.
     * @param {number} [taskGenerationMs=3000] - Временной интервал (мс) между генерациями задач.
     * @param {number} [maxTaskExecutionMs=1000] - Максимально возможное время (мс) для периодических уведомлений о выполнении задач.
     * @param {number} [maxTaskCompletionMs=3000] - Максимально возможное время (мс) для выполнения задачи.
     * @param {number} [maxTaskWaitingMs=1500] - Максимально возможное время ожидания (мс) в случае выполнения расширенных задач.
     */
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
        this.maxTaskPriority = 4;
    }

    /**
     * Генерирует новую задачу со случайными параметрами.
     * @returns {Task} Сгенерированная задача.
     */
    taskGenerator() {
        const priority = this.getNumberFromOneTo(this.maxTaskPriority);
        const isExtended = Math.random() > 0.5;
        const taskExecutionMs = this.getNumberFromOneTo(this.maxTaskExecutionMs);
        const taskCompletionMs = this.getNumberFromOneTo(this.maxTaskCompletionMs);
        const taskWaitingMs = isExtended ? this.getNumberFromOneTo(this.maxTaskWaitingMs) : null;

        const task = new Task(
            priority,
            isExtended,
            taskExecutionMs,
            taskCompletionMs,
            taskWaitingMs
        );
        this.logMake(task);
        return task;
    }

    /**
     * Генерирует случайное целое число в диапазоне от 1 до указанного числа.
     * @param {number} number - Верхняя граница для генерации случайных чисел.
     * @returns {number} Случайное целое число.
     */
    getNumberFromOneTo(number) {
        return Math.floor(Math.random() * number);
    }

    /**
     * Логирует уровнем make (используется при создании новой задачи).
     * @param {Task} task - Задача для логирования.
     */
    logMake(task) {
        log.make(
            `Создана задача ${task.id} приоритет ${task.priority} ${task.isExtended ? 'расширенная' : 'основная'} интервал уведомлений ${task.taskExecutionMs} время выполнения ${task.taskCompletionMs} ${task.isExtended ? `время ожидания ${task.taskWaitingMs}` : ''}`
        );
    }

    /**
     * Логирует уровнем abort (используется при отменах и ошибках).
     * @param {string} message - Сообщение для логирования.
     */
    logAbort(message) {
        log.abort(message);
    }

    /**
     * Запускает процесс генерации задач и отправляет их по WebSocket-соединению.
     * @param {WebSocket} ws - Клиент WebSocket для отправки задач.
     */
    start(ws) {
        ws.send(JSON.stringify(this.taskGenerator()));
    }
}

module.exports = Generator;
