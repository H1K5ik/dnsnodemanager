const { execSync, spawn } = require('child_process');
const path = require('path');

/**
 * Менеджер Git для версионирования конфигураций DNS
 * Автоматически создает коммиты при каждом изменении конфигурации
 */
module.exports = class GitManager {
  
  constructor(configDir) {
    this.configDir = configDir;
    this.gitDir = path.join(configDir, '.git');
    this.initialized = false;
  }

  /**
   * Инициализирует Git репозиторий если он еще не инициализирован
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Проверяем, существует ли уже Git репозиторий
      const fs = require('fs');
      if (!fs.existsSync(this.gitDir)) {
        console.log('Инициализация Git репозитория...');
        this.execGitCommand(['init']);
        this.execGitCommand(['config', 'user.name', 'DNS Config Manager']);
        this.execGitCommand(['config', 'user.email', 'config-manager@dns.local']);
        
        // Создаем .gitignore для исключения временных файлов
        this.createGitIgnore();
        
        // Создаем первый коммит
        this.execGitCommand(['add', '.']);
        this.execGitCommand(['commit', '-m', 'Initial DNS configurations commit']);
        
        console.log('Git репозиторий инициализирован');
      } else {
        console.log('Git репозиторий уже существует');
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('Ошибка инициализации Git репозитория:', error);
      throw error;
    }
  }

  /**
   * Создает .gitignore файл
   */
  createGitIgnore() {
    const fs = require('fs');
    const gitignoreContent = `# Временные файлы
*.tmp
*.temp
*.log

# Системные файлы
.DS_Store
Thumbs.db

# IDE файлы
.vscode/
.idea/
*.swp
*.swo

# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Backup файлы
*.bak
*.backup
`;
    
    const gitignorePath = path.join(this.configDir, '.gitignore');
    fs.writeFileSync(gitignorePath, gitignoreContent);
  }

  /**
   * Выполняет Git команду
   * @param {Array} args - аргументы Git команды
   * @param {Object} options - опции выполнения
   */
  execGitCommand(args, options = {}) {
    const defaultOptions = {
      cwd: this.configDir,
      stdio: 'pipe',
      encoding: 'utf8',
      shell: true
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
      const result = execSync(`git ${args.join(' ')}`, finalOptions);
      return result.toString().trim();
    } catch (error) {
      console.error(`Git команда failed: git ${args.join(' ')}`);
      console.error('Error:', error.message);
      throw error;
    }
  }

  /**
   * Добавляет файлы в Git и создает коммит
   * @param {string} message - сообщение коммита
   * @param {Array} files - конкретные файлы для коммита (опционально)
   */
  async commit(message, files = null) {
    try {
      await this.initialize();
      
      // Добавляем файлы
      if (files && files.length > 0) {
        this.execGitCommand(['add', ...files]);
      } else {
        this.execGitCommand(['add', '.']);
      }
      
      // Проверяем, есть ли изменения для коммита
      const status = this.execGitCommand(['status', '--porcelain']);
      if (!status) {
        console.log('Нет изменений для коммита');
        return null;
      }
      
      // Создаем коммит
      const commitHash = this.execGitCommand(['commit', '-m', `'${message}'`]);
      console.log(`Git коммит создан: ${message}`);
      
      return {
        hash: commitHash,
        message: message,
        files: this.getChangedFiles()
      };
    } catch (error) {
      console.error('Ошибка создания Git коммита:', error);
      throw error;
    }
  }

  /**
   * Получает список измененных файлов
   */
  getChangedFiles() {
    try {
      const status = this.execGitCommand(['status', '--porcelain']);
      if (!status) return [];
      
      return status.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const status = line.substring(0, 2).trim();
          const file = line.substring(3);
          return { status, file };
        });
    } catch (error) {
      console.error('Ошибка получения списка файлов:', error);
      return [];
    }
  }

  /**
   * Получает историю коммитов
   * @param {number} limit - количество коммитов для показа
   */
  async getHistory(limit = 10) {
    try {
      await this.initialize();
      
      // Проверяем, есть ли коммиты в репозитории
      try {
        this.execGitCommand(['rev-list', '--count', 'HEAD']);
      } catch (error) {
        // Если нет коммитов, возвращаем пустой массив
        return [];
      }
      
      const log = this.execGitCommand([
        'log',
        '--oneline',
        `--pretty=format:'%H|%ad|%s'`,
        '--date=iso',
        `-${limit}`
      ]);
      
      if (!log) return [];
      
      return log.split('\n').map(line => {
        const [hash, date, message] = line.split('|');
        return { hash, date, message };
      });
    } catch (error) {
      console.error('Ошибка получения истории Git:', error);
      return [];
    }
  }

  /**
   * Получает детальную информацию о коммите
   * @param {string} hash - хеш коммита
   */
  getCommitDetails(hash) {
    try {
      const details = this.execGitCommand([
        'show',
        '--stat',
        `--pretty=format:'%H|%ad|%s|%an|%ae'`,
        '--date=iso',
        hash
      ]);
      
      if (!details) return null;
      
      const lines = details.split('\n');
      const [hashLine, ...fileLines] = lines;
      const [commitHash, date, message, author, email] = hashLine.split('|');
      
      const files = fileLines
        .filter(line => line.includes('|'))
        .map(line => {
          const parts = line.split('|');
          return {
            file: parts[0].trim(),
            changes: parts[1] ? parts[1].trim() : ''
          };
        });
      
      return {
        hash: commitHash,
        date,
        message,
        author,
        email,
        files
      };
    } catch (error) {
      console.error('Ошибка получения деталей коммита:', error);
      return null;
    }
  }

  /**
   * Откатывает изменения к определенному коммиту
   * @param {string} hash - хеш коммита для отката
   * @param {boolean} hard - жесткий откат (удаляет все изменения)
   */
  async revertToCommit(hash, hard = false) {
    try {
      await this.initialize();
      
      const command = hard ? ['reset', '--hard', hash] : ['reset', '--soft', hash];
      this.execGitCommand(command);
      
      console.log(`Откат к коммиту ${hash} ${hard ? '(жесткий)' : '(мягкий)'}`);
      
      return {
        hash,
        hard,
        message: `Откат к коммиту ${hash.substring(0, 7)}`
      };
    } catch (error) {
      console.error('Ошибка отката к коммиту:', error);
      throw error;
    }
  }

  /**
   * Создает ветку
   * @param {string} branchName - имя ветки
   */
  async createBranch(branchName) {
    try {
      await this.initialize();
      
      this.execGitCommand(['checkout', '-b', branchName]);
      console.log(`Создана ветка: ${branchName}`);
      
      return branchName;
    } catch (error) {
      console.error('Ошибка создания ветки:', error);
      throw error;
    }
  }

  /**
   * Переключается на ветку
   * @param {string} branchName - имя ветки
   */
  async switchBranch(branchName) {
    try {
      await this.initialize();
      
      this.execGitCommand(['checkout', branchName]);
      console.log(`Переключение на ветку: ${branchName}`);
      
      return branchName;
    } catch (error) {
      console.error('Ошибка переключения ветки:', error);
      throw error;
    }
  }

  /**
   * Получает список веток
   */
  getBranches() {
    try {
      const branches = this.execGitCommand(['branch', '-a']);
      if (!branches) return [];
      
      return branches.split('\n')
        .map(branch => branch.trim())
        .filter(branch => branch)
        .map(branch => ({
          name: branch.replace(/^\*/, '').trim(),
          current: branch.startsWith('*')
        }));
    } catch (error) {
      console.error('Ошибка получения списка веток:', error);
      return [];
    }
  }

  /**
   * Получает статистику репозитория
   */
  async getStats() {
    try {
      await this.initialize();
      
      let totalCommits = 0;
      try {
        const commitCount = this.execGitCommand(['rev-list', '--count', 'HEAD']);
        totalCommits = parseInt(commitCount) || 0;
      } catch (error) {
        // Если нет коммитов, totalCommits остается 0
      }
      
      const branches = this.getBranches();
      const history = await this.getHistory(1);
      const lastCommit = history[0];
      
      return {
        totalCommits: parseInt(totalCommits) || 0,
        branches: branches.length,
        currentBranch: branches.find(b => b.current)?.name || 'master',
        lastCommit: lastCommit || null
      };
    } catch (error) {
      console.error('Ошибка получения статистики Git:', error);
      return {
        totalCommits: 0,
        branches: 0,
        currentBranch: 'master',
        lastCommit: null
      };
    }
  }

  /**
   * Создает тег для коммита
   * @param {string} tagName - имя тега
   * @param {string} message - сообщение тега
   */
  async createTag(tagName, message = '') {
    try {
      await this.initialize();
      
      // Проверяем, есть ли коммиты для создания тега
      const commitCount = this.execGitCommand(['rev-list', '--count', 'HEAD']);
      if (!commitCount || parseInt(commitCount) === 0) {
        throw new Error('Cannot create tag: no commits in repository');
      }
      
      const args = ['tag', '-a', tagName];
      if (message) {
        args.push('-m', message);
      }
      
      this.execGitCommand(args);
      console.log(`Создан тег: ${tagName}`);
      
      return tagName;
    } catch (error) {
      console.error('Ошибка создания тега:', error);
      throw error;
    }
  }

  /**
   * Получает список тегов
   */
  getTags() {
    try {
      const tags = this.execGitCommand(['tag', '-l']);
      if (!tags) return [];
      
      return tags.split('\n').filter(tag => tag.trim());
    } catch (error) {
      console.error('Ошибка получения списка тегов:', error);
      return [];
    }
  }
}
