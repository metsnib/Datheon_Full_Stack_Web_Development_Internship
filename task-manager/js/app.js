/**
 * Metsni Task Manager & Productivity Tracker
 * Pure Vanilla JavaScript (ES6+) with Zero External Dependencies
 * Full CRUD, Instant localStorage Persistence, Interactive UI
 */

(function () {
  'use strict';

  /* ==========================================================================
     Storage Keys & Default Data
     ========================================================================== */
  const STORAGE_KEYS = {
    TASKS: 'zenith_tasks_data_v1',
    CATEGORIES: 'Metsni_categories_data_v1',
    THEME: 'Metsni_theme_v1',
    SOUND: 'Metsni_sound_v1'
  };

  const DEFAULT_CATEGORIES = [
    { name: 'Work', icon: '💼' },
    { name: 'Personal', icon: '🏡' },
    { name: 'Study', icon: '📚' },
    { name: 'Health', icon: '🏃' },
    { name: 'Finance', icon: '💰' }
  ];

  const SAMPLE_TASKS = [
    {
      id: 'task_1',
      title: 'Complete System Architecture Review',
      description: 'Review performance benchmarks, clean client state caching, and responsive layouts.',
      category: 'Work',
      priority: 'High',
      dueDate: getRelativeDate(1), // Tomorrow
      completed: false,
      createdAt: Date.now() - 3600000 * 5,
      order: 0
    },
    {
      id: 'task_2',
      title: 'Read Modern JavaScript & Web APIs Chapter 4',
      description: 'Focus on native DOM manipulation, Custom Events, and Web Audio API synthesis.',
      category: 'Study',
      priority: 'Medium',
      dueDate: getRelativeDate(3),
      completed: false,
      createdAt: Date.now() - 3600000 * 3,
      order: 1
    },
    {
      id: 'task_3',
      title: '30-minute Cardio and Core Workout',
      description: 'Daily fitness routine to maintain physical and mental sharpness.',
      category: 'Health',
      priority: 'Low',
      dueDate: getRelativeDate(0), // Today
      completed: true,
      createdAt: Date.now() - 3600000 * 12,
      order: 2
    },
    {
      id: 'task_4',
      title: 'Submit Monthly Expense Reimbursements',
      description: 'Compile digital receipts and log expenses into the accounting portal.',
      category: 'Finance',
      priority: 'High',
      dueDate: getRelativeDate(-1), // Overdue
      completed: false,
      createdAt: Date.now() - 3600000 * 28,
      order: 3
    }
  ];

  function getRelativeDate(daysOffset) {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().split('T')[0];
  }

  /* ==========================================================================
     Application State
     ========================================================================== */
  class TaskState {
    constructor() {
      this.tasks = this.loadTasks();
      this.categories = this.loadCategories();
      this.currentFilter = 'all'; // 'all', 'active', 'completed', 'overdue'
      this.currentCategory = 'ALL';
      this.searchQuery = '';
      this.currentSort = 'custom';
      this.soundEnabled = localStorage.getItem(STORAGE_KEYS.SOUND) !== 'false';
      this.recentlyDeleted = null;
      this.undoTimer = null;
    }

    loadTasks() {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.TASKS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (err) {
        console.error('Error loading tasks from localStorage:', err);
      }
      // First-time visit: return sample data
      return [...SAMPLE_TASKS];
    }

    saveTasks() {
      try {
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(this.tasks));
      } catch (err) {
        console.error('Error saving tasks to localStorage:', err);
      }
    }

    loadCategories() {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length) return parsed;
        }
      } catch (err) {
        console.error('Error loading categories:', err);
      }
      return [...DEFAULT_CATEGORIES];
    }

    saveCategories() {
      try {
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
      } catch (err) {
        console.error('Error saving categories:', err);
      }
    }

    /* CRUD Operations */

    // C: Create
    addTask(taskData) {
      const newTask = {
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        title: taskData.title.trim(),
        description: (taskData.description || '').trim(),
        category: taskData.category || 'Personal',
        priority: taskData.priority || 'Medium',
        dueDate: taskData.dueDate || '',
        completed: false,
        createdAt: Date.now(),
        order: this.tasks.length
      };

      this.tasks.unshift(newTask);
      // Re-index orders
      this.reindexOrders();
      this.saveTasks();
      return newTask;
    }

    // R: Read (Filter & Sort)
    getFilteredTasks() {
      const today = new Date().toISOString().split('T')[0];

      return this.tasks
        .filter(task => {
          // Status Filter
          if (this.currentFilter === 'active' && task.completed) return false;
          if (this.currentFilter === 'completed' && !task.completed) return false;
          if (this.currentFilter === 'overdue') {
            if (task.completed || !task.dueDate || task.dueDate >= today) return false;
          }

          // Category Filter
          if (this.currentCategory !== 'ALL' && task.category !== this.currentCategory) {
            return false;
          }

          // Search Filter
          if (this.searchQuery.trim() !== '') {
            const query = this.searchQuery.toLowerCase().trim();
            const matchesTitle = task.title.toLowerCase().includes(query);
            const matchesDesc = task.description.toLowerCase().includes(query);
            const matchesCat = task.category.toLowerCase().includes(query);
            if (!matchesTitle && !matchesDesc && !matchesCat) return false;
          }

          return true;
        })
        .sort((a, b) => {
          switch (this.currentSort) {
            case 'due-asc':
              if (!a.dueDate) return 1;
              if (!b.dueDate) return -1;
              return a.dueDate.localeCompare(b.dueDate);
            case 'due-desc':
              if (!a.dueDate) return 1;
              if (!b.dueDate) return -1;
              return b.dueDate.localeCompare(a.dueDate);
            case 'priority-desc': {
              const weights = { High: 3, Medium: 2, Low: 1 };
              return (weights[b.priority] || 0) - (weights[a.priority] || 0);
            }
            case 'title-asc':
              return a.title.localeCompare(b.title);
            case 'created-desc':
              return b.createdAt - a.createdAt;
            case 'custom':
            default:
              return a.order - b.order;
          }
        });
    }

    // U: Update
    updateTask(id, updates) {
      const index = this.tasks.findIndex(t => t.id === id);
      if (index === -1) return null;

      this.tasks[index] = {
        ...this.tasks[index],
        ...updates
      };
      this.saveTasks();
      return this.tasks[index];
    }

    toggleTaskCompletion(id) {
      const task = this.tasks.find(t => t.id === id);
      if (task) {
        task.completed = !task.completed;
        this.saveTasks();
      }
      return task;
    }

    // D: Delete
    deleteTask(id) {
      const index = this.tasks.findIndex(t => t.id === id);
      if (index !== -1) {
        const removed = this.tasks.splice(index, 1)[0];
        this.reindexOrders();
        this.saveTasks();
        this.recentlyDeleted = { task: removed, index };
        return removed;
      }
      return null;
    }

    undoDelete() {
      if (this.recentlyDeleted) {
        const { task, index } = this.recentlyDeleted;
        this.tasks.splice(index, 0, task);
        this.reindexOrders();
        this.saveTasks();
        this.recentlyDeleted = null;
        return task;
      }
      return null;
    }

    clearCompleted() {
      const initialCount = this.tasks.length;
      this.tasks = this.tasks.filter(t => !t.completed);
      this.reindexOrders();
      this.saveTasks();
      return initialCount - this.tasks.length;
    }

    clearAll() {
      this.tasks = [];
      this.saveTasks();
    }

    reorderTasks(draggedId, targetId) {
      const fromIndex = this.tasks.findIndex(t => t.id === draggedId);
      const toIndex = this.tasks.findIndex(t => t.id === targetId);

      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        const [movedTask] = this.tasks.splice(fromIndex, 1);
        this.tasks.splice(toIndex, 0, movedTask);
        this.reindexOrders();
        this.saveTasks();
        return true;
      }
      return false;
    }

    reindexOrders() {
      this.tasks.forEach((t, i) => {
        t.order = i;
      });
    }

    addCategory(name, icon) {
      const trimmed = name.trim();
      if (!trimmed) return null;
      if (this.categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
        return null;
      }
      const newCat = { name: trimmed, icon: icon || '🏷️' };
      this.categories.push(newCat);
      this.saveCategories();
      return newCat;
    }

    getStats() {
      const total = this.tasks.length;
      const completed = this.tasks.filter(t => t.completed).length;
      const active = total - completed;
      const today = new Date().toISOString().split('T')[0];
      const overdue = this.tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today).length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { total, active, completed, overdue, rate };
    }
  }

  /* ==========================================================================
     Audio Synthesis Feedback (Zero External Files)
     ========================================================================== */
  class SoundFeedback {
    constructor() {
      this.ctx = null;
    }

    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
      }
    }

    playComplete() {
      try {
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.12); // A5

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
      } catch (e) {
        // AudioContext policy suppression fallback
      }
    }

    playDelete() {
      try {
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.15);

        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.15);
      } catch (e) {
        // Ignored
      }
    }
  }

  /* ==========================================================================
     Canvas Celebration Confetti (Self-Contained)
     ========================================================================== */
  class ConfettiEffect {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
      this.particles = [];
      this.animationFrame = null;
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }

    resize() {
      if (this.canvas) {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
      }
    }

    burst(x = window.innerWidth / 2, y = window.innerHeight / 3, count = 45) {
      if (!this.canvas || !this.ctx) return;
      const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#a855f7'];

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 3;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 4,
          size: Math.random() * 7 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 12,
          gravity: 0.28,
          alpha: 1,
          decay: Math.random() * 0.015 + 0.012
        });
      }

      if (!this.animationFrame) {
        this.render();
      }
    }

    render() {
      if (!this.ctx || !this.canvas) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.rotationSpeed;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
          continue;
        }

        this.ctx.save();
        this.ctx.globalAlpha = p.alpha;
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        this.ctx.restore();
      }

      if (this.particles.length > 0) {
        this.animationFrame = requestAnimationFrame(() => this.render());
      } else {
        this.animationFrame = null;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }

  /* ==========================================================================
     UI Controller / View Layer
     ========================================================================== */
  class TaskApp {
    constructor() {
      this.state = new TaskState();
      this.sound = new SoundFeedback();
      this.confetti = new ConfettiEffect('confetti-canvas');

      this.cacheDOMElements();
      this.initTheme();
      this.initSoundToggle();
      this.renderCategoryOptions();
      this.bindEvents();
      this.render();
    }

    cacheDOMElements() {
      // Metrics & progress
      this.statTotal = document.getElementById('stat-total');
      this.statActive = document.getElementById('stat-active');
      this.statCompleted = document.getElementById('stat-completed');
      this.statOverdue = document.getElementById('stat-overdue');
      this.progressFill = document.getElementById('progress-fill');
      this.progressPercentLabel = document.getElementById('progress-percent-label');
      this.progressBarAria = document.getElementById('progress-bar-aria');
      this.badgeScore = document.getElementById('badge-score');

      // Create Form
      this.taskForm = document.getElementById('task-form');
      this.titleInput = document.getElementById('task-title-input');
      this.categorySelect = document.getElementById('task-category-select');
      this.prioritySelect = document.getElementById('task-priority-select');
      this.dueDateInput = document.getElementById('task-due-date-input');
      this.descInput = document.getElementById('task-desc-input');

      // Filter & Search Controls
      this.searchInput = document.getElementById('search-input');
      this.clearSearchBtn = document.getElementById('clear-search-btn');
      this.filterCategorySelect = document.getElementById('filter-category-select');
      this.sortSelect = document.getElementById('sort-select');
      this.statusTabs = document.querySelectorAll('.tab-btn');
      this.countAll = document.getElementById('count-all');
      this.countActive = document.getElementById('count-active');
      this.countCompleted = document.getElementById('count-completed');
      this.countOverdue = document.getElementById('count-overdue');
      this.clearCompletedBtn = document.getElementById('clear-completed-btn');

      // Task List & Empty State
      this.taskList = document.getElementById('task-list');
      this.emptyState = document.getElementById('empty-state');
      this.emptyTitle = document.getElementById('empty-title');
      this.emptyDesc = document.getElementById('empty-desc');

      // Edit Modal
      this.editModal = document.getElementById('edit-modal-overlay');
      this.editForm = document.getElementById('edit-task-form');
      this.editIdInput = document.getElementById('edit-task-id');
      this.editTitleInput = document.getElementById('edit-title-input');
      this.editCategorySelect = document.getElementById('edit-category-select');
      this.editPrioritySelect = document.getElementById('edit-priority-select');
      this.editDueDateInput = document.getElementById('edit-due-date-input');
      this.editDescInput = document.getElementById('edit-desc-input');
      this.editCompletedInput = document.getElementById('edit-completed-input');
      this.closeModalBtn = document.getElementById('close-modal-btn');
      this.cancelEditBtn = document.getElementById('cancel-edit-btn');

      // Custom Category Modal
      this.categoryModal = document.getElementById('category-modal-overlay');
      this.addCategoryBtn = document.getElementById('add-category-btn');
      this.customCategoryForm = document.getElementById('custom-category-form');
      this.customCatInput = document.getElementById('custom-cat-input');
      this.customCatEmoji = document.getElementById('custom-cat-emoji');
      this.closeCatModalBtn = document.getElementById('close-cat-modal-btn');
      this.cancelCatBtn = document.getElementById('cancel-cat-btn');

      // Header Actions & Options
      this.themeToggleBtn = document.getElementById('theme-toggle-btn');
      this.themeMoonIcon = document.getElementById('theme-moon-icon');
      this.themeSunIcon = document.getElementById('theme-sun-icon');
      this.soundToggleBtn = document.getElementById('sound-toggle-btn');
      this.soundOnIcon = document.getElementById('sound-on-icon');
      this.soundOffIcon = document.getElementById('sound-off-icon');

      this.dataMenuBtn = document.getElementById('data-menu-btn');
      this.dataDropdownMenu = document.getElementById('data-dropdown-menu');
      this.exportDataBtn = document.getElementById('export-data-btn');
      this.importDataInput = document.getElementById('import-data-input');
      this.loadSampleBtn = document.getElementById('load-sample-btn');
      this.clearAllBtn = document.getElementById('clear-all-btn');

      this.toastContainer = document.getElementById('toast-container');
    }

    initTheme() {
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);
      this.updateThemeIcons(savedTheme);
    }

    toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(STORAGE_KEYS.THEME, next);
      this.updateThemeIcons(next);
    }

    updateThemeIcons(theme) {
      if (theme === 'dark') {
        this.themeMoonIcon.classList.remove('hidden');
        this.themeSunIcon.classList.add('hidden');
      } else {
        this.themeMoonIcon.classList.add('hidden');
        this.themeSunIcon.classList.remove('hidden');
      }
    }

    initSoundToggle() {
      this.updateSoundIcons(this.state.soundEnabled);
    }

    toggleSound() {
      this.state.soundEnabled = !this.state.soundEnabled;
      localStorage.setItem(STORAGE_KEYS.SOUND, this.state.soundEnabled.toString());
      this.updateSoundIcons(this.state.soundEnabled);
      this.showToast(this.state.soundEnabled ? 'Sound feedback enabled' : 'Sound feedback muted');
    }

    updateSoundIcons(enabled) {
      if (enabled) {
        this.soundOnIcon.classList.remove('hidden');
        this.soundOffIcon.classList.add('hidden');
      } else {
        this.soundOnIcon.classList.add('hidden');
        this.soundOffIcon.classList.remove('hidden');
      }
    }

    renderCategoryOptions() {
      const categories = this.state.categories;

      // Populate Create Task category select
      this.categorySelect.innerHTML = categories
        .map(c => `<option value="${this.escapeHTML(c.name)}">${c.icon} ${this.escapeHTML(c.name)}</option>`)
        .join('');

      // Populate Edit Task category select
      this.editCategorySelect.innerHTML = categories
        .map(c => `<option value="${this.escapeHTML(c.name)}">${c.icon} ${this.escapeHTML(c.name)}</option>`)
        .join('');

      // Populate Filter category select
      const previousFilter = this.filterCategorySelect.value || 'ALL';
      this.filterCategorySelect.innerHTML = `
        <option value="ALL">All Categories</option>
        ${categories
          .map(c => `<option value="${this.escapeHTML(c.name)}">${c.icon} ${this.escapeHTML(c.name)}</option>`)
          .join('')}
      `;
      this.filterCategorySelect.value = previousFilter;
    }

    bindEvents() {
      // 1. Task Creation
      this.taskForm.addEventListener('submit', e => {
        e.preventDefault();
        this.handleAddTask();
      });

      // 2. Search
      this.searchInput.addEventListener('input', e => {
        this.state.searchQuery = e.target.value;
        this.clearSearchBtn.classList.toggle('hidden', !this.state.searchQuery);
        this.render();
      });

      this.clearSearchBtn.addEventListener('click', () => {
        this.searchInput.value = '';
        this.state.searchQuery = '';
        this.clearSearchBtn.classList.add('hidden');
        this.searchInput.focus();
        this.render();
      });

      // Keyboard Shortcut '/' to focus search
      window.addEventListener('keydown', e => {
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
          e.preventDefault();
          this.searchInput.focus();
        } else if (e.key === 'Escape') {
          this.closeAllModals();
        }
      });

      // 3. Category Filter
      this.filterCategorySelect.addEventListener('change', e => {
        this.state.currentCategory = e.target.value;
        this.render();
      });

      // 4. Sort selection
      this.sortSelect.addEventListener('change', e => {
        this.state.currentSort = e.target.value;
        this.render();
      });

      // 5. Status Tabs
      this.statusTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          this.statusTabs.forEach(t => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
          });
          tab.classList.add('active');
          tab.setAttribute('aria-selected', 'true');
          this.state.currentFilter = tab.getAttribute('data-filter');
          this.render();
        });
      });

      // 6. Clear Completed
      this.clearCompletedBtn.addEventListener('click', () => {
        const removed = this.state.clearCompleted();
        if (removed > 0) {
          if (this.state.soundEnabled) this.sound.playDelete();
          this.showToast(`Cleared ${removed} completed task${removed > 1 ? 's' : ''}`);
          this.render();
        } else {
          this.showToast('No completed tasks to clear.');
        }
      });

      // 7. Theme & Sound
      this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
      this.soundToggleBtn.addEventListener('click', () => this.toggleSound());

      // 8. Data Dropdown
      this.dataMenuBtn.addEventListener('click', e => {
        e.stopPropagation();
        this.dataDropdownMenu.classList.toggle('show');
      });

      document.addEventListener('click', e => {
        if (!this.dataMenuBtn.contains(e.target) && !this.dataDropdownMenu.contains(e.target)) {
          this.dataDropdownMenu.classList.remove('show');
        }
      });

      // Export Backup
      this.exportDataBtn.addEventListener('click', () => {
        this.exportDataJSON();
        this.dataDropdownMenu.classList.remove('show');
      });

      // Import Backup
      this.importDataInput.addEventListener('change', e => {
        this.importDataJSON(e);
        this.dataDropdownMenu.classList.remove('show');
      });

      // Load Sample Data
      this.loadSampleBtn.addEventListener('click', () => {
        if (confirm('Load sample starter tasks? This will append demo items.')) {
          this.state.tasks = [...SAMPLE_TASKS, ...this.state.tasks];
          this.state.reindexOrders();
          this.state.saveTasks();
          this.render();
          this.showToast('Sample tasks loaded!');
        }
        this.dataDropdownMenu.classList.remove('show');
      });

      // Clear All
      this.clearAllBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all tasks? This action cannot be undone.')) {
          this.state.clearAll();
          this.render();
          this.showToast('All tasks cleared.');
        }
        this.dataDropdownMenu.classList.remove('show');
      });

      // 9. Custom Category Modal
      this.addCategoryBtn.addEventListener('click', () => {
        this.openCustomCategoryModal();
      });
      this.closeCatModalBtn.addEventListener('click', () => this.closeCategoryModal());
      this.cancelCatBtn.addEventListener('click', () => this.closeCategoryModal());
      this.customCategoryForm.addEventListener('submit', e => {
        e.preventDefault();
        this.handleAddCategory();
      });

      // 10. Edit Modal
      this.closeModalBtn.addEventListener('click', () => this.closeEditModal());
      this.cancelEditBtn.addEventListener('click', () => this.closeEditModal());
      this.editForm.addEventListener('submit', e => {
        e.preventDefault();
        this.handleSaveEdit();
      });

      // 11. Task list item events (Delegated)
      this.taskList.addEventListener('click', e => {
        const itemEl = e.target.closest('.task-item');
        if (!itemEl) return;
        const taskId = itemEl.getAttribute('data-id');

        // Checkbox click
        if (e.target.closest('.task-checkbox-input')) {
          this.handleToggleCompletion(taskId, itemEl);
          return;
        }

        // Edit button
        if (e.target.closest('.action-btn.edit')) {
          this.openEditModal(taskId);
          return;
        }

        // Delete button
        if (e.target.closest('.action-btn.delete')) {
          this.handleDeleteTask(taskId, itemEl);
          return;
        }
      });

      // 12. Drag and Drop Support (HTML5 Native Drag & Drop)
      this.bindDragAndDrop();
    }

    bindDragAndDrop() {
      let draggedElement = null;

      this.taskList.addEventListener('dragstart', e => {
        const item = e.target.closest('.task-item');
        if (!item) return;

        draggedElement = item;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.getAttribute('data-id'));
      });

      this.taskList.addEventListener('dragend', () => {
        if (draggedElement) {
          draggedElement.classList.remove('dragging');
          draggedElement = null;
        }
        document.querySelectorAll('.task-item.drag-over').forEach(el => {
          el.classList.remove('drag-over');
        });
      });

      this.taskList.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const targetItem = e.target.closest('.task-item');
        if (targetItem && targetItem !== draggedElement) {
          document.querySelectorAll('.task-item.drag-over').forEach(el => {
            if (el !== targetItem) el.classList.remove('drag-over');
          });
          targetItem.classList.add('drag-over');
        }
      });

      this.taskList.addEventListener('dragleave', e => {
        const targetItem = e.target.closest('.task-item');
        if (targetItem && !targetItem.contains(e.relatedTarget)) {
          targetItem.classList.remove('drag-over');
        }
      });

      this.taskList.addEventListener('drop', e => {
        e.preventDefault();
        const targetItem = e.target.closest('.task-item');
        if (targetItem && draggedElement && targetItem !== draggedElement) {
          const draggedId = draggedElement.getAttribute('data-id');
          const targetId = targetItem.getAttribute('data-id');

          const reordered = this.state.reorderTasks(draggedId, targetId);
          if (reordered) {
            // Force sort selection to manual drag order
            this.state.currentSort = 'custom';
            this.sortSelect.value = 'custom';
            this.render();
          }
        }
        document.querySelectorAll('.task-item.drag-over').forEach(el => {
          el.classList.remove('drag-over');
        });
      });
    }

    handleAddTask() {
      const title = this.titleInput.value.trim();
      if (!title) return;

      const newTask = this.state.addTask({
        title,
        category: this.categorySelect.value,
        priority: this.prioritySelect.value,
        dueDate: this.dueDateInput.value,
        description: this.descInput.value
      });

      this.taskForm.reset();
      this.titleInput.focus();
      this.render();
      this.showToast(`Task created: "${newTask.title.slice(0, 24)}${newTask.title.length > 24 ? '...' : ''}"`);
    }

    handleToggleCompletion(taskId, itemEl) {
      const task = this.state.toggleTaskCompletion(taskId);
      if (!task) return;

      if (task.completed) {
        if (this.state.soundEnabled) this.sound.playComplete();
        const rect = itemEl.getBoundingClientRect();
        this.confetti.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 35);
      }

      this.render();

      const stats = this.state.getStats();
      if (stats.total > 0 && stats.rate === 100) {
        setTimeout(() => {
          this.confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 100);
          this.showToast('🎉 Outstanding! You reached 100% completion!');
        }, 200);
      }
    }

    handleDeleteTask(taskId, itemEl) {
      if (this.state.soundEnabled) this.sound.playDelete();

      // Trigger smooth exit animation
      itemEl.classList.add('fade-out');

      setTimeout(() => {
        const deleted = this.state.deleteTask(taskId);
        this.render();

        if (deleted) {
          this.showUndoToast(`Deleted "${deleted.title.slice(0, 22)}..."`, () => {
            this.state.undoDelete();
            this.render();
            this.showToast('Task restored');
          });
        }
      }, 280);
    }

    openEditModal(taskId) {
      const task = this.state.tasks.find(t => t.id === taskId);
      if (!task) return;

      this.editIdInput.value = task.id;
      this.editTitleInput.value = task.title;
      this.editCategorySelect.value = task.category;
      this.editPrioritySelect.value = task.priority;
      this.editDueDateInput.value = task.dueDate || '';
      this.editDescInput.value = task.description || '';
      this.editCompletedInput.checked = task.completed;

      this.editModal.classList.remove('hidden');
      this.editTitleInput.focus();
    }

    closeEditModal() {
      this.editModal.classList.add('hidden');
      this.editForm.reset();
    }

    handleSaveEdit() {
      const id = this.editIdInput.value;
      const title = this.editTitleInput.value.trim();
      if (!title) return;

      const wasCompleted = this.state.tasks.find(t => t.id === id)?.completed;
      const isCompletedNow = this.editCompletedInput.checked;

      this.state.updateTask(id, {
        title,
        category: this.editCategorySelect.value,
        priority: this.editPrioritySelect.value,
        dueDate: this.editDueDateInput.value,
        description: this.editDescInput.value,
        completed: isCompletedNow
      });

      if (!wasCompleted && isCompletedNow) {
        if (this.state.soundEnabled) this.sound.playComplete();
        this.confetti.burst(window.innerWidth / 2, window.innerHeight / 2, 35);
      }

      this.closeEditModal();
      this.render();
      this.showToast('Task updated successfully');
    }

    openCustomCategoryModal() {
      this.categoryModal.classList.remove('hidden');
      this.customCatInput.value = '';
      this.customCatEmoji.value = '🏷️';
      this.customCatInput.focus();
    }

    closeCategoryModal() {
      this.categoryModal.classList.add('hidden');
      this.customCategoryForm.reset();
    }

    handleAddCategory() {
      const name = this.customCatInput.value;
      const emoji = this.customCatEmoji.value || '🏷️';
      const created = this.state.addCategory(name, emoji);

      if (!created) {
        alert('Category name already exists or is invalid.');
        return;
      }

      this.renderCategoryOptions();
      this.categorySelect.value = created.name;
      this.closeCategoryModal();
      this.showToast(`Category "${created.name}" created!`);
    }

    closeAllModals() {
      this.closeEditModal();
      this.closeCategoryModal();
      this.dataDropdownMenu.classList.remove('show');
    }

    exportDataJSON() {
      const payload = {
        app: 'Zenith Task Tracker',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        tasks: this.state.tasks,
        categories: this.state.categories
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zenith_tasks_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showToast('Backup JSON exported successfully');
    }

    importDataJSON(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = event => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (Array.isArray(parsed.tasks)) {
            this.state.tasks = parsed.tasks;
            if (Array.isArray(parsed.categories)) {
              this.state.categories = parsed.categories;
            }
            this.state.reindexOrders();
            this.state.saveTasks();
            this.state.saveCategories();
            this.renderCategoryOptions();
            this.render();
            this.showToast(`Imported ${parsed.tasks.length} tasks successfully!`);
          } else {
            alert('Invalid backup file format: missing tasks array.');
          }
        } catch (err) {
          alert('Failed to parse JSON file.');
          console.error(err);
        }
        this.importDataInput.value = '';
      };
      reader.readAsText(file);
    }

    /* ==========================================================================
       Rendering & Template Generation
       ========================================================================== */
    render() {
      this.renderMetrics();
      this.renderTaskList();
    }

    renderMetrics() {
      const stats = this.state.getStats();

      this.statTotal.textContent = stats.total;
      this.statActive.textContent = stats.active;
      this.statCompleted.textContent = stats.completed;
      this.statOverdue.textContent = stats.overdue;

      this.progressPercentLabel.textContent = `${stats.rate}%`;
      this.progressFill.style.width = `${stats.rate}%`;
      this.progressBarAria.setAttribute('aria-valuenow', stats.rate);
      this.badgeScore.textContent = `Score: ${stats.rate}%`;

      // Update tab badge counters
      this.countAll.textContent = stats.total;
      this.countActive.textContent = stats.active;
      this.countCompleted.textContent = stats.completed;
      this.countOverdue.textContent = stats.overdue;
    }

    renderTaskList() {
      const tasks = this.state.getFilteredTasks();
      const today = new Date().toISOString().split('T')[0];

      if (tasks.length === 0) {
        this.taskList.innerHTML = '';
        this.emptyState.classList.remove('hidden');

        if (this.state.searchQuery) {
          this.emptyTitle.textContent = 'No Matching Tasks';
          this.emptyDesc.textContent = `No tasks found matching "${this.state.searchQuery}". Try a different keyword or reset filters.`;
        } else if (this.state.currentFilter === 'completed') {
          this.emptyTitle.textContent = 'No Completed Tasks Yet';
          this.emptyDesc.textContent = 'Finish active items to celebrate your accomplishments here!';
        } else if (this.state.currentFilter === 'overdue') {
          this.emptyTitle.textContent = 'No Overdue Tasks!';
          this.emptyDesc.textContent = 'Hooray! You are on top of all your scheduled deadlines.';
        } else {
          this.emptyTitle.textContent = 'Zero Tasks in Queue';
          this.emptyDesc.textContent = 'Add your first task above to kickstart your productivity flow.';
        }
        return;
      }

      this.emptyState.classList.add('hidden');

      this.taskList.innerHTML = tasks
        .map(task => {
          const isOverdue = !task.completed && task.dueDate && task.dueDate < today;
          const isDueToday = !task.completed && task.dueDate && task.dueDate === today;

          const catObj = this.state.categories.find(c => c.name === task.category);
          const catIcon = catObj ? catObj.icon : '🏷️';

          let dueDateBadge = '';
          if (task.dueDate) {
            let dueClass = 'badge badge-due';
            let dueLabel = this.formatDate(task.dueDate);

            if (isOverdue) {
              dueClass += ' overdue';
              dueLabel = `⚠️ Overdue (${dueLabel})`;
            } else if (isDueToday) {
              dueClass += ' due-today';
              dueLabel = `⏰ Due Today (${dueLabel})`;
            } else {
              dueLabel = `📅 ${dueLabel}`;
            }

            dueDateBadge = `<span class="${dueClass}">${dueLabel}</span>`;
          }

          return `
            <li class="task-item ${task.completed ? 'completed' : ''}" 
                data-id="${task.id}" 
                draggable="true" 
                role="listitem">
              
              <div class="drag-handle" title="Drag to reorder" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
                  <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                  <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
                </svg>
              </div>

              <label class="checkbox-container">
                <input type="checkbox" class="task-checkbox-input" ${task.completed ? 'checked' : ''} aria-label="Mark task as ${task.completed ? 'incomplete' : 'complete'}">
                <span class="custom-checkbox"></span>
              </label>

              <div class="task-body">
                <div class="task-headline">
                  <span class="task-title-text">${this.escapeHTML(task.title)}</span>
                </div>

                ${task.description ? `<p class="task-desc-text">${this.escapeHTML(task.description)}</p>` : ''}

                <div class="task-meta">
                  <span class="badge badge-category">${catIcon} ${this.escapeHTML(task.category)}</span>
                  <span class="badge badge-priority ${task.priority}">${task.priority} Priority</span>
                  ${dueDateBadge}
                </div>
              </div>

              <div class="task-actions">
                <button class="action-btn edit" title="Edit Task" aria-label="Edit task">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button class="action-btn delete" title="Delete Task" aria-label="Delete task">
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </li>
          `;
        })
        .join('');
    }

    /* Helper Utilities */
    formatDate(dateStr) {
      if (!dateStr) return '';
      const [year, month, day] = dateStr.split('-');
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    escapeHTML(str) {
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    showToast(message) {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;

      this.toastContainer.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 250);
      }, 3000);
    }

    showUndoToast(message, onUndo) {
      // Clear previous undo timer if active
      if (this.state.undoTimer) {
        clearTimeout(this.state.undoTimer);
      }

      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `
        <span>${this.escapeHTML(message)}</span>
        <div class="toast-actions">
          <button class="toast-undo-btn">Undo</button>
        </div>
      `;

      const undoBtn = toast.querySelector('.toast-undo-btn');
      undoBtn.addEventListener('click', () => {
        if (onUndo) onUndo();
        toast.remove();
      });

      this.toastContainer.appendChild(toast);

      this.state.undoTimer = setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 250);
        this.state.recentlyDeleted = null;
      }, 5000);
    }
  }

  // Initialize Application on DOM Ready
  document.addEventListener('DOMContentLoaded', () => {
    window.zenithApp = new TaskApp();
  });
})();
