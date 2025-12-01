import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Task } from '../types';
import { ContributionGraph } from '../components/ContributionGraph';
import { ProfileModal } from '../components/ProfileModal';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  LogOut, Moon, Sun, Plus, CheckCircle2, Circle, 
  Trash2, Calendar, Layout, AlertCircle, Clock, Pencil, X
} from 'lucide-react';
import { format, isToday, isFuture, isPast, startOfDay, parseISO } from 'date-fns';

export default function StudentDashboard() {
  const { user, userProfile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // Modals
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  
  // Task Actions State
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  
  // Add Task State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isAdding, setIsAdding] = useState(false);

  // Edit Task Form State
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Sort client-side
    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      // Sort: Oldest created first (Ascending)
      fetchedTasks.sort((a, b) => a.createdAt - b.createdAt);
      setTasks(fetchedTasks);
    }, (error) => {
      console.error("Error fetching tasks:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!newTaskTitle.trim()) {
        alert("Please enter a task title");
        return;
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    if (newTaskDate < todayStr) {
        alert("You cannot schedule tasks for the past!");
        return;
    }
    
    setIsAdding(true);
    try {
      const dateObj = parseISO(newTaskDate);
      const timestamp = startOfDay(dateObj).getTime();

      await addDoc(collection(db, 'tasks'), {
        userId: user.uid,
        title: newTaskTitle.trim(),
        dueDate: timestamp,
        completed: false,
        createdAt: Date.now()
      });
      setNewTaskTitle('');
      setNewTaskDate(format(new Date(), 'yyyy-MM-dd'));
    } catch (error) {
      console.error("Error adding task:", error);
      alert("Failed to add task. Please check your internet connection.");
    } finally {
      setIsAdding(false);
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        completed: !task.completed,
        completedAt: !task.completed ? Date.now() : null
      });
    } catch (error) {
      console.error(error);
    }
  };

  // --- Edit Logic ---
  const openEditModal = (task: Task) => {
    setTaskToEdit(task);
    setEditTitle(task.title);
    setEditDate(format(task.dueDate, 'yyyy-MM-dd'));
    setEditModalOpen(true);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToEdit) return;

    if (!editTitle.trim()) {
      alert("Task title cannot be empty");
      return;
    }

    setIsSavingEdit(true);
    try {
      const dateObj = parseISO(editDate);
      const timestamp = startOfDay(dateObj).getTime();

      await updateDoc(doc(db, 'tasks', taskToEdit.id), {
        title: editTitle.trim(),
        dueDate: timestamp
      });
      setEditModalOpen(false);
      setTaskToEdit(null);
    } catch (error) {
      console.error("Error updating task:", error);
      alert("Failed to update task.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // --- Delete Logic ---
  const confirmDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteModalOpen(true);
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    try {
      await deleteDoc(doc(db, 'tasks', taskToDelete));
    } catch (error: any) {
      console.error("Error deleting task:", error);
      alert("Failed to delete task. " + (error.message || "Please check your connection."));
    } finally {
      setTaskToDelete(null);
    }
  };

  // Stats
  const completedCount = tasks.filter(t => t.completed).length;
  const completionRate = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Grouped Tasks
  const todayTasks = tasks.filter(t => isToday(t.dueDate) && !t.completed);
  const upcomingTasks = tasks.filter(t => isFuture(startOfDay(t.dueDate)) && !isToday(t.dueDate) && !t.completed);
  const overdueTasks = tasks.filter(t => isPast(startOfDay(t.dueDate)) && !isToday(t.dueDate) && !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 flex flex-col font-sans">
      {/* Navbar */}
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <Layout className="w-6 h-6 text-brand-600 dark:text-brand-400" />
              <span className="font-bold text-xl text-slate-900 dark:text-white hidden sm:block tracking-tight">Study Tracker</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-400 transition-all"
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700">
                <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 group">
                  <div className="relative">
                    <img 
                      src={userProfile?.photoURL} 
                      alt="User" 
                      className="w-9 h-9 rounded-full bg-slate-200 border-2 border-white dark:border-slate-700 shadow-sm group-hover:border-brand-500 transition-all" 
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
                  </div>
                  <div className="text-sm text-left hidden sm:block">
                    <p className="font-semibold text-slate-700 dark:text-slate-200 leading-tight">{userProfile?.displayName}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">Student</p>
                  </div>
                </button>
                <button 
                  onClick={() => setLogoutModalOpen(true)} 
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all" 
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="w-full md:w-auto text-center md:text-left">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Hello, {userProfile?.displayName?.split(' ')[0]}! 👋
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              You have <strong className="text-brand-600 dark:text-brand-400">{todayTasks.length} tasks</strong> due today.
            </p>
          </div>
          
          <div className="flex w-full md:w-auto items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
             <div className="flex-1 md:flex-none px-4 text-center md:text-left border-r border-slate-200 dark:border-slate-700">
               <span className="text-xs text-slate-500 uppercase font-bold">Done</span>
               <p className="text-xl font-bold text-green-600">{completedCount}</p>
             </div>
             <div className="flex-1 md:flex-none px-4 text-center md:text-left">
               <span className="text-xs text-slate-500 uppercase font-bold">Rate</span>
               <p className="text-xl font-bold text-brand-600">{completionRate}%</p>
             </div>
          </div>
        </div>

        {/* Add Task & Graph Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Add Task Card - 3 Columns */}
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden h-full flex flex-col">
              <div className="p-6 bg-gradient-to-r from-brand-600 to-brand-700 text-white">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Plus className="w-5 h-5" /> New Task
                </h3>
                <p className="text-brand-100 text-sm opacity-90">Capture your tasks effectively.</p>
              </div>
              
              <form onSubmit={handleAddTask} className="p-6 flex-1 flex flex-col gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Task Title</label>
                  <Input 
                    placeholder="e.g. Read Chapter 4 of Biology" 
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900/50 border-transparent focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-white"
                  />
                </div>
                
                <div className="space-y-1.5">
                   <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                     <Calendar className="w-4 h-4 text-brand-500" /> Due Date
                   </label>
                   <input 
                    type="date" 
                    required
                    min={format(new Date(), 'yyyy-MM-dd')}
                    value={newTaskDate}
                    onChange={(e) => setNewTaskDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 dark:bg-slate-900/50 dark:border-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all dark:scheme-dark"
                  />
                </div>

                <div className="mt-auto pt-2">
                  <Button type="submit" disabled={!newTaskTitle.trim() || isAdding} isLoading={isAdding} className="w-full shadow-lg shadow-brand-500/20 py-2.5">
                    Add Task to List
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Contribution Graph - 9 Columns */}
          <div className="lg:col-span-8 xl:col-span-9">
             <ContributionGraph tasks={tasks} className="h-full" />
          </div>
        </div>

        {/* Task Columns */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Layout className="w-5 h-5 text-slate-400" /> Your Workspace
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <TaskColumn 
              title="Overdue" 
              tasks={overdueTasks} 
              onToggle={toggleTask} 
              onDelete={confirmDeleteTask}
              onEdit={openEditModal}
              emptyText="You're all caught up!" 
              icon={<AlertCircle className="w-5 h-5 text-red-500"/>} 
              accentColor="border-red-500"
              headerColor="bg-red-50 dark:bg-red-900/20"
              isOverdue 
            />
            
            <TaskColumn 
              title="Today" 
              tasks={todayTasks} 
              onToggle={toggleTask} 
              onDelete={confirmDeleteTask}
              onEdit={openEditModal}
              emptyText="No tasks due today." 
              icon={<Clock className="w-5 h-5 text-brand-500"/>} 
              accentColor="border-brand-500"
              headerColor="bg-brand-50 dark:bg-brand-900/20"
            />
            
            <TaskColumn 
              title="Upcoming" 
              tasks={upcomingTasks} 
              onToggle={toggleTask} 
              onDelete={confirmDeleteTask}
              onEdit={openEditModal}
              emptyText="Clear schedule ahead." 
              icon={<Calendar className="w-5 h-5 text-indigo-500"/>} 
              accentColor="border-indigo-500"
              headerColor="bg-indigo-50 dark:bg-indigo-900/20"
            />

            <TaskColumn 
              title="Completed" 
              tasks={completedTasks.slice(0, 10)} 
              onToggle={toggleTask} 
              onDelete={confirmDeleteTask}
              onEdit={openEditModal}
              emptyText="Get to work!" 
              icon={<CheckCircle2 className="w-5 h-5 text-green-500"/>} 
              isCompleted 
              accentColor="border-green-500"
              headerColor="bg-green-50 dark:bg-green-900/20"
            />

          </div>
        </div>

      </main>

      <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            &copy; {new Date().getFullYear()} Study Tracker. Powered by Dream Stars <span className="text-amber-500 font-bold">VIP</span>
          </p>
        </div>
      </footer>

      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
      
      {/* Edit Task Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Pencil className="w-4 h-4" /> Edit Task
                </h3>
                <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpdateTask} className="p-6 space-y-4">
                 <div className="space-y-1.5">
                   <label className="text-xs font-bold text-slate-500 uppercase">Title</label>
                   <Input 
                      value={editTitle} 
                      onChange={(e) => setEditTitle(e.target.value)} 
                      placeholder="Task Title"
                      className="bg-slate-50 dark:bg-slate-900"
                   />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Due Date</label>
                    <input 
                      type="date" 
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                 </div>
                 <div className="pt-2 flex gap-3">
                   <Button type="button" variant="secondary" onClick={() => setEditModalOpen(false)} className="flex-1">Cancel</Button>
                   <Button type="submit" isLoading={isSavingEdit} className="flex-1">Save Changes</Button>
                 </div>
              </form>
           </div>
        </div>
      )}
      
      {/* Delete Task Confirmation */}
      <ConfirmationModal 
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        message="Are you sure you want to permanently delete this task? This action cannot be undone."
        confirmLabel="Delete"
        isDestructive
      />

      {/* Logout Confirmation */}
      <ConfirmationModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={logout}
        title="Sign Out"
        message="Are you sure you want to log out of your account?"
        confirmLabel="Log Out"
      />
    </div>
  );
}

const TaskColumn = ({ title, tasks, onToggle, onDelete, onEdit, emptyText, icon, isCompleted = false, isOverdue = false, accentColor = 'border-slate-200', headerColor = '' }: any) => (
  <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border-t-4 ${accentColor} border-x border-b border-slate-200 dark:border-slate-700 flex flex-col h-auto max-h-[600px] min-h-[200px]`}>
    <div className={`p-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between ${headerColor}`}>
      <div className="flex items-center gap-2">
        {icon}
        <h3 className={`font-bold text-sm ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>{title}</h3>
      </div>
      <span className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-full shadow-sm">
        {tasks.length}
      </span>
    </div>
    <div className="p-3 overflow-y-auto space-y-2 flex-1 custom-scrollbar">
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center opacity-50 py-12">
          <div className="bg-slate-100 dark:bg-slate-700 p-3 rounded-full mb-2">
            {icon}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{emptyText}</p>
        </div>
      ) : (
        tasks.map((task: Task) => (
          <div 
            key={task.id} 
            className={`group p-3 rounded-lg border transition-all duration-200 hover:shadow-md hover:scale-[1.01]
              ${task.completed 
                ? 'bg-slate-50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800' 
                : 'bg-white dark:bg-slate-700/30 border-slate-200 dark:border-slate-600'
              }
            `}
          >
            <div className="flex items-start gap-3">
              <button 
                onClick={() => onToggle(task)}
                className={`mt-0.5 flex-shrink-0 transition-all duration-300 ${
                  task.completed 
                    ? 'text-green-500 scale-110' 
                    : 'text-slate-300 hover:text-brand-500 dark:text-slate-500 dark:hover:text-brand-400'
                }`}
              >
                {task.completed ? <CheckCircle2 className="w-5 h-5 fill-current" /> : <Circle className="w-5 h-5" />}
              </button>
              <div className="flex-1 min-w-0 group/item">
                <p className={`text-sm font-medium leading-snug break-words transition-all ${
                  task.completed ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'
                }`}>
                  {task.title}
                </p>
                <div className="flex items-center justify-between mt-2">
                   <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                     isOverdue && !task.completed 
                      ? 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-600 dark:text-slate-300'
                   }`}>
                     {format(task.dueDate, 'MMM d')}
                   </span>
                   
                   <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                     {/* Edit Button */}
                     {!task.completed && (
                       <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(task);
                        }}
                        className="p-1.5 rounded-full text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-all active:scale-95"
                        title="Edit task"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                     )}
                     
                     {/* Delete Button */}
                     <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(task.id);
                      }}
                      className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all active:scale-95"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);