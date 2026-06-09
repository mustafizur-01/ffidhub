import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import SupportSection from "@/components/SupportSection";
import Index from "./pages/Index";
import SellPage from "./pages/SellPage";
import ListingDetails from "./pages/ListingDetails";
import ProfilePage from "./pages/ProfilePage";
import SellerDashboard from "./pages/SellerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ResetPassword from "./pages/ResetPassword";
import AddMoneyPage from "./pages/AddMoneyPage";
import PurchaseHistory from "./pages/PurchaseHistory";
import TournamentsPage from "./pages/TournamentsPage";
import MiniGamesPage from "./pages/MiniGamesPage";
import FavoritesPage from "./pages/FavoritesPage";
import WithdrawPage from "./pages/WithdrawPage";
import SellerProfilePage from "./pages/SellerProfilePage";
import EscrowPage from "./pages/EscrowPage";
import AuctionsPage from "./pages/AuctionsPage";
import VipPage from "./pages/VipPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/sell" element={<SellPage />} />
            <Route path="/listing/:id" element={<ListingDetails />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/my-listings" element={<SellerDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/add-money" element={<AddMoneyPage />} />
            <Route path="/my-purchases" element={<PurchaseHistory />} />
            <Route path="/tournaments" element={<TournamentsPage />} />
            <Route path="/games" element={<MiniGamesPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/withdraw" element={<WithdrawPage />} />
            <Route path="/seller/:id" element={<SellerProfilePage />} />
            <Route path="/escrow" element={<EscrowPage />} />
            <Route path="/auctions" element={<AuctionsPage />} />
            <Route path="/vip" element={<VipPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <SupportSection />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
