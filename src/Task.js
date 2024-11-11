// Task.js
class Task {
    static States = {
        SUSPENDED: 'suspended',
        READY: 'ready',
        RUNNING: 'running',
        WAITING: 'waiting'
    };

    constructor(priority, isExtended = false) {
        this.priority = priority;
        this.isExtended = isExtended;
        this.state = Task.States.SUSPENDED;
    }

    activate() {
        if (this.state === Task.States.SUSPENDED) this.state = Task.States.READY;
    }

    start() {
        if (this.state === Task.States.READY) this.state = Task.States.RUNNING;
    }

    wait() {
        if (this.isExtended && this.state === Task.States.RUNNING) {
            this.state = Task.States.WAITING;
        }
    }

    release() {
        if (this.state === Task.States.WAITING) this.state = Task.States.READY;
    }

    preempt() {
        if (this.state === Task.States.RUNNING) this.state = Task.States.READY;
    }

    terminate() {
        if (this.state === Task.States.RUNNING) this.state = Task.States.SUSPENDED;
    }
}

module.exports = Task;
