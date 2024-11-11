// index.js
const Task = require('./Task');
const Scheduler = require('./Scheduler');
const TaskGenerator = require('./TaskGenerator');

function main() {
    const scheduler = new Scheduler();

    // Генерируем несколько задач и добавляем их в планировщик
    const tasks = TaskGenerator.generateMultipleTasks(5);
    tasks.forEach(task => {
        console.log(`Создана задача с приоритетом ${task.priority} и типом ${task.isExtended ? 'расширенная' : 'основная'}`);
        task.activate();
        scheduler.addTask(task);
    });

    // Запускаем задачи в порядке приоритетов
    let task;
    while ((task = scheduler.getNextTask())) {
        task.start();
        console.log(`Задача с приоритетом ${task.priority} выполняется...`);

        // Если задача расширенная, переводим в ожидание
        if (task.isExtended) {
            task.wait();
            console.log(`Задача с приоритетом ${task.priority} ожидает события...`);
            task.release();
            console.log(`Задача с приоритетом ${task.priority} возвращена в очередь ready.`);
        }

        // Завершаем задачу
        task.terminate();
        console.log(`Задача с приоритетом ${task.priority} завершена.`);
    }

    console.log('Все задачи выполнены.');
}

main();
