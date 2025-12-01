import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { collection, query, getDocs, where, setDoc, doc } from 'firebase/firestore';
import { initializeApp, deleteApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, firebaseConfig } from '../firebase'; 
import { UserProfile, Task } from '../types';
import { ContributionGraph } from '../components/ContributionGraph';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { ProfileModal } from '../components/ProfileModal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  LogOut, Moon, Sun, ShieldCheck, Search, 
  User as UserIcon, XCircle, TrendingUp, 
  Users, CheckCircle2, LayoutDashboard, AlertTriangle, 
  RefreshCcw, ShieldAlert, Bell, Filter, 
  ListTodo, Activity, FileSpreadsheet, ChevronLeft, ChevronRight, X, UserPlus, Download,
  Eye, EyeOff
} from 'lucide-react';
import { subDays, format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDate, isPast, startOfDay } from 'date-fns';

// --- Types for Admin Specific Features ---
type SortOption = 'name' | 'consistency' | 'overdue' | 'completion';
type TabView = 'overview' | 'tasks' | 'activity' | 'export';
type ChartRange = 'week' | 'month';

interface AdminNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: number;
}

// --- Sub-Component: Performance Line Chart ---
const PerformanceLineChart = ({ tasks, label = "Performance", range = 'month' }: { tasks: Task[], label?: string, range: ChartRange }) => {
  const today = new Date();
  let start: Date, end: Date;

  if (range === 'week') {
    end = today;
    start = subDays(today, 6); // Last 7 days
  } else {
    start = startOfMonth(today);
    end = endOfMonth(today);
  }

  const daysInInterval = eachDayOfInterval({ start, end });

  // Process Data
  const dataPoints = daysInInterval.map(day => {
    const completedCount = tasks.filter(t => 
      t.completed && 
      t.completedAt && 
      isSameDay(new Date(t.completedAt), day)
    ).length;
    
    // For weekly view, show Day Name (Mon), for monthly show Date (1, 2)
    const displayLabel = range === 'week' ? format(day, 'EEE') : getDate(day).toString();
    
    return { day: displayLabel, count: completedCount, fullDate: day };
  });

  const maxVal = Math.max(...dataPoints.map(d => d.count), 5); // Minimum ceiling of 5

  // Generate Path
  const points = dataPoints.map((d, index) => {
    const x = (index / (dataPoints.length - 1)) * 100;
    const y = 100 - (d.count / maxVal) * 100;
    return `${x},${y}`;
  }).join(' ');

  const fillPath = `M 0,100 ${points} L 100,100 Z`;

  return (
    <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wide">
          <TrendingUp className="w-4 h-4 text-brand-500" />
          {label}
        </h4>
        <div className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded">
          Range: {range === 'week' ? 'Last 7 Days' : format(today, 'MMMM')}
        </div>
      </div>
      
      <div className="relative w-full h-[150px] group">
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
             <div key={tick} className="w-full border-t border-slate-100 dark:border-slate-700/50 h-0" />
          ))}
        </div>

        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={fillPath} fill="url(#chartGradient)" className="transition-all duration-300" />
          <polyline fill="none" stroke="#3b82f6" strokeWidth="1.5" points={points} strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-md" />
          {dataPoints.map((d, index) => {
             const x = (index / (dataPoints.length - 1)) * 100;
             const y = 100 - (d.count / maxVal) * 100;
             return (
               <g key={index} className="group/point">
                 <circle cx={x} cy={y} r="2" className="fill-white stroke-brand-600 stroke-2 opacity-0 group-hover/point:opacity-100 transition-opacity cursor-pointer z-10" />
                 
                 {/* Tooltip */}
                 <foreignObject x={x - 15} y={y - 35} width="30" height="30" className="opacity-0 group-hover/point:opacity-100 transition-opacity overflow-visible pointer-events-none">
                    <div className="flex flex-col items-center">
                       <div className="bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap mb-1">
                          {d.count} tasks
                       </div>
                       <div className="text-[9px] font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-1 rounded border border-slate-200 dark:border-slate-700 shadow-sm">
                          {d.day}
                       </div>
                    </div>
                 </foreignObject>
               </g>
             );
          })}
        </svg>
        
        {/* X-Axis Labels */}
        <div className="flex justify-between mt-2 px-1">
           {dataPoints.filter((_, i) => i % (range === 'week' ? 1 : 5) === 0).map((d, i) => (
              <span key={i} className="text-[10px] text-slate-400">{d.day}</span>
           ))}
        </div>
      </div>
    </div>
  );
};

