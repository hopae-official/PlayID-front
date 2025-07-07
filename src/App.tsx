import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./providers/ThemeProvider";
import MainLayout from "./layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Bracket from "./pages/Bracket/index";
import BracketCreate from "./pages/Bracket/BracketCreate";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Auth from "./components/auth/Auth";
import CustomSignIn from "./components/auth/CustomSignIn";
import BracketEdit from "./pages/Bracket/BracketEdit";
import CustomSignUp from "./components/auth/CustomSignUp";

const App = () => {
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <Router>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/bracket" element={<Bracket />} />
              <Route path="/result" element={<Bracket />} />
            </Route>
            <Route path="/bracket/create" element={<BracketCreate />} />
            <Route
              path="/stage/:id/bracket/create"
              element={<BracketCreate />}
            />
            <Route path="/bracket/edit/:id" element={<BracketEdit />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/sign-in/*" element={<CustomSignIn />} />
            <Route path="/sign-up" element={<CustomSignUp />} />
          </Routes>
        </Router>
        <Toaster richColors position="top-center" />
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
