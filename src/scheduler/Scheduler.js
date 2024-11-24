const { scheduleLogger: log } = require('../logger/Logger.js');

/**
 * Класс для управления задачами.
 */
class Scheduler {
    /** @type {Scheduler|null} Singleton экземпляр планировщика. */
    static instance = null;

    /**
     * Получение Singleton экземпляра планировщика.
     * @param {number} readyQueueLimit - Лимит задач в очереди READY.
     * @param {number} scheduleExecutionMs - Временной интервал (мс) между выполнением планировщика.
     * @returns {Scheduler} Экземпляр планировщика.
     */
    static getInstance(readyQueueLimit, scheduleExecutionMs) {
        if (!Scheduler.instance) {
            Scheduler.instance = new Scheduler(readyQueueLimit, scheduleExecutionMs);
        }
        return Scheduler.instance;
    }

    /**
     * Конструктор планировщика.
     * @param {number} [readyQueueLimit=5] - Лимит задач в очереди READY.
     * @param {number} [scheduleExecutionMs=500] - Временной интервал (мс) между выполнением планировщика.
     */
    constructor(readyQueueLimit = 5, scheduleExecutionMs = 500) {
        this.priorityLevels = 4;
        this.highestPriority = this.priorityLevels - 1;

        this.queues = {
            suspended: this.initQueues(),
            waiting: this.initQueues(),
            ready: this.initQueues(),
        };

        this.runningTask = null;
        this.taskExecutionInterval = null;
        this.taskCompletionTimeout = null;

        this.readyQueueLimit = readyQueueLimit > 0 ? readyQueueLimit : 5;
        this.scheduleExecutionMs = scheduleExecutionMs > 0 ? scheduleExecutionMs : 500;
    }

    /**
     * Инициализация очередей для каждого уровня приоритета.
     * @returns {Array<Array>} Массив очередей задач по приоритетам.
     */
    initQueues() {
        return Array.from({ length: this.priorityLevels }, () => []);
    }

    /**
     * Добавляет задачу в планировщик.
     * @param {Object} task - Задача для добавления.
     */
    addTask(task) {
        if (task.priority < 0 || task.priority >= this.priorityLevels || isNaN(task.priority)) {
            log.abort(`Задача ${task.id} имеет недопустимый приоритет ${task.priority}`);
            return;
        }

        if (this.isReadyQueueFull(task.priority)) {
            this.enqueueToSuspended(task);
        } else {
            this.enqueueToReady(task);
        }
    }

    /**
     * Проверяет, заполнена ли очередь READY для заданного приоритета.
     * @param {number} priority - Приоритет очереди.
     * @returns {boolean} True, если очередь заполнена.
     */
    isReadyQueueFull(priority) {
        if (priority < 0 || priority >= this.priorityLevels) {
            return false;
        }
        return this.queues.ready[priority].length >= this.readyQueueLimit;
    }

    /**
     * Логирует уровнем add (используется при добавлении задачи).
     * @param {string} message - Сообщение для логирования.
     */
    logAdd(message) {
        log.add(message);
    }

    /**
     * Логирует уровнем empty (используется при отсутствии задачи).
     * @param {string} message - Сообщение для логирования.
     */
    logEmpty(message) {
        log.empty(message);
    }

    /**
     * Логирует уровнем abort (используется отменах и ошибках).
     * @param {string} message - Сообщение для логирования.
     */
    logAbort(message) {
        log.abort(message);
    }

    /**
     * Логирует уровнем exec (используется при выполнении задачи).
     * @param {string} message - Сообщение для логирования.
     */
    logExec(message) {
        log.exec(message);
    }

    /**
     * Логирует уровнем event (используется при возникновении событий).
     * @param {string} message - Сообщение для логирования.
     */
    logEvent(message) {
        log.event(message);
    }

    /**
     * Добавляет задачу в очередь SUSPENDED.
     * @param {Object} task - Задача.
     */
    enqueueToSuspended(task) {
        this.logAbort(`Очередь ${task.priority} заполнена`);
        this.logAdd(`Задача ${task.id} добавлена в очередь ожидания ${task.priority}.`);
        this.queues.suspended[task.priority].push(task);
    }

    /**
     * Добавляет задачу в очередь READY.
     * @param {Object} task - Задача.
     */
    enqueueToReady(task) {
        this.logAdd(`Задача ${task.id} добавлена в очередь готовности ${task.priority}.`);
        task.activate();
        this.queues.ready[task.priority].push(task);
    }