// --- Sub-Component: Stats Card ---
const StatsCard = ({ label, value, icon: Icon, color }: any) => (
  <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center">
    <div className={`p-2 rounded-full bg-slate-50 dark:bg-slate-700/50 mb-2`}>
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
    <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">{label}</p>
  </div>
);

export default function AdminDashboard() {
  const { user, userProfile, logout, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  // Navigation
  const [activeTab, setActiveTab] = useState<TabView>('overview');
  
  // Data State
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [studentTasks, setStudentTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const [fixingAccount, setFixingAccount] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  
  // Add User State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'STUDENT' | 'ADMIN'>('STUDENT');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState('');
  const [createUserSuccess, setCreateUserSuccess] = useState('');
  
  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('name');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [taskFilterStatus, setTaskFilterStatus] = useState<'all' | 'completed' | 'pending' | 'overdue'>('all');
  
  // Pagination State
  const [visibleStudentCount, setVisibleStudentCount] = useState(10);
  const [taskPage, setTaskPage] = useState(1);
  const tasksPerPage = 10;
  
  // Chart State
  const [chartRange, setChartRange] = useState<ChartRange>('month');
  
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setPermissionError(false);
    try {
      const usersQ = query(collection(db, 'users'), where('role', '==', 'STUDENT'));
      const usersSnapshot = await getDocs(usersQ);
      setStudents(usersSnapshot.docs.map(doc => doc.data() as UserProfile));

      const tasksSnapshot = await getDocs(collection(db, 'tasks'));
      const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setAllTasks(tasks);

    } catch (err: any) {
      console.error("Error fetching admin data:", err);
      if (err.code === 'permission-denied' || err.message?.includes('Missing or insufficient permissions')) {
        setPermissionError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const fixAdminAccount = async () => {
    if (!user) return;
    setFixingAccount(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Admin User',
        photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
        role: 'ADMIN',
        bio: 'Administrator',
        createdAt: Date.now()
      });
      await refreshProfile();
      await fetchData();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setFixingAccount(false);
    }
  };
  
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError('');
    setCreateUserSuccess('');

    if (!isValidEmail(newUserEmail)) {
      setCreateUserError("Please enter a valid email address.");
      return;
    }

    if (newUserPassword.length < 6) {
      setCreateUserError("Password must be at least 6 characters.");
      return;
    }

    setIsCreatingUser(true);

    // --- STRATEGY: STAY ADMIN (Secondary App) ---
    // This allows us to create a new user without logging out the current admin.
    let secondaryApp: any;
    try {
      // Check if the secondary app is already initialized to avoid duplicate-app error
      if (getApps().some(app => app.name === "SecondaryApp")) {
        secondaryApp = getApp("SecondaryApp");
      } else {
        secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
      }
      
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUserEmail, newUserPassword);
      const newUser = userCredential.user;
      
      // Create Firestore Document
      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        email: newUserEmail,
        displayName: newUserName,
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUser.uid}`,
        role: newUserRole,
        bio: newUserRole === 'ADMIN' ? 'Administrator' : 'Student',
        createdAt: Date.now()
      });
      
      // Cleanup: Sign out of the secondary app
      await signOut(secondaryAuth);
      
      setCreateUserSuccess(`User ${newUserName} created successfully!`);
      
      // Reset Form
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserName('');
      setNewUserRole('STUDENT');
      
      // Refresh list
      await fetchData();
      
      // Close modal after delay
      setTimeout(() => {
        setShowAddUserModal(false);
        setCreateUserSuccess('');
      }, 1500);
      
    } catch (error: any) {
      console.error("Error creating user:", error);
      let errMsg = error.message;
      if (errMsg.includes('email-already-in-use')) errMsg = "That email is already registered.";
      if (errMsg.includes('weak-password')) errMsg = "Password is too weak.";
      if (errMsg.includes('Missing or insufficient permissions')) errMsg = "Access Denied: Please update Firestore Rules to allow Admins to create users.";
      setCreateUserError(errMsg);
    } finally {
      // Clean up the secondary app to prevent memory leaks or state issues
      if (secondaryApp) {
        try {
           await deleteApp(secondaryApp);
        } catch (e) {
           console.warn("Could not delete secondary app instance", e);
        }
      }
      setIsCreatingUser(false);
    }
  };

  // --- DERIVED DATA & ANALYTICS ---

  // Notifications Logic
  const notifications = useMemo<AdminNotification[]>(() => {
    const list: AdminNotification[] = [];
    
    // Specific New Student Alerts (Last 24h)
    const recentJoinThreshold = Date.now() - 86400000;
    students.forEach(s => {
      if (s.createdAt > recentJoinThreshold) {
        list.push({
          id: `join-${s.uid}`,
          type: 'info',
          message: `${s.displayName} joined the platform.`,
          timestamp: s.createdAt
        });
      }
    });

    // High Overdue Spike (System Wide)
    const overdueCount = allTasks.filter(t => !t.completed && isPast(startOfDay(t.dueDate))).length;
    if (overdueCount > 20) {
      list.push({ id: 'od-spike', type: 'warning', message: `High overdue load: ${overdueCount} overdue tasks system-wide.`, timestamp: Date.now() });
    }

    // Sort by newest
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [students, allTasks]);

  // Global Stats
  const globalStats = useMemo(() => {
    const totalStudents = students.length;
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.completed).length;
    const overdueTasks = allTasks.filter(t => !t.completed && isPast(startOfDay(t.dueDate))).length;
    const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;
    return { totalStudents, totalTasks, completedTasks, overdueTasks, completionRate };
  }, [students, allTasks]);

  // Activity Feed
  const activityFeed = useMemo(() => {
    const sorted = [...allTasks].sort((a, b) => (b.completedAt || b.createdAt) - (a.completedAt || a.createdAt));
    return sorted.slice(0, 50).map(task => {
      const student = students.find(s => s.uid === task.userId);
      return { task, student };
    });
  }, [allTasks, students]);

  // Sorted Students for Directory
  const sortedStudents = useMemo(() => {
    let sorted = [...students];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      sorted = sorted.filter(s => s.displayName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    }
    
    return sorted.sort((a, b) => {
      const tasksA = allTasks.filter(t => t.userId === a.uid);
      const tasksB = allTasks.filter(t => t.userId === b.uid);
      
      switch(sortOption) {
        case 'consistency': 
          return tasksB.filter(t => t.completed).length - tasksA.filter(t => t.completed).length;
        case 'overdue': 
          return tasksB.filter(t => !t.completed && isPast(startOfDay(t.dueDate))).length - 
                 tasksA.filter(t => !t.completed && isPast(startOfDay(t.dueDate))).length;
        case 'completion': 
          const rateA = tasksA.length ? tasksA.filter(t => t.completed).length / tasksA.length : 0;
          const rateB = tasksB.length ? tasksB.filter(t => t.completed).length / tasksB.length : 0;
          return rateB - rateA;
        default: 
          return a.displayName.localeCompare(b.displayName);
      }
    });
  }, [students, allTasks, searchQuery, sortOption]);

  const visibleStudents = useMemo(() => {
    return sortedStudents.slice(0, visibleStudentCount);
  }, [sortedStudents, visibleStudentCount]);

  // Filtered Tasks for Global Search
  const filteredGlobalTasks = useMemo(() => {
    let res = [...allTasks];
    if (taskSearchQuery) {
      res = res.filter(t => t.title.toLowerCase().includes(taskSearchQuery.toLowerCase()));
    }
    if (taskFilterStatus !== 'all') {
      if (taskFilterStatus === 'completed') res = res.filter(t => t.completed);
      if (taskFilterStatus === 'pending') res = res.filter(t => !t.completed && !isPast(startOfDay(t.dueDate)));
      if (taskFilterStatus === 'overdue') res = res.filter(t => !t.completed && isPast(startOfDay(t.dueDate)));
    }
    return res.sort((a, b) => b.createdAt - a.createdAt);
  }, [allTasks, taskSearchQuery, taskFilterStatus]);

  // Pagination for Tasks
  const paginatedTasks = useMemo(() => {
    const indexOfLast = taskPage * tasksPerPage;
    const indexOfFirst = indexOfLast - tasksPerPage;
    return filteredGlobalTasks.slice(indexOfFirst, indexOfLast);
  }, [filteredGlobalTasks, taskPage]);

  const totalTaskPages = Math.ceil(filteredGlobalTasks.length / tasksPerPage);

  // Helpers
  const handleStudentSelect = async (student: UserProfile) => {
    setSelectedStudent(student);
    const tasks = allTasks.filter(t => t.userId === student.uid).sort((a, b) => b.createdAt - a.createdAt);
    setStudentTasks(tasks);
    setChartRange('month'); 
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleExportUsers = () => {
    const headers = ["Display Name", "Email", "Role", "Joined Date", "Total Tasks", "Completed Tasks"];
    const rows = students.map(s => {
      const sTasks = allTasks.filter(t => t.userId === s.uid);
      return [
        s.displayName,
        s.email,
        s.role,
        format(s.createdAt, 'yyyy-MM-dd'),
        sTasks.length,
        sTasks.filter(t => t.completed).length
      ].join(",");
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "study_tracker_students.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset pagination when filters change
  useEffect(() => {
    setTaskPage(1);
  }, [taskSearchQuery, taskFilterStatus]);

  // Reset student load more when search changes
  useEffect(() => {
    setVisibleStudentCount(10);
  }, [searchQuery, sortOption]);


  if (permissionError) {
     return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-xl max-w-lg w-full text-center border border-red-200 dark:border-red-900">
           <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
           <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
           <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm leading-relaxed">
             The application cannot read the Admin data. Check Rules or your User Role.
           </p>
           <div className="flex flex-col gap-3">
             <Button onClick={fixAdminAccount} isLoading={fixingAccount} className="w-full bg-brand-600 hover:bg-brand-700">
                <ShieldAlert className="w-4 h-4 mr-2" /> Initialize Admin Profile
             </Button>
             <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={() => logout()} className="flex-1">Sign Out</Button>
              <Button onClick={fetchData} isLoading={loading} variant="ghost" className="flex-1">
                <RefreshCcw className="w-4 h-4 mr-2" /> Retry Fetch
              </Button>
             </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-300 flex flex-col font-sans">
       {/* Admin Navbar */}
       <nav className="bg-slate-900 text-white sticky top-0 z-40 shadow-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-amber-500" />
              <span className="font-bold text-xl tracking-tight text-white">Study Tracker</span>
            </div>
            
            {/* Desktop Tabs */}
            <div className="hidden md:flex items-center gap-1">
               {[
                 { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
                 { id: 'tasks', icon: ListTodo, label: 'Task Explorer' },
                 { id: 'activity', icon: Activity, label: 'Activity' },
                 { id: 'export', icon: FileSpreadsheet, label: 'Export' },
               ].map((tab) => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as TabView)}
                   className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                     ${activeTab === tab.id ? 'bg-slate-800 text-amber-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'}
                   `}
                 >
                   <tab.icon className="w-4 h-4" />
                   {tab.label}
                 </button>
               ))}
            </div>

            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 text-slate-400 hover:text-white transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-slate-900"></span>}
                </button>
                {notificationsOpen && (
                  <>
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setNotificationsOpen(false)}
                  ></div>
                  {/* Notifications Dropdown: Responsive positioning */}
                  <div className="fixed top-16 left-4 right-4 md:absolute md:top-auto md:right-0 md:left-auto md:w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 border-b border-slate-100 dark:border-slate-700 font-bold text-sm text-slate-900 dark:text-white flex justify-between items-center bg-slate-50 dark:bg-slate-700/30">
                       <div className="flex items-center gap-2">
                         <span>Notifications</span>
                         <span className="text-xs text-slate-400 font-normal px-1.5 py-0.5 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-600">{notifications.length} New</span>
                       </div>
                       <button 
                        onClick={() => setNotificationsOpen(false)}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full transition-colors"
                       >
                         <X className="w-4 h-4 text-slate-500" />
                       </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-500">No new alerts</div>
                      ) : (
                        notifications.map((n, i) => (
                          <div key={i} className="p-3 border-b border-slate-100 dark:border-slate-700/50 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                             <div className={`w-2 h-2 mt-1.5 shrink-0 rounded-full ${n.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                             <div>
                               <p className="text-sm text-slate-800 dark:text-slate-200 leading-snug">{n.message}</p>
                               <p className="text-xs text-slate-400 mt-1">{format(n.timestamp, 'MMM d, h:mm a')}</p>
                             </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  </>
                )}
              </div>

              <button onClick={toggleTheme} className="p-2 text-slate-400 hover:text-white transition-colors">
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
                <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-2">
                   <img src={userProfile?.photoURL} className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600" alt="Admin" />
                </button>
                <button 
                  onClick={() => setLogoutModalOpen(true)} 
                  className="text-slate-400 hover:text-red-400 transition-colors p-2" 
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* MOBILE TABS (Dropdown) */}
        <div className="md:hidden">
          <select 
            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-lg text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-brand-500"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as TabView)}
          >
            <option value="overview">Overview Dashboard</option>
            <option value="tasks">Task Explorer</option>
            <option value="activity">System Activity</option>
            <option value="export">Export</option>
          </select>
        </div>

        {/* --- TAB: OVERVIEW --- */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* Stats Cards */}
             <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard label="Total Students" value={globalStats.totalStudents} icon={Users} color="text-blue-500" />
                <StatsCard label="Success Rate" value={`${globalStats.completionRate}%`} icon={TrendingUp} color="text-green-500" />
                <StatsCard label="Total Tasks" value={globalStats.totalTasks} icon={CheckCircle2} color="text-amber-500" />
                <StatsCard label="System Overdue" value={globalStats.overdueTasks} icon={AlertTriangle} color="text-red-500" />
             </section>

             {/* Student Directory & Details Split View */}
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[650px]">
                {/* Left: Directory */}
                <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                   <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3 shrink-0">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          Students
                          <Button size="sm" variant="secondary" className="px-2 py-0.5 h-6 text-xs ml-2" onClick={() => setShowAddUserModal(true)}>
                            <UserPlus className="w-3 h-3 mr-1" /> Add
                          </Button>
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer hover:text-brand-500 relative group">
                           <Filter className="w-3 h-3" />
                           <select 
                             className="absolute inset-0 opacity-0 cursor-pointer"
                             value={sortOption}
                             onChange={(e) => setSortOption(e.target.value as SortOption)}
                           >
                             <option value="name">Name (A-Z)</option>
                             <option value="consistency">Most Consistent</option>
                             <option value="overdue">Most Overdue</option>
                             <option value="completion">Highest Rate</option>
                           </select>
                           Sort: <span className="capitalize text-slate-700 dark:text-slate-300 ml-1">{sortOption}</span>
                        </div>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <Input 
                          placeholder="Search name or email..." 
                          className="pl-9 py-2 text-sm"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                   </div>
                   <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                      {visibleStudents.map(student => (
                        <button
                          key={student.uid}
                          onClick={() => handleStudentSelect(student)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${selectedStudent?.uid === student.uid ? 'bg-brand-50 dark:bg-brand-900/20 ring-1 ring-brand-500' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                        >
                          <div className="relative">
                            <img src={student.photoURL} className="w-10 h-10 rounded-full bg-slate-200 object-cover" />
                            {allTasks.some(t => t.userId === student.uid && !t.completed && isPast(startOfDay(t.dueDate))) && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></div>
                            )}
                          </div>
                          <div className="min-w-0">
                             <p className="font-semibold text-sm truncate text-slate-900 dark:text-slate-200">{student.displayName}</p>
                             <div className="flex items-center gap-2 text-xs text-slate-500">
                               <span>{allTasks.filter(t => t.userId === student.uid).length} Tasks</span>
                             </div>
                          </div>
                        </button>
                      ))}
                      
                      {visibleStudents.length === 0 && <p className="text-center text-xs text-slate-400 mt-4">No students found.</p>}
                      
                      {/* Load More Button */}
                      {visibleStudents.length < sortedStudents.length && (
                        <button 
                          onClick={() => setVisibleStudentCount(prev => prev + 10)}
                          className="w-full py-2 text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded mt-2"
                        >
                          Load More ({sortedStudents.length - visibleStudents.length} remaining)
                        </button>
                      )}
                   </div>
                </div>
                
                {/* Right: Details (Existing Component Logic) */}
                <div ref={detailRef} className="lg:col-span-8 flex flex-col h-full overflow-hidden">
                   {selectedStudent ? (
                     <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Detail Header */}
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-start">
                           <div className="flex items-center gap-4 min-w-0">
                              <img src={selectedStudent.photoURL} className="w-16 h-16 rounded-full border-4 border-white dark:border-slate-700 shadow-md shrink-0" />
                              <div className="min-w-0">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white truncate">{selectedStudent.displayName}</h2>
                                <p className="text-slate-500 text-sm truncate">{selectedStudent.email}</p>
                              </div>
                           </div>
                           <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)}><XCircle className="w-5 h-5" /></Button>
                        </div>
                        {/* Graphs */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                           <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                              <h4 className="font-bold text-slate-900 dark:text-white mb-4">Activity Timeline</h4>
                              <ContributionGraph tasks={studentTasks} className="border-none p-0 shadow-none bg-transparent" />
                           </div>
                           
                           {/* Chart Section with Toggle */}
                           <div className="relative">
                             {/* Toggle: Fixed Visibility with Solid Background */}
                             <div className="absolute top-6 right-6 z-10 flex bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 p-1 rounded-lg shadow-sm">
                                <button 
                                  onClick={() => setChartRange('week')}
                                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${chartRange === 'week' ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                  Weekly
                                </button>
                                <button 
                                  onClick={() => setChartRange('month')}
                                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${chartRange === 'month' ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                  Monthly
                                </button>
                             </div>
                             <PerformanceLineChart 
                                tasks={studentTasks} 
                                label={`${selectedStudent.displayName}'s Trend`} 
                                range={chartRange}
                             />
                           </div>

                           {/* Recent Activity List */}
                           <div className="p-6">
                              <h4 className="font-bold text-slate-900 dark:text-white mb-4">Recent Tasks</h4>
                              <div className="space-y-2">
                                {studentTasks.slice(0, 5).map(t => (
                                  <div key={t.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                     <span className={`text-sm ${t.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>{t.title}</span>
                                     <span className="text-xs text-slate-400">{format(t.createdAt, 'MMM d')}</span>
                                  </div>
                                ))}
                                {studentTasks.length === 0 && <p className="text-sm text-slate-400 italic">No tasks yet.</p>}
                              </div>
                           </div>
                        </div>
                     </div>
                   ) : (
                     <div className="h-full bg-slate-50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400">
                        <UserIcon className="w-16 h-16 opacity-20 mb-4" />
                        <p>Select a student from the list</p>
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {/* --- TAB: TASKS EXPLORER --- */}
        {activeTab === 'tasks' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Global Task Explorer</h2>
                  <p className="text-slate-500 text-sm">Search across all {allTasks.length} tasks in the system.</p>
                </div>
                {/* Mobile Responsive Filters */}
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                   <div className="relative w-full sm:w-auto">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <Input 
                        placeholder="Search task title..." 
                        value={taskSearchQuery}
                        onChange={(e) => setTaskSearchQuery(e.target.value)}
                        className="pl-9 w-full sm:w-64"
                      />
                   </div>
                   <select 
                     className="w-full sm:w-auto bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white"
                     value={taskFilterStatus}
                     onChange={(e) => setTaskFilterStatus(e.target.value as any)}
                   >
                     <option value="all">All Status</option>
                     <option value="completed">Completed</option>
                     <option value="pending">Pending</option>
                     <option value="overdue">Overdue</option>
                   </select>
                </div>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                   <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-medium border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-6 py-3">Task Title</th>
                        <th className="px-6 py-3">Student</th>
                        <th className="px-6 py-3">Due Date</th>
                        <th className="px-6 py-3">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {paginatedTasks.map(task => {
                        const student = students.find(s => s.uid === task.userId);
                        return (
                          <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                             <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">{task.title}</td>
                             <td className="px-6 py-3 flex items-center gap-2">
                                <img src={student?.photoURL} className="w-5 h-5 rounded-full" />
                                <span className="text-slate-600 dark:text-slate-400">{student?.displayName || 'Unknown'}</span>
                             </td>
                             <td className="px-6 py-3 text-slate-500">{format(task.dueDate, 'MMM d, yyyy')}</td>
                             <td className="px-6 py-3">
                                {task.completed ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Completed</span>
                                ) : isPast(startOfDay(task.dueDate)) ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Overdue</span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">Pending</span>
                                )}
                             </td>
                          </tr>
                        );
                      })}
                   </tbody>
                </table>
                
                {filteredGlobalTasks.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No tasks found matching criteria.</div>
                ) : (
                  // Pagination Controls
                  <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                     <span className="text-xs text-slate-500">
                       Showing {Math.min(filteredGlobalTasks.length, (taskPage - 1) * tasksPerPage + 1)} - {Math.min(filteredGlobalTasks.length, taskPage * tasksPerPage)} of {filteredGlobalTasks.length} tasks
                     </span>
                     <div className="flex items-center gap-2">
                        <button
                          onClick={() => setTaskPage(prev => Math.max(1, prev - 1))}
                          disabled={taskPage === 1}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5 text-slate-500" />
                        </button>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                           Page {taskPage} of {totalTaskPages || 1}
                        </span>
                        <button
                          onClick={() => setTaskPage(prev => Math.min(totalTaskPages, prev + 1))}
                          disabled={taskPage === totalTaskPages || totalTaskPages === 0}
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                        >
                          <ChevronRight className="w-5 h-5 text-slate-500" />
                        </button>
                     </div>
                  </div>
                )}
             </div>
          </div>
        )}

        {/* --- TAB: ACTIVITY --- */}
        {activeTab === 'activity' && (
           <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">System Activity Feed</h2>
                <p className="text-slate-500 text-sm">Recent actions across the platform.</p>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                 {activityFeed.map((item, index) => (
                   <div key={`${item.task.id}-${index}`} className="p-4 flex gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="mt-1">
                        {item.task.completed ? (
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <ListTodo className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                         <p className="text-sm text-slate-900 dark:text-white">
                           <span className="font-semibold">{item.student?.displayName}</span> {item.task.completed ? 'completed' : 'created'} <span className="font-medium italic">"{item.task.title}"</span>
                         </p>
                         <p className="text-xs text-slate-500 mt-1">
                           {format(item.task.completedAt || item.task.createdAt, 'MMM d, yyyy • h:mm a')}
                         </p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        )}

        {/* --- TAB: EXPORT --- */}
        {activeTab === 'export' && (
           <div className="max-w-xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
                 <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Download className="w-8 h-8" />
                 </div>
                 <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Export Data</h2>
                 <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">
                   Download a comprehensive CSV report containing all student profiles, task counts, and performance metrics.
                 </p>
                 <Button onClick={handleExportUsers} className="w-full py-3 text-base shadow-xl shadow-brand-500/20">
                   Download Student Report (.CSV)
                 </Button>
              </div>
           </div>
        )}

      </main>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
              <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                 <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create New User</h3>
                 <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="p-6 space-y-4">
                 {/* Feedback Banners */}
                 {createUserError && (
                   <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm p-3 rounded-lg border border-red-100 dark:border-red-900/50 flex items-start gap-2">
                     <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                     {createUserError}
                   </div>
                 )}
                 {createUserSuccess && (
                   <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm p-3 rounded-lg border border-green-100 dark:border-green-900/50 flex items-center gap-2">
                     <CheckCircle2 className="w-4 h-4" />
                     {createUserSuccess}
                   </div>
                 )}

                 <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Display Name</label>
                      <Input value={newUserName} onChange={(e) => setNewUserName(e.target.value)} required placeholder="e.g. John Doe" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Email Address</label>
                      <Input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required placeholder="user@example.com" className="mt-1" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                      <div className="relative mt-1">
                        <Input 
                          type={showNewUserPassword ? "text" : "password"} 
                          value={newUserPassword} 
                          onChange={(e) => setNewUserPassword(e.target.value)} 
                          required 
                          placeholder="••••••••" 
                          className="pr-10" 
                          minLength={6} 
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                          onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                        >
                          {showNewUserPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                      <div className="grid grid-cols-2 gap-3 mt-1">
                        <button
                          type="button" 
                          onClick={() => setNewUserRole('STUDENT')}
                          className={`p-3 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${newUserRole === 'STUDENT' ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-500 text-brand-700 dark:text-brand-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                        >
                           <UserIcon className="w-4 h-4" /> Student
                        </button>
                        <button
                          type="button" 
                          onClick={() => setNewUserRole('ADMIN')}
                          className={`p-3 rounded-lg border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${newUserRole === 'ADMIN' ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-500 text-amber-700 dark:text-amber-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                        >
                           <ShieldCheck className="w-4 h-4" /> Admin
                        </button>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <Button type="submit" isLoading={isCreatingUser} className="w-full">Create Account</Button>
                    </div>
                 </form>
              </div>
           </div>
        </div>
      )}

      {/* Logout Confirmation */}
      <ConfirmationModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={logout}
        title="Sign Out"
        message="Are you sure you want to log out of your account?"
        confirmLabel="Log Out"
      />

      {/* Profile Modal */}
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-slate-500 text-xs">
            &copy; {new Date().getFullYear()} Study Tracker. Powered by Dream Stars <span className="text-amber-500 font-bold">VIP</span>
          </p>
        </div>
      </footer>
    </div>
  );
}