/**
 * @file Logger.js
 * @description Определяет пользовательские логгеры для различных компонентов системы.
 */

const { createLogger, transports, format, addColors } = require('winston');

const logConfigs = {
    levels: {
        abort: 0,
        exec: 1,
        event: 2,
        add: 3,
        state: 4,
        empty: 5,
        make: 6,
    },
    colors: {
        abort: 'red',
        exec: 'green',
        event: 'magenta',
        add: 'yellow',
        state: 'cyan',
        empty: 'gray',
        make: 'black',
    },
};

/**
 * Создает форматтер логов для указанного компонента.
 * @param {string} name Название компонента.
 * @returns {Function} Функция форматирования логов.
 */
const createLogFormatter = (name) => {
    return ({ timestamp, level, message }) => {
        return `${timestamp} [${name}]\t[${level}]\t${message}`;
    };
};

/**
 * Создает пользовательский логгер с уникальными уровнями и цветами.
 * @param {string} name Название компонента.
 * @returns {object} Настроенный логгер.
 */
const createCustomLogger = (name) => {
    addColors(logConfigs.colors);

    return createLogger({
        levels: logConfigs.levels,
        level: 'make',
        format: format.combine(
            format.colorize(),
            format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            format.printf(createLogFormatter(name))
        ),
        transports: [
            new transports.Console(),
            new transports.File({
                filename: `./logs/${name.toLowerCase()}.log`,
                format: format.uncolorize(),
            }),
            new transports.File({
                filename: `./logs/app.log`,
                format: format.uncolorize(),
            }),
        ],
    });
};

const scheduleLogger = createCustomLogger('Schedule');
const taskLogger = createCustomLogger('Task');
const generatorLogger = createCustomLogger('Generator');

module.exports = {
    scheduleLogger,
    taskLogger,
    generatorLogger,
    createLogFormatter,
};
