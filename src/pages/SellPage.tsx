import { useState } from 'react';
import Header from '@/components/Header';
import SellForm from '@/components/SellForm';
import AuthModal from '@/components/AuthModal';
import { Button } from '@/components/ui/button';
import { Flame, LogIn, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const SellPage = () => {
  const { user, loading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-10">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Flame className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
              Sell Your <span className="text-gradient">FF MAX ID</span>
            </h1>
            <p className="text-muted-foreground">
              List your account with all details for buyers to see
            </p>
          </div>

          {/* Form Card or Login Prompt */}
          {loading ? (
            <div className="card-gaming p-8 text-center">
              <div className="animate-pulse space-y-4">
                <div className="h-10 bg-muted rounded w-3/4 mx-auto" />
                <div className="h-10 bg-muted rounded w-1/2 mx-auto" />
              </div>
            </div>
          ) : user ? (
            <div className="card-gaming p-6 md:p-8">
              <SellForm />
            </div>
          ) : (
            <div className="card-gaming p-8 text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                <Lock className="h-10 w-10 text-muted-foreground" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold mb-2">
                  Login Required
                </h2>
                <p className="text-muted-foreground">
                  You need to login or create an account to sell your FF MAX ID
                </p>
              </div>
              <Button
                variant="gaming"
                size="xl"
                onClick={() => setAuthModalOpen(true)}
              >
                <LogIn className="h-5 w-5" />
                Login to Continue
              </Button>
            </div>
          )}
        </div>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab="login"
      />
    </div>
  );
};

export default SellPage;
