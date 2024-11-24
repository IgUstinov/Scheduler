const { taskLogger: log } = require('../logger/Logger.js');

/**
 * Представляет задачу в системе.
 */
class Task {
    /**
     * Enum для состояний задачи.
     * @enum {string}
     */
    static States = {
        SUSPENDED: 'suspended',
        READY: 'ready',
        RUNNING: 'running',
        WAITING: 'waiting',
    };

    /** @type {number} Статичный ID для однозначной идентификации задач. */
    static static_id = 1;

    /**
     * Creates a new Task.
     * @param {number} priority - Приоритет задачи (0 - минимальный).
     * @param {boolean} [isExtended=false] - Указывает, расширена ли задача.
     * @param {number} [taskExecutionMs=700] - Время (мс) для периодических уведомлений о выполнении задач.
     * @param {number} [taskCompletionMs=3000] - Время (мс) для выполнения задачи.
     * @param {number} [taskWaitingMs=1500] - Время ожидания (мс) в случае выполнения расширенных задач.
     */
    constructor(
        priority,
        isExtended = false,
        taskExecutionMs = 700,
        taskCompletionMs = 3000,
        taskWaitingMs = 1500
    ) {
        this.id = Task.static_id++;
        this.priority = priority;
        this.isExtended = isExtended;
        this.state = Task.States.SUSPENDED;
        this.previousState = null;

        this.taskExecutionMs = taskExecutionMs;
        this.taskCompletionMs = taskCompletionMs;
        this.taskWaitingMs = taskWaitingMs;
    }

    /**
     * Инициализирует полученную задачу.
     * @param {Object} task - Данные задачи для инициализации.
     * @returns {Task} Инициализированная задача.
     */
    static initReceivedTask(task) {
        return new Task(
            task.priority,
            task.isExtended,
            task.taskExecutionMs,
            task.taskCompletionMs,
            task.taskWaitingMs
        );
    }

    /**
     * Логирует уровнем state (используется при изменении состояния задачи).
     */
    logState() {
        log.state(
            `Задача ${this.id} ${this.isExtended ? 'расширенная' : 'основная'} перешла из ${this.previousState} в ${this.state}.`
        );
    }

    /**
     * Переводит задачу в новое состояние, если выполняется условие.
     * @param {string} newState - Новое состояние, в которое происходит переход.
     * @param {boolean} condition - Условие для перехода в новое состояние.
     */
    transitToStateIf(newState, condition) {
        if (condition) {
            this.previousState = this.state;
            this.state = newState;
            this.logState();
        }
    }

    /**
     * Активирует задачу, переводя ее в состояние READY.
     */
    activate() {
        this.transitToStateIf(Task.States.READY, this.state === Task.States.SUSPENDED);
    }

    /**
     * Запускает задачу, переводя ее в состояние RUNNING.
     */
    start() {
        this.transitToStateIf(Task.States.RUNNING, this.state === Task.States.READY);
    }

    /**
     * Переводит задачу в состояние WAITING, если она расширена и запущена.
     */
    wait() {
        this.transitToStateIf(
            Task.States.WAITING,
            this.isExtended && this.state === Task.States.RUNNING
        );
    }

    /**
     * Переводит задачу из состояния WAITING в состояние READY.
     */
    release() {
        this.transitToStateIf(Task.States.READY, this.state === Task.States.WAITING);
    }

    /**
     * Прерывает выполнение задачи, переводя ее обратно в состояние READY.
     */
    preempt() {
        this.transitToStateIf(Task.States.READY, this.state === Task.States.RUNNING);
    }

    /**
     * Завершает выполнение задачи, переводя ее в состояние SUSPENDED.
     */
    terminate() {
        this.transitToStateIf(Task.States.SUSPENDED, this.state === Task.States.RUNNING);
    }
}

module.exports = Task;
