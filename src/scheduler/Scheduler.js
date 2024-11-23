const Task = require('../task/Task.js');
const { scheduleLogger: log } = require('../logger/Logger.js')

class Scheduler {

    static instance = null;

    static getInstance(readyQueueLimit, scheduleExecutionMs) {
        if (!Scheduler.instance) {
            Scheduler.instance = new Scheduler(readyQueueLimit, scheduleExecutionMs);
        }
        return Scheduler.instance;
    }

    constructor(readyQueueLimit = 5, scheduleExecutionMs = 500) {
        this.priorityLevels = 4
        this.highestPriority = this.priorityLevels - 1;

        this.queues = {
            suspended: this.initQueues(),
            waiting: this.initQueues(),
            ready: this.initQueues()
        };
        
        this.runningTask = null; 
        this.taskExecutionInterval = null;
        this.taskCompletionTimeout = null;

        this.readyQueueLimit = readyQueueLimit > 0 ? readyQueueLimit : 5;
        this.scheduleExecutionMs = scheduleExecutionMs > 0 ? scheduleExecutionMs : 500;
    }    

    initQueues() {
        return Array.from({ length: this.priorityLevels }, () => []);
    }

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

    isReadyQueueFull(priority) {
        if (priority < 0 || priority >= this.priorityLevels) {
            return false; 
        }
        return this.queues.ready[priority].length >= this.readyQueueLimit;
    }

    logAdd(message) {
        log.add(message);
    }

    logEmpty(message) {
        log.empty(message);
    }

    logAbort(message) {
        log.abort(message);
    }

    logExec(message) {
        log.exec(message);
    }

    logEvent(message) {
        log.event(message);
    }

    enqueueToSuspended(task) {
        this.logAbort(`Очередь ${task.priority} заполнена`);
        this.logAdd(`Задача ${task.id} добавлена в очередь ожидания ${task.priority}.`);
        this.queues.suspended[task.priority].push(task);
    }

    enqueueToReady(task) {
        this.logAdd(`Задача ${task.id} добавлена в очередь готовности ${task.priority}.`);
        task.activate();
        this.queues.ready[task.priority].push(task);
    }

    scheduleExecution() {
        if (this.runningTask) {
            this.executeRunningTask();
        } else if (this.findHighestPriorityQueue()) {
            this.executeNextTask();
        } else {
            this.logEmpty(`Нет задач для выполнения`);
        }
    }

    executeRunningTask() {
        this.handlePreemption();
        this.executeTask();
    }

    executeNextTask() {
        const nextTask = this.getHighestPriorityTask();
        this.setTaskAsRunning(nextTask);
        this.executeTask();
    }

    handlePreemption() {
        const nextTask = this.getHighestPriorityTask();

        if (nextTask) {
            !this.runningTask || nextTask.priority > this.runningTask.priority 
            ? this.preemptRunningTask(nextTask)
            : this.unshiftToReady(nextTask);
        }
    }

    unshiftToReady(nextTask) {
        this.queues.ready[nextTask.priority].unshift(nextTask);
    }

    preemptRunningTask(nextTask) {
        if (this.runningTask) {
            this.logAbort(
                `Задача ${nextTask.id} с приоритетом ${nextTask.priority} прерывает задачу ${this.runningTask.id} с приоритетом ${this.runningTask.priority}.`
            );
        }
        this.stopRunningTask();
        this.setTaskAsRunning(nextTask);
    }

    stopRunningTask() {
        if (this.runningTask) {
            this.runningTask.preempt();
            this.unshiftToReady(this.runningTask);
            this.clearProcessing();
        }
    }

    clearProcessing() {
        this.clearTimers();
        this.runningTask = null;
    }

    clearTimers() {
        clearInterval(this.taskExecutionInterval);
        clearTimeout(this.taskCompletionTimeout);
        this.taskExecutionInterval = null;
        this.taskCompletionTimeout = null;
    }

    setTaskAsRunning(nextTask) {
        this.runningTask = nextTask;
    }

    executeTask() {
        if (!this.runningTask) return;
        this.runningTask.start();
        this.initializeTimers();
    }

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

    initializeInterval()  {
        this.taskExecutionInterval = setInterval(() => {
            this.logExec(`Задача ${this.runningTask.id} выполняется...`);
        }, this.runningTask.taskExecutionMs);
    }
    
    initializeTimeout() {
        this.runningTask.isExtended && Math.random() > 0.4
        ? this.initializeWaitingTimeout()
        : this.initializeCompletionTimeout();
    }

    initializeCompletionTimeout() {
        this.taskCompletionTimeout = setTimeout(() => {
            if (this.runningTask) {
                this.terminateRunningTask();
            }
            this.clearProcessing();
        }, this.runningTask.taskCompletionMs);
    }

    terminateRunningTask() {
        this.logExec(`Задача ${this.runningTask.id} выполнена`);
        this.runningTask.terminate();
        this.runningTask = null;
    }

    initializeWaitingTimeout() {
        const waitingTask = this.getRunningTaskAsWaiting();
        setTimeout(() => {
            this.releaseTask(waitingTask);
        }, waitingTask.taskWaitingMs);
    }

    getRunningTaskAsWaiting() {
        const waitingTask = this.runningTask
        this.clearProcessing();

        this.logEvent(`Задача ${waitingTask.id} ожидает события`);
        this.enqueueToWaiting(waitingTask);
        return waitingTask;
    }

    enqueueToWaiting(task) {
        task.wait();
        this.queues.waiting[task.priority].push(task);
    }

    releaseTask(waitingTask) {
        this.logEvent(`Событие для задачи ${waitingTask.id} произошло`);
        waitingTask.release();
        this.shiftQueue(this.queues.waiting[waitingTask.priority]);
        this.enqueueToReady(waitingTask);
    }

    shiftQueue(queue) {
        return queue.shift();
    }

    findHighestPriorityQueue() {
        return this.queues.ready.findLast(queue => queue.length > 0);
    }

    getHighestPriorityTask() {
        const highestPriorityQueue = this.findHighestPriorityQueue();
        if (highestPriorityQueue) {
            const highestPriorityTask = this.shiftQueue(highestPriorityQueue);
            this.evaluateMoveSuspendToReady(highestPriorityTask);
            return highestPriorityTask;
        }
    }

    evaluateMoveSuspendToReady(shiftedTask) {
        const shiftedTaskPriority = shiftedTask.priority;
        if (this.isEnoughSpaceForSuspendTask(shiftedTaskPriority)) {
            this.enqueueSuspendToReady(shiftedTaskPriority);
        }
    }

    isEnoughSpaceForSuspendTask(shiftedTaskPriority) {
        return this.queues.waiting[shiftedTaskPriority] && this.queues.waiting[shiftedTaskPriority].length == 0 
                && this.queues.ready[shiftedTaskPriority].length + 1 < this.readyQueueLimit
                && (this.runningTask == null || this.runningTask.priority != shiftedTaskPriority);
    }

    enqueueSuspendToReady(shiftedTaskPriority) {
        const suspendedTask = this.shiftQueue(this.queues.suspended[shiftedTaskPriority]);
        if (suspendedTask) {
            this.enqueueToReady(suspendedTask);
        }
    }

    start() {
        setInterval(() => this.scheduleExecution(), this.scheduleExecutionMs);
    }
}

module.exports = Scheduler;