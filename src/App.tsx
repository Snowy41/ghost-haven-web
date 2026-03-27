import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import DiscordLinkPrompt from "@/components/DiscordLinkPrompt";
import PageSkeleton from "@/components/PageSkeleton";

// Lazy-loaded routes for code splitting
const Index = lazy(() => import("./pages/Index"));
const Download = lazy(() => import("./pages/Download"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Profile = lazy(() => import("./pages/Profile"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const BetaReports = lazy(() => import("./pages/BetaReports"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <DiscordLinkPrompt />
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/download" element={<Download />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/user/:username" element={<UserProfile />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/beta-reports" element={<BetaReports />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
