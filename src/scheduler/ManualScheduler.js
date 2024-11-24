/**
 * Для тестирования планировщика при ручном добавлении задач
 */

const Scheduler = require('./Scheduler.js');
const Task = require('../task/Task.js');

const scheduler = new Scheduler(2);

const task1 = new Task(1);
const task2 = new Task(2, true);
const task3 = new Task(1, false, 700, 3000, 1500);
const task4 = new Task(1, true, 700, 3000, 1500);

scheduler.addTask(task1);
scheduler.addTask(task3);
scheduler.addTask(task4);

setTimeout(() => {
    scheduler.addTask(task2);
}, 2000);

scheduler.start();
