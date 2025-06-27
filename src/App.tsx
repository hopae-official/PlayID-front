import { SignIn, SignUp } from "@clerk/clerk-react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./providers/ThemeProvider";
import MainLayout from "./layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Bracket from "./pages/Bracket/index";
import BracketCreate from "./pages/Bracket/BracketCreate";
import { Toaster } from "@/components/ui/sonner";
import Result from "./pages/Result";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/bracket" element={<Bracket />} />
            <Route path="/result" element={<Result />} />
          </Route>
          <Route path="/bracket/create" element={<BracketCreate />} />
          <Route path="/bracket/create/:id" element={<BracketCreate />} />
          <Route
            path="/sign-in"
            element={<SignIn path="/sign-in" signUpUrl="/sign-up" />}
          />
          <Route
            path="/sign-up"
            element={<SignUp path="/sign-up" signInUrl="/sign-in" />}
          />
        </Routes>
      </Router>
      <Toaster richColors position="top-center" />
    </ThemeProvider>
  );
}

export default App;