    /**
     * Планирует выполнение задач.
     */
    scheduleExecution() {
        if (this.runningTask) {
            this.executeRunningTask();
        } else if (this.findHighestPriorityQueue()) {
            this.executeNextTask();
        } else {
            this.logEmpty(`Нет задач для выполнения`);
        }
    }

    /**
     * Выполняет текущую задачу.
     */
    executeRunningTask() {
        this.handlePreemption();
        this.executeTask();
    }

    /**
     * Выбирает и выполняет следующую задачу.
     */
    executeNextTask() {
        const nextTask = this.getHighestPriorityTask();
        this.setTaskAsRunning(nextTask);
        this.executeTask();
    }

    /**
     * Обрабатывает прерывание задачи.
     */
    handlePreemption() {
        const nextTask = this.getHighestPriorityTask();

        if (nextTask) {
            !this.runningTask || nextTask.priority > this.runningTask.priority
                ? this.preemptRunningTask(nextTask)
                : this.unshiftToReady(nextTask);
        }
    }

    /**
     * Перемещает задачу в начало очереди READY.
     * @param {Object} nextTask - Задача.
     */
    unshiftToReady(nextTask) {
        this.queues.ready[nextTask.priority].unshift(nextTask);
    }

    /**
     * Прерывает выполнение текущей задачи.
     * @param {Object} nextTask - Следующая задача.
     */
    preemptRunningTask(nextTask) {
        if (this.runningTask) {
            this.logAbort(
                `Задача ${nextTask.id} с приоритетом ${nextTask.priority} прерывает задачу ${this.runningTask.id} с приоритетом ${this.runningTask.priority}.`
            );
        }
        this.stopRunningTask();
        this.setTaskAsRunning(nextTask);
    }

    /**
     * Останавливает выполнение текущей задачи.
     */
    stopRunningTask() {
        if (this.runningTask) {
            this.runningTask.preempt();
            this.unshiftToReady(this.runningTask);
            this.clearProcessing();
        }
    }

    /**
     * Очищает текущие обработчики задач.
     */
    clearProcessing() {
        this.clearTimers();
        this.runningTask = null;
    }

    /**
     * Очищает все таймеры текущей задачи.
     */
    clearTimers() {
        clearInterval(this.taskExecutionInterval);
        clearTimeout(this.taskCompletionTimeout);
        this.taskExecutionInterval = null;
        this.taskCompletionTimeout = null;
    }

    /**
     * Устанавливает задачу как выполняемую.
     * @param {Object} nextTask - Задача.
     */
    setTaskAsRunning(nextTask) {
        this.runningTask = nextTask;
    }

    /**
     * Выполняет текущую задачу.
     */
    executeTask() {
        if (!this.runningTask) return;
        this.runningTask.start();
        this.initializeTimers();
    }

    /**
     * Инициализирует таймеры для текущей задачи.
     */
    initializeTimers() {
        if (!this.runningTask) return;
        if (!this.taskExecutionInterval) {
            this.logExec(
                `Задача ${this.runningTask.id} с приоритетом ${this.runningTask.priority} начала выполнение.`
            );
            this.initializeInterval();
        }

        if (!this.taskCompletionTimeout) {
            this.initializeTimeout();
        }
    }

    /**
     * Инициализирует интервал выполнения задачи.
     */
    initializeInterval() {
        this.taskExecutionInterval = setInterval(() => {
            this.logExec(`Задача ${this.runningTask.id} выполняется...`);
        }, this.runningTask.taskExecutionMs);
    }

    /**
     * Инициализирует таймер завершения или ожидания задачи.
     */
    initializeTimeout() {
        this.runningTask.isExtended && Math.random() > 0.4
            ? this.initializeWaitingTimeout()
            : this.initializeCompletionTimeout();
    }

    /**
     * Устанавливает таймер для завершения выполнения задачи.
     * По истечении таймера задача завершается, и обработка очищается.
     */
    initializeCompletionTimeout() {
        this.taskCompletionTimeout = setTimeout(() => {
            if (this.runningTask) {
                this.terminateRunningTask();
            }
            this.clearProcessing();
        }, this.runningTask.taskCompletionMs);
    }

