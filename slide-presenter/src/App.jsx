import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { LocaleProvider } from './contexts/LocaleContext.jsx';
import Home from './pages/Home.jsx';
import Editor from './pages/Editor.jsx';
import LivePresenter from './pages/LivePresenter.jsx';
import RemoteControl from './pages/RemoteControl.jsx';
import StaticPresenter from './pages/StaticPresenter.jsx';

function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/editor/:id" element={<Editor />} />
            <Route path="/present/:id" element={<LivePresenter />} />
            <Route path="/slides" element={<StaticPresenter />} />
            <Route path="/remote" element={<RemoteControl />} />
            <Route path="/remote/:code" element={<RemoteControl />} />
          </Routes>
        </BrowserRouter>
      </LocaleProvider>
    </ThemeProvider>
  );
}

export default App;
