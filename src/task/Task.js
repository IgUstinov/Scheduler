const { taskLogger: log } = require('../logger/Logger.js');

class Task {
  static States = {
    SUSPENDED: 'suspended',
    READY: 'ready',
    RUNNING: 'running',
    WAITING: 'waiting',
  };

  static static_id = 1;

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

  static initReceivedTask(task) {
    return new Task(
      task.priority,
      task.isExtended,
      task.taskExecutionMs,
      task.taskCompletionMs,
      task.taskWaitingMs
    );
  }

  logState() {
    log.state(
      `Задача ${this.id} ${this.isExtended ? 'расширенная' : 'основная'} перешла из ${this.previousState} в ${this.state}.`
    );
  }

  transitToStateIf(newState, condition) {
    if (condition) {
      this.previousState = this.state;
      this.state = newState;
      this.logState();
    }
  }

  activate() {
    this.transitToStateIf(Task.States.READY, this.state === Task.States.SUSPENDED);
  }

  start() {
    this.transitToStateIf(Task.States.RUNNING, this.state === Task.States.READY);
  }

  wait() {
    this.transitToStateIf(
      Task.States.WAITING,
      this.isExtended && this.state === Task.States.RUNNING
    );
  }

  release() {
    this.transitToStateIf(Task.States.READY, this.state === Task.States.WAITING);
  }

  preempt() {
    this.transitToStateIf(Task.States.READY, this.state === Task.States.RUNNING);
  }

  terminate() {
    this.transitToStateIf(Task.States.SUSPENDED, this.state === Task.States.RUNNING);
  }
}

module.exports = Task;