    /**
     * Завершает выполнение текущей задачи.
     * Логирует завершение задачи.
     */
    terminateRunningTask() {
        this.logExec(`Задача ${this.runningTask.id} выполнена`);
        this.runningTask.terminate();
        this.runningTask = null;
    }

    /**
     * Устанавливает таймер ожидания для выполняемой задачи.
     * По истечении таймера задача перемещается в очередь READY.
     */
    initializeWaitingTimeout() {
        const waitingTask = this.getRunningTaskAsWaiting();
        setTimeout(() => {
            this.releaseTask(waitingTask);
        }, waitingTask.taskWaitingMs);
    }

    /**
     * Перемещает выполняемую задачу в состояние ожидания.
     * @returns {Object} Задача, переведённая в состояние ожидания.
     */
    getRunningTaskAsWaiting() {
        const waitingTask = this.runningTask;
        this.clearProcessing();

        this.logEvent(`Задача ${waitingTask.id} ожидает события`);
        this.enqueueToWaiting(waitingTask);
        return waitingTask;
    }

    /**
     * Добавляет задачу в очередь WAITING.
     * @param {Object} task - Задача для добавления в очередь WAITING.
     */
    enqueueToWaiting(task) {
        task.wait();
        this.queues.waiting[task.priority].push(task);
    }

    /**
     * Переводит задачу из состояния ожидания в состояние готовности.
     * @param {Object} waitingTask - Задача, завершившая ожидание.
     */
    releaseTask(waitingTask) {
        this.logEvent(`Событие для задачи ${waitingTask.id} произошло`);
        waitingTask.release();
        this.shiftQueue(this.queues.waiting[waitingTask.priority]);
        this.enqueueToReady(waitingTask);
    }

    /**
     * Получает задачу из начала очереди.
     * @param {Array} queue - Очередь задач.
     * @returns {Object} Удалённая задача.
     */
    shiftQueue(queue) {
        return queue.shift();
    }

    /**
     * Находит очередь с наивысшим приоритетом, содержащую задачи.
     * @returns {Array|null} Очередь задач или null, если все очереди пусты.
     */
    findHighestPriorityQueue() {
        return this.queues.ready.findLast((queue) => queue.length > 0);
    }

    /**
     * Получает задачу с наивысшим приоритетом для выполнения.
     * @returns {Object|null} Задача с наивысшим приоритетом или null, если задачи отсутствуют.
     */
    getHighestPriorityTask() {
        const highestPriorityQueue = this.findHighestPriorityQueue();
        if (highestPriorityQueue) {
            const highestPriorityTask = this.shiftQueue(highestPriorityQueue);
            this.evaluateMoveSuspendToReady(highestPriorityTask);
            return highestPriorityTask;
        }
    }

    /**
     * Оценивает возможность перемещения задачи из очереди WAITING в READY.
     * @param {Object} shiftedTask - Задача, перемещённая из очереди.
     */
    evaluateMoveSuspendToReady(shiftedTask) {
        const shiftedTaskPriority = shiftedTask.priority;
        if (this.isEnoughSpaceForSuspendTask(shiftedTaskPriority)) {
            this.enqueueSuspendToReady(shiftedTaskPriority);
        }
    }

    /**
     * Проверяет, достаточно ли места для перемещения задач из очереди WAITING в READY.
     * @param {number} shiftedTaskPriority - Приоритет задачи.
     * @returns {boolean} True, если достаточно места.
     */
    isEnoughSpaceForSuspendTask(shiftedTaskPriority) {
        return (
            this.queues.waiting[shiftedTaskPriority] &&
            this.queues.waiting[shiftedTaskPriority].length == 0 &&
            this.queues.ready[shiftedTaskPriority].length + 1 < this.readyQueueLimit &&
            (this.runningTask == null || this.runningTask.priority != shiftedTaskPriority)
        );
    }

    /**
     * Перемещает задачу из очереди WAITING в READY.
     * @param {number} shiftedTaskPriority - Приоритет задачи.
     */
    enqueueSuspendToReady(shiftedTaskPriority) {
        const suspendedTask = this.shiftQueue(this.queues.suspended[shiftedTaskPriority]);
        if (suspendedTask) {
            this.enqueueToReady(suspendedTask);
        }
    }

    /**
     * Запускает выполнение планировщика.
     * Выполнение происходит через определённые интервалы.
     */
    start() {
        setInterval(() => this.scheduleExecution(), this.scheduleExecutionMs);
    }
}

module.exports = Scheduler;
