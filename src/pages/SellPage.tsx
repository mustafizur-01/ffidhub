import Header from '@/components/Header';
import SellForm from '@/components/SellForm';
import { Flame } from 'lucide-react';

const SellPage = () => {
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

          {/* Form Card */}
          <div className="card-gaming p-6 md:p-8">
            <SellForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellPage;
