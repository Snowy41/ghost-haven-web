import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import DiscordLinkPrompt from "@/components/DiscordLinkPrompt";
import Index from "./pages/Index";
import Download from "./pages/Download";
import Marketplace from "./pages/Marketplace";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Dashboard from "./pages/Dashboard";
import BetaReports from "./pages/BetaReports";
import Changelog from "./pages/Changelog";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DiscordLinkPrompt />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/download" element={<Download />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/user/:username" element={<UserProfile />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/beta-reports" element={<BetaReports />} />
            <Route path="/changelog" element={<Changelog />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
