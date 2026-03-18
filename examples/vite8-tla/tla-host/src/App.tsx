import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Link } from 'react-router';
import { Sun, Moon } from 'lucide-react';
import { create } from 'zustand';

const queryClient = new QueryClient();

const useThemeStore = create<{ dark: boolean; toggle: () => void }>((set) => ({
  dark: false,
  toggle: () => set((s) => ({ dark: !s.dark })),
}));

const Home = () => {
  const { dark, toggle } = useThemeStore();
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1 data-testid="app-title">TLA Deadlock Repro</h1>
      <p data-testid="app-status">React mounted successfully</p>
      <button onClick={toggle}>{dark ? <Moon size={16} /> : <Sun size={16} />} Theme</button>
      <button onClick={() => setCount((c) => c + 1)}>Count: {count}</button>
      <Link to="/about">About</Link>
    </div>
  );
};

const About = () => <p>About page</p>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
