import { useTheme } from '../context/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {theme === 'dark' ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M12 3a1 1 0 011 1v1a1 1 0 11-2 0V4a1 1 0 011-1zm0 15a5 5 0 100-10 5 5 0 000 10zm9-6a1 1 0 010 2h-1a1 1 0 110-2h1zM4 12a1 1 0 010 2H3a1 1 0 110-2h1zm14.36-6.36a1 1 0 011.42 1.42l-.71.7a1 1 0 11-1.41-1.41l.7-.71zM6.34 17.66a1 1 0 011.41 1.41l-.7.71a1 1 0 11-1.42-1.42l.71-.7zM18.36 18.36a1 1 0 01-1.42 0l-.7-.71a1 1 0 111.41-1.41l.71.7a1 1 0 010 1.42zM5.64 5.64a1 1 0 010 1.42l-.7.7A1 1 0 113.5 6.35l.71-.71a1 1 0 011.42 0zM12 20a1 1 0 011 1v-1a1 1 0 10-2 0v1a1 1 0 011-1z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M20.354 15.354A9 9 0 018.646 3.646a9.003 9.003 0 1011.708 11.708z" />
        </svg>
      )}
    </button>
  );
}
