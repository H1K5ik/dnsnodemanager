# Быстрый запуск DNS Node Manager

## Данные для входа

**Логин**: `admin`  
**Пароль**: `admin123`

## Запуск приложения

### Первый запуск приложения(prod версия, оптимизированная)
```bash
cd server
npm i
node index.js
```

#### Обязательно нужна папка frontend/build, если ее нет, то
```bash
cd frontend
npm i
npm run build
cd ../server
npm i
node index.js
```
Приложение будет доступно на: http://localhost:3000

### Для запуска фронта(с быстрыми изменениями фронта)
```bash
cd server
npm install
node index.js
```
#### Во втором терминале
```bash
cd frontend
npm i
npm run start
```
Приложение будет доступно на: http://localhost:3001

