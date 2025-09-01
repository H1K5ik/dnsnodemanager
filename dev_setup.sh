#!/bin/bash

echo "=== DNS Node Manager - Dev Setup ==="

# Проверяем MySQL
if ! command -v mysql &> /dev/null; then
    echo "MySQL не установлен!"
    echo "Установите MySQL:"
    echo "  Fedora/RHEL: sudo dnf install mysql-server"
    echo "  Ubuntu/Debian: sudo apt install mysql-server"
    exit 1
fi

# Проверяем, запущен ли MySQL
if ! systemctl is-active --quiet mysqld && ! systemctl is-active --quiet mysql; then
    echo "MySQL не запущен. Запускаю..."
    if systemctl start mysqld 2>/dev/null; then
        echo "MySQL запущен (systemd)"
    elif systemctl start mysql 2>/dev/null; then
        echo "MySQL запущен (systemd)"
    else
        echo "Не удалось запустить MySQL. Запустите вручную:"
        echo "sudo systemctl start mysqld"
        exit 1
    fi
else
    echo "MySQL уже запущен"
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo "Неподдерживаемая версия Node.js: $(node --version)"
    echo ""
    echo "Требуется Node.js 22 для работы с современными зависимостями"
    echo "Обновите Node.js:"
    echo "Fedora/RHEL: sudo dnf update nodejs"
    echo "Или скачайте nvm..."
    exit 1
fi

echo "✅ Node.js найден: $(node --version) (v$NODE_VERSION.x)"

if [ ! -f "server/config/database.yml" ]; then
    echo " Создаю конфиг базы данных..."
    mkdir -p server/config
    cat > server/config/database.yml << EOF
# Database configuration
database:
  host: localhost
  port: 3306
  user: dnsnm_user
  password: dnsnm123
  database: dnsnodemanager
  charset: utf8mb4
  timezone: '+03:00'
  
# Connection pool settings
pool:
  min: 2
  max: 10
  acquireTimeoutMillis: 30000
  createTimeoutMillis: 30000
  destroyTimeoutMillis: 5000
  idleTimeoutMillis: 30000
  reapIntervalMillis: 1000
  createRetryIntervalMillis: 100
EOF
    echo "Конфиг создан: server/config/database.yml"
    echo "Пользователь: dnsnm_user"
    echo "Пароль: dnsnm123"

else
    echo "Конфиг базы данных найден"
fi

echo "Настраиваю MySQL пользователя..."
mysql -u root -e "CREATE USER IF NOT EXISTS 'dnsnm_user'@'localhost' IDENTIFIED BY 'dnsnm123';" 2>/dev/null
mysql -u root -e "GRANT ALL PRIVILEGES ON *.* TO 'dnsnm_user'@'localhost' WITH GRANT OPTION;" 2>/dev/null
mysql -u root -e "FLUSH PRIVILEGES;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "MySQL пользователь настроен"
else
    echo "Не удалось настроить MySQL пользователя автоматически"
    echo "Возможно, нужен пароль для root. Настройте вручную:"
    echo "mysql -u root -p"
    echo "CREATE USER 'dnsnm_user'@'localhost' IDENTIFIED BY 'dnsnm123';"
    echo "GRANT ALL PRIVILEGES ON *.* TO 'dnsnm_user'@'localhost' WITH GRANT OPTION;"
    echo "FLUSH PRIVILEGES;"
    echo "exit"
    read -p "Нажмите Enter после настройки MySQL..."
fi

echo "📦 Устанавливаю зависимости..."
npm install

if [ $? -eq 0 ]; then
    echo "Зависимости установлены"
    echo ""
    echo "Запускаю приложение..."
    echo "Логин: admin"
    echo "Пароль: admin123"
    echo "URL: http://localhost:3000"
    echo ""
    echo "Для остановки: Ctrl+C"
    echo ""
    npm run start
else
    echo "Ошибка установки зависимостей"
    exit 1
fi
